import { Appointment } from '../models/Appointment.js'
import { Checkin } from '../models/Checkin.js'
import { Doctor } from '../models/Doctor.js'
import { Patient } from '../models/Patient.js'
import { QueueToken } from '../models/QueueToken.js'
import { SystemConfig } from '../models/SystemConfig.js'
import { createAuditLog } from '../services/auditService.js'
import { assignSpecificDoctor, logAssignment } from '../services/assignmentService.js'
import { notifyDoctorAssignment } from '../services/notificationService.js'
import { emitQueueUpdate } from '../services/socketService.js'
import { generateCode } from '../utils/code.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'

/**
 * Get the next token sequence number atomically using findOneAndUpdate.
 * This prevents race conditions where two concurrent check-ins could get the same sequence.
 */
async function getNextTokenSequence(departmentId) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dateKey = today.toISOString().slice(0, 10) // YYYY-MM-DD format
  const counterKey = `tokenSequence:${departmentId}:${dateKey}`

  // Atomically increment and return the new value
  const result = await SystemConfig.findOneAndUpdate(
    { key: counterKey },
    { 
      $inc: { value: 1 },
      $setOnInsert: { key: counterKey, description: `Token sequence counter for department ${departmentId} on ${dateKey}` }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  return result.value
}

/**
 * Check in a patient and assign them to a SPECIFIC doctor.
 * Doctor assignment is mandatory — the receptionist must explicitly choose the doctor.
 * This enforces the doctor-patient lock: only the assigned doctor can see/manage this patient.
 */
export const createCheckin = asyncHandler(async (req, res) => {
  const {
    appointmentId,
    patientId: bodyPatientId,
    departmentId,
    doctorId,
    checkinMethod,
    isWalkIn,
    urgencyLevel = 'normal',
    notes = '',
    reassignmentReason = '',
  } = req.body

  const appointment = appointmentId ? await Appointment.findById(appointmentId) : null
  const patientId = bodyPatientId || appointment?.patientId?.toString() || req.user?.linkedPatientId || null

  if (!patientId || !departmentId) {
    throw new ApiError(400, 'patientId and departmentId are required')
  }

  // BIZ-7: Validate that if appointmentId is provided, it belongs to the resolved patient
  // This prevents walk-in check-ins from corrupting another patient's appointment
  if (appointment && appointment.patientId.toString() !== patientId) {
    throw new ApiError(400, 'The provided appointmentId does not belong to this patient')
  }

  // Doctor assignment is now MANDATORY
  const resolvedDoctorId = doctorId || appointment?.doctorId || null
  if (!resolvedDoctorId) {
    throw new ApiError(400, 'doctorId is required — receptionist must assign a specific doctor')
  }

  const patient = await Patient.findById(patientId)
  if (!patient) {
    throw new ApiError(404, 'Patient not found')
  }

  // Prevent duplicate active check-ins for the same patient
  const existingActiveCheckin = await Checkin.findOne({
    patientId,
    status: { $in: ['checked_in', 'queued'] },
  })
  if (existingActiveCheckin) {
    throw new ApiError(409, 'Patient already has an active check-in')
  }

  // Validate the specified doctor is active and in a workable state
  const doctorResult = await assignSpecificDoctor(resolvedDoctorId)
  if (!doctorResult) {
    throw new ApiError(400, 'Selected doctor is not available. Choose a different doctor or wait until they are available.')
  }

  const specialization = appointment?.specialization || req.body.specialization || doctorResult.doctor.specialization || 'General'

  // --- Create the Checkin record ---
  const checkin = await Checkin.create({
    checkinNumber: generateCode('CHK'),
    patientId,
    appointmentId: appointment?._id || null,
    doctorId: doctorResult.doctor._id,
    departmentId,
    checkinMethod: checkinMethod || 'reception',
    isWalkIn: Boolean(isWalkIn),
    urgencyLevel,
    notes,
    handledBy: req.user?.sub || null,
  })

  // --- Create the QueueToken locked to this specific doctor ---
  const tokenSequence = await getNextTokenSequence(departmentId)
  const deptPrefix = departmentId.toString().slice(-3).toUpperCase()

  const queueToken = await QueueToken.create({
    tokenNumber: `${urgencyLevel === 'urgent' ? 'U' : 'A'}-${deptPrefix}-${String(tokenSequence).padStart(3, '0')}`,
    tokenSequence,
    patientId,
    appointmentId: appointment?._id || null,
    checkinId: checkin._id,
    assignedDoctorId: doctorResult.doctor._id,
    departmentId,
    specialization,
    queueType: isWalkIn ? 'walk_in' : 'scheduled',
    priorityLevel: urgencyLevel,
    queueStatus: 'assigned',
  })

  checkin.status = 'queued'
  await checkin.save()

  if (appointment) {
    appointment.status = 'checked_in'
    await appointment.save()
  }

  // Log the explicit doctor assignment
  // Note: logAssignment internally calls recalculateDoctorQueue, so no need to call it again
  await logAssignment({
    queueTokenId: queueToken._id,
    patientId,
    appointmentId: appointment?._id || null,
    departmentId,
    specialization: queueToken.specialization,
    assignedDoctorId: doctorResult.doctor._id,
    assignedByType: req.user?.role || 'receptionist',
    assignedBy: req.user?.sub || null,
    decisionReason: 'receptionist direct assignment',
    estimatedWaitAfter: doctorResult.stats.estimatedWaitMinutes,
    assignmentType: 'initial',
  })

  await createAuditLog({
    req,
    actorId: req.user?.sub || null,
    actorRole: req.user?.role || 'system',
    action: 'checkin.created',
    entityType: 'Checkin',
    entityId: checkin._id,
    metadata: { patientId, queueTokenId: queueToken._id, urgencyLevel, assignedDoctorId: doctorResult.doctor._id.toString() },
  })

  emitQueueUpdate(req, {
    departmentId,
    doctorId: doctorResult.doctor._id,
    patientId,
  })

  // --- Detect doctor reassignment ---
  // If the appointment had an originally requested doctor and the receptionist assigned a different one,
  // this is a reassignment. We need to notify the patient with context about the change.
  let isReassignment = false
  let originalDoctorName = null

  if (appointment && appointment.doctorId) {
    const originalDoctorIdStr = appointment.doctorId.toString()
    const resolvedDoctorIdStr = doctorResult.doctor._id.toString()

    if (originalDoctorIdStr !== resolvedDoctorIdStr) {
      isReassignment = true

      // Load the original doctor's name for the notification message
      const originalDoctor = await Doctor.findById(appointment.doctorId).select('fullName')
      originalDoctorName = originalDoctor?.fullName || 'your originally requested doctor'

      // Update the appointment record to track the reassignment
      appointment.reassignedDoctorId = doctorResult.doctor._id
      await appointment.save()
    }
  }

  // Send doctor assignment notification (fire and forget)
  // If reassigned, the SMS explains which doctor was originally requested and why the change was made.
  try {
    await notifyDoctorAssignment({
      queueToken,
      patient,
      doctor: doctorResult.doctor,
      isReassignment,
      originalDoctorName,
      reassignmentReason: isReassignment ? (reassignmentReason || null) : null,
    })
  } catch (notifyError) {
    console.error('[Notification] Failed to send doctor assignment notification at checkin:', notifyError.message)
  }

  return sendSuccess(res, 'Patient checked in and assigned to doctor successfully', { checkin, queueToken }, 201)
})

export const listCheckins = asyncHandler(async (req, res) => {
  const { departmentId, status } = req.query
  const query = {}

  if (departmentId) query.departmentId = departmentId
  if (status) query.status = status

  const checkins = await Checkin.find(query)
    .populate('patientId', 'fullName patientCode')
    .populate('doctorId', 'fullName')
    .sort({ createdAt: -1 })
    .limit(100)

  return sendSuccess(res, 'Check-ins fetched successfully', { checkins })
})
