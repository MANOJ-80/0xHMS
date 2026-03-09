import { describe, it, expect, beforeAll } from 'vitest'
import { Notification } from '../models/Notification.js'
import { Prescription } from '../models/Prescription.js'
import { api, seedDepartment, seedDoctor, seedPatient, seedReceptionist, tokenFor } from './helpers.js'

/**
 * Full end-to-end workflow test:
 *   Appointment → Check-in → Queue called → Consultation start → Consultation complete → Prescription
 *
 * Verifies that notifications fire at each stage.
 */
describe('Full patient workflow (E2E)', () => {
  let receptionistToken, doctorToken
  let patient, department, doctorData

  // IDs collected as we progress through the workflow
  let appointmentId, queueTokenId, consultationId

  beforeAll(async () => {
    department = await seedDepartment({ code: `E2E-${Date.now()}` })
    patient = await seedPatient({ phone: '9876543210' })
    doctorData = await seedDoctor(department._id, { specialization: 'General Medicine' })
    const receptionist = await seedReceptionist()
    receptionistToken = tokenFor(receptionist)
    doctorToken = tokenFor(doctorData.user, { linkedDoctorId: doctorData.doctor._id.toString() })
  })

  // ── Step 1: Create appointment ─────────────────────────────────────────

  it('Step 1 — create appointment (triggers confirmation notification)', async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    const slotEnd = new Date(tomorrow)
    slotEnd.setMinutes(slotEnd.getMinutes() + 15)

    const notifBefore = await Notification.countDocuments({ type: 'appointment_confirmation' })

    const res = await api()
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        patientId: patient._id.toString(),
        doctorId: doctorData.doctor._id.toString(),
        departmentId: department._id.toString(),
        specialization: 'General Medicine',
        appointmentDate: tomorrow.toISOString(),
        slotStart: tomorrow.toISOString(),
        slotEnd: slotEnd.toISOString(),
      })

    expect(res.status).toBe(201)
    expect(res.body.data.appointment).toBeDefined()
    appointmentId = res.body.data.appointment._id

    const notifAfter = await Notification.countDocuments({ type: 'appointment_confirmation' })
    expect(notifAfter).toBe(notifBefore + 1)
  })

  // ── Step 2: Check in patient ───────────────────────────────────────────

  it('Step 2 — check in patient (triggers doctor assignment notification)', async () => {
    const notifBefore = await Notification.countDocuments({ type: 'doctor_assignment' })

    const res = await api()
      .post('/api/v1/checkins')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        appointmentId,
        departmentId: department._id.toString(),
      })

    expect(res.status).toBe(201)
    expect(res.body.data.checkin).toBeDefined()
    expect(res.body.data.queueToken).toBeDefined()
    queueTokenId = res.body.data.queueToken._id

    // A doctor should have been auto-assigned
    expect(res.body.data.queueToken.assignedDoctorId).toBeTruthy()

    const notifAfter = await Notification.countDocuments({ type: 'doctor_assignment' })
    expect(notifAfter).toBe(notifBefore + 1)
  })

  // ── Step 3: Mark queue token as called ─────────────────────────────────

  it('Step 3 — mark queue token called (triggers queue-next notification)', async () => {
    const notifBefore = await Notification.countDocuments({ type: 'queue_next' })

    const res = await api()
      .patch(`/api/v1/queue/tokens/${queueTokenId}/call`)
      .set('Authorization', `Bearer ${receptionistToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.queueToken.queueStatus).toBe('called')

    const notifAfter = await Notification.countDocuments({ type: 'queue_next' })
    expect(notifAfter).toBe(notifBefore + 1)
  })

  // ── Step 4: Start consultation ─────────────────────────────────────────

  it('Step 4 — start consultation', async () => {
    const res = await api()
      .post('/api/v1/consultations/start')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ queueTokenId })

    expect(res.status).toBe(201)
    expect(res.body.data.consultation).toBeDefined()
    consultationId = res.body.data.consultation._id
  })

  // ── Step 5: Complete consultation ──────────────────────────────────────

  it('Step 5 — complete consultation (returns prescriptionPending flag)', async () => {
    const res = await api()
      .patch(`/api/v1/consultations/${consultationId}/complete`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ consultationNotes: 'Patient has URI, prescribing antibiotics' })

    expect(res.status).toBe(200)
    expect(res.body.data.consultation.status).toBe('completed')
    expect(res.body.data.prescriptionPending).toBe(true)
    expect(res.body.data.prescription).toBeNull()
  })

  // ── Step 6: Create prescription ────────────────────────────────────────

  it('Step 6 — create prescription (triggers prescription-ready notification)', async () => {
    const notifBefore = await Notification.countDocuments({ type: 'prescription_ready' })

    const res = await api()
      .post('/api/v1/prescriptions')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        consultationId,
        diagnosis: 'Upper respiratory infection',
        medicines: [
          {
            medicineName: 'Amoxicillin',
            dosage: '500mg',
            frequency: '3 times daily',
            duration: '7 days',
            route: 'oral',
            instructions: 'Take after meals',
          },
          {
            medicineName: 'Paracetamol',
            dosage: '650mg',
            frequency: 'As needed (max 4/day)',
            duration: '5 days',
            route: 'oral',
            instructions: 'Take for fever above 100°F',
          },
        ],
        treatmentNotes: 'Rest and hydration advised. Avoid cold beverages.',
        followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        followUpInstructions: 'Return if symptoms persist after 5 days',
      })

    expect(res.status).toBe(201)
    const rx = res.body.data.prescription
    expect(rx.medicines).toHaveLength(2)
    expect(rx.diagnosis).toBe('Upper respiratory infection')

    const notifAfter = await Notification.countDocuments({ type: 'prescription_ready' })
    expect(notifAfter).toBe(notifBefore + 1)
  })

  // ── Step 7: Verify patient can view prescription ───────────────────────

  it('Step 7 — verify prescription appears in patient history', async () => {
    const res = await api()
      .get(`/api/v1/prescriptions/patient/${patient._id}`)
      .set('Authorization', `Bearer ${doctorToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.prescriptions.length).toBeGreaterThanOrEqual(1)

    const rx = res.body.data.prescriptions[0]
    expect(rx.diagnosis).toBe('Upper respiratory infection')
  })

  // ── Step 8: Verify notification history ────────────────────────────────

  it('Step 8 — verify all notifications were recorded for this patient', async () => {
    const notifications = await Notification.find({ patientId: patient._id }).sort({ createdAt: 1 })

    // We expect at minimum: appointment_confirmation, doctor_assignment, queue_next, prescription_ready
    const types = notifications.map((n) => n.type)
    expect(types).toContain('appointment_confirmation')
    expect(types).toContain('doctor_assignment')
    expect(types).toContain('queue_next')
    expect(types).toContain('prescription_ready')

    // All should be sent (mock providers always succeed)
    for (const n of notifications) {
      expect(n.status).toBe('sent')
    }
  })

  // ── Negative: mark as missed ───────────────────────────────────────────

  it('Bonus — mark a different token as missed triggers missed notification', async () => {
    // Create a separate check-in to produce a new queue token
    const res1 = await api()
      .post('/api/v1/checkins')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        patientId: patient._id.toString(),
        departmentId: department._id.toString(),
        isWalkIn: true,
        specialization: 'General Medicine',
      })

    expect(res1.status).toBe(201)
    const missQueueTokenId = res1.body.data.queueToken._id

    const notifBefore = await Notification.countDocuments({ type: 'missed_appointment' })

    const res2 = await api()
      .patch(`/api/v1/queue/tokens/${missQueueTokenId}/miss`)
      .set('Authorization', `Bearer ${receptionistToken}`)

    expect(res2.status).toBe(200)
    expect(res2.body.data.queueToken.queueStatus).toBe('missed')

    const notifAfter = await Notification.countDocuments({ type: 'missed_appointment' })
    expect(notifAfter).toBe(notifBefore + 1)
  })
})
