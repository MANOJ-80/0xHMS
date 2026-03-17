import { describe, it, expect, beforeAll } from 'vitest'
import { Checkin } from '../models/Checkin.js'
import { Consultation } from '../models/Consultation.js'
import { Notification } from '../models/Notification.js'
import { QueueToken } from '../models/QueueToken.js'
import { generateCode } from '../utils/code.js'
import { api, seedAdmin, seedDepartment, seedDoctor, seedPatient, tokenFor } from './helpers.js'

describe('Prescription API', () => {
  let adminToken, doctorToken
  let patient, department, doctorData, consultation

  beforeAll(async () => {
    department = await seedDepartment({ code: `RX-${Date.now()}` })
    const admin = await seedAdmin()
    adminToken = tokenFor(admin)
    patient = await seedPatient()
    doctorData = await seedDoctor(department._id, { specialization: 'General Medicine' })
    doctorToken = tokenFor(doctorData.user, { linkedDoctorId: doctorData.doctor._id.toString() })

    // Create a checkin (required by QueueToken)
    const checkin = await Checkin.create({
      checkinNumber: generateCode('CHK'),
      patientId: patient._id,
      departmentId: department._id,
      doctorId: doctorData.doctor._id,
      status: 'queued',
    })

    // Create a queue token and consultation so we can attach prescriptions
    const queueToken = await QueueToken.create({
      tokenNumber: `A-TST-${Date.now()}-001`,
      tokenSequence: 1,
      patientId: patient._id,
      checkinId: checkin._id,
      assignedDoctorId: doctorData.doctor._id,
      departmentId: department._id,
      specialization: 'General Medicine',
      queueType: 'scheduled',
      priorityLevel: 'normal',
      queueStatus: 'completed',
      isActive: false,
    })

    consultation = await Consultation.create({
      consultationNumber: generateCode('CON'),
      patientId: patient._id,
      doctorId: doctorData.doctor._id,
      queueTokenId: queueToken._id,
      departmentId: department._id,
      status: 'completed',
      completedAt: new Date(),
    })
  })

  // ── Create prescription ────────────────────────────────────────────────

  describe('POST /api/v1/prescriptions', () => {
    it('should create a prescription and trigger notification', async () => {
      const notifCountBefore = await Notification.countDocuments({ type: 'prescription_ready' })

      const res = await api()
        .post('/api/v1/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          consultationId: consultation._id.toString(),
          diagnosis: 'Upper respiratory infection',
          medicines: [
            {
              medicineName: 'Amoxicillin',
              dosage: '500mg',
              frequency: 'twice daily',
              duration: '7 days',
              reasonForChosen: 'Bacterial infection',
              route: 'oral',
              instructions: 'after meals',
            },
          ],
          treatmentNotes: 'Rest and hydration advised',
          followUpDate: '2026-03-16',
          followUpInstructions: 'Return if symptoms persist',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)

      const rx = res.body.data.prescription
      expect(rx.diagnosis).toBe('Upper respiratory infection')
      expect(rx.medicines).toHaveLength(1)
      expect(rx.medicines[0].medicineName).toBe('Amoxicillin')
      expect(rx.prescriptionNumber).toBeDefined()
      expect(rx.patientId).toBe(patient._id.toString())
      expect(rx.doctorId).toBe(doctorData.doctor._id.toString())
      expect(rx.consultationId).toBe(consultation._id.toString())

      // Verify prescription_ready notification was created
      const notifCountAfter = await Notification.countDocuments({ type: 'prescription_ready' })
      expect(notifCountAfter).toBe(notifCountBefore + 1)
    })

    it('should reject duplicate prescription for the same consultation', async () => {
      const res = await api()
        .post('/api/v1/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          consultationId: consultation._id.toString(),
          diagnosis: 'Duplicate',
          medicines: [{ medicineName: 'X', dosage: '1', frequency: '1', duration: '1', reasonForChosen: 'Test' }],
        })

      expect(res.status).toBe(409)
    })

    it('should reject when missing required fields', async () => {
      const res = await api()
        .post('/api/v1/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ consultationId: consultation._id.toString() })

      expect(res.status).toBe(400)
    })

    it('should reject incomplete medicine items', async () => {
      // Create a new checkin + queue token + consultation for this test
      const chk2 = await Checkin.create({
        checkinNumber: generateCode('CHK'),
        patientId: patient._id,
        departmentId: department._id,
        doctorId: doctorData.doctor._id,
        status: 'queued',
      })
      const qt2 = await QueueToken.create({
        tokenNumber: `A-TST-${Date.now()}-002`,
        tokenSequence: 2,
        patientId: patient._id,
        checkinId: chk2._id,
        assignedDoctorId: doctorData.doctor._id,
        departmentId: department._id,
        specialization: 'General Medicine',
        queueType: 'scheduled',
        priorityLevel: 'normal',
        queueStatus: 'completed',
        isActive: false,
      })
      const con2 = await Consultation.create({
        consultationNumber: generateCode('CON'),
        patientId: patient._id,
        doctorId: doctorData.doctor._id,
        queueTokenId: qt2._id,
        departmentId: department._id,
        status: 'completed',
      })

      const res = await api()
        .post('/api/v1/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          consultationId: con2._id.toString(),
          diagnosis: 'Test',
          medicines: [{ medicineName: 'X', reasonForChosen: 'Test' }], // missing dosage, frequency, duration
        })

      expect(res.status).toBe(400)
    })

    it('should reject non-doctor creating prescription', async () => {
      const res = await api()
        .post('/api/v1/prescriptions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          consultationId: consultation._id.toString(),
          diagnosis: 'Test',
          medicines: [{ medicineName: 'X', dosage: '1', frequency: '1', duration: '1', reasonForChosen: 'Test' }],
        })

      expect(res.status).toBe(403)
    })
  })

  // ── List prescriptions ─────────────────────────────────────────────────

  describe('GET /api/v1/prescriptions', () => {
    it('should list prescriptions', async () => {
      const res = await api()
        .get('/api/v1/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data.prescriptions)).toBe(true)
      expect(res.body.data.prescriptions.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ── Get single prescription ────────────────────────────────────────────

  describe('GET /api/v1/prescriptions/:id', () => {
    it('should fetch a single prescription with populated fields', async () => {
      const { Prescription } = await import('../models/Prescription.js')
      const rx = await Prescription.findOne({ consultationId: consultation._id })

      const res = await api()
        .get(`/api/v1/prescriptions/${rx._id}`)
        .set('Authorization', `Bearer ${doctorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data.prescription._id).toBe(rx._id.toString())
      // Populated patient
      expect(res.body.data.prescription.patientId.fullName).toBeDefined()
    })

    it('should return 404 for non-existent prescription', async () => {
      const res = await api()
        .get('/api/v1/prescriptions/6600000000000000000b0001')
        .set('Authorization', `Bearer ${doctorToken}`)

      expect(res.status).toBe(404)
    })
  })

  // ── Patient prescriptions ──────────────────────────────────────────────

  describe('GET /api/v1/prescriptions/patient/:patientId', () => {
    it('should return all prescriptions for a patient', async () => {
      const res = await api()
        .get(`/api/v1/prescriptions/patient/${patient._id}`)
        .set('Authorization', `Bearer ${doctorToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data.prescriptions)).toBe(true)
      expect(res.body.data.prescriptions.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ── Update prescription ────────────────────────────────────────────────

  describe('PATCH /api/v1/prescriptions/:id', () => {
    it('should update diagnosis and medicines', async () => {
      const { Prescription } = await import('../models/Prescription.js')
      const rx = await Prescription.findOne({ consultationId: consultation._id })

      const res = await api()
        .patch(`/api/v1/prescriptions/${rx._id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          diagnosis: 'Updated diagnosis — viral URI',
          treatmentNotes: 'Updated treatment notes',
        })

      expect(res.status).toBe(200)
      expect(res.body.data.prescription.diagnosis).toBe('Updated diagnosis — viral URI')
      expect(res.body.data.prescription.treatmentNotes).toBe('Updated treatment notes')
    })
  })
})
