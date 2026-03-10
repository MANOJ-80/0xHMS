import { QueueToken } from '../models/QueueToken.js'
import { Checkin } from '../models/Checkin.js'
import { Patient } from '../models/Patient.js'
import { Doctor } from '../models/Doctor.js'
import { createAuditLog } from '../services/auditService.js'
import { assignQueueTokenToDoctor, findBestDoctor } from '../services/assignmentService.js'
import { notifyQueueNext, notifyMissedAppointment, notifyDoctorAssignment } from '../services/notificationService.js'
import { recalculateDoctorQueue } from '../services/queueService.js'
import { emitQueueUpdate } from '../services/socketService.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'

export const listQueueTokens = asyncHandler(async (req, res) => {
  const { departmentId, doctorId, queueStatus, patientId } = req.query
  const query = { isActive: true }

  if (departmentId) query.departmentId = departmentId
  if (doctorId) query.assignedDoctorId = doctorId
  if (queueStatus) query.queueStatus = queueStatus
  if (patientId) query.patientId = patientId

  const queueTokens = await QueueToken.find(query)
    .populate('patientId', 'fullName patientCode phone')
    .populate('assignedDoctorId', 'fullName consultationRoom')
    .sort({ priorityLevel: -1, createdAt: 1 })
    .limit(200)

  return sendSuccess(res, 'Queue tokens fetched successfully', { queueTokens })
})

export const assignQueueToken = asyncHandler(async (req, res) => {
  const { assignedDoctorId, reason } = req.body

  if (!assignedDoctorId) {
    throw new ApiError(400, 'assignedDoctorId is required')
  }

  const queueToken = await assignQueueTokenToDoctor({
    queueTokenId: req.params.id,
    doctorId: assignedDoctorId,
    assignedByType: req.user?.role || 'system',
    assignedBy: req.user?.sub || null,
    decisionReason: reason || 'manual assignment',
  })

  if (!queueToken) {
    throw new ApiError(404, 'Queue token not found')
  }

  await createAuditLog({
    req,
    actorId: req.user?.sub || null,
    actorRole: req.user?.role || 'system',
    action: 'queue.assigned',
    entityType: 'QueueToken',
    entityId: queueToken._id,
    metadata: { assignedDoctorId },
  })

  emitQueueUpdate(req, {
    departmentId: queueToken.departmentId,
    doctorId: queueToken.assignedDoctorId,
    patientId: queueToken.patientId,
  })

  // Send doctor assignment notification (fire and forget)
  try {
    const patient = await Patient.findById(queueToken.patientId)
    const doctor = await Doctor.findById(queueToken.assignedDoctorId)
    if (patient) {
      await notifyDoctorAssignment({ queueToken, patient, doctor })
    }
  } catch (notifyError) {
    console.error('[Notification] Failed to send doctor assignment notification:', notifyError.message)
  }

  return sendSuccess(res, 'Queue token assigned successfully', { queueToken })
})

export const autoAssignQueueToken = asyncHandler(async (req, res) => {
  const { queueTokenId } = req.body

  if (!queueTokenId) {
    throw new ApiError(400, 'queueTokenId is required')
  }

  const queueToken = await QueueToken.findById(queueTokenId)
  if (!queueToken) {
    throw new ApiError(404, 'Queue token not found')
  }

  const bestDoctor = await findBestDoctor({
    departmentId: queueToken.departmentId,
    specialization: queueToken.specialization,
  })

  if (!bestDoctor?.doctor) {
    throw new ApiError(404, 'No eligible doctor found for auto assignment')
  }

  const updated = await assignQueueTokenToDoctor({
    queueTokenId: queueToken._id,
    doctorId: bestDoctor.doctor._id,
    assignedByType: 'system',
    assignedBy: req.user?.sub || null,
    decisionReason: 'shortest predicted wait',
    assignmentType: 'initial',
  })

  emitQueueUpdate(req, {
    departmentId: updated.departmentId,
    doctorId: updated.assignedDoctorId,
    patientId: updated.patientId,
  })

  // Send doctor assignment notification (fire and forget)
  try {
    const patient = await Patient.findById(updated.patientId)
    if (patient) {
      await notifyDoctorAssignment({ queueToken: updated, patient, doctor: bestDoctor.doctor })
    }
  } catch (notifyError) {
    console.error('[Notification] Failed to send auto-assignment notification:', notifyError.message)
  }

  return sendSuccess(res, 'Queue token auto-assigned successfully', { queueToken: updated })
})

export const markQueueTokenCalled = asyncHandler(async (req, res) => {
  const queueToken = await QueueToken.findById(req.params.id)

  if (!queueToken) {
    throw new ApiError(404, 'Queue token not found')
  }

  if (['completed', 'missed', 'in_consultation'].includes(queueToken.queueStatus)) {
    throw new ApiError(400, `Cannot call token in status: ${queueToken.queueStatus}`)
  }

  queueToken.queueStatus = 'called'
  queueToken.actualCalledAt = new Date()
  await queueToken.save()

  emitQueueUpdate(req, {
    departmentId: queueToken.departmentId,
    doctorId: queueToken.assignedDoctorId,
    patientId: queueToken.patientId,
  })

  // Send "you are next" notification (fire and forget)
  try {
    const patient = await Patient.findById(queueToken.patientId)
    const doctor = queueToken.assignedDoctorId ? await Doctor.findById(queueToken.assignedDoctorId) : null
    if (patient) {
      await notifyQueueNext({ queueToken, patient, doctor })
    }
  } catch (notifyError) {
    console.error('[Notification] Failed to send queue-next notification:', notifyError.message)
  }

  return sendSuccess(res, 'Queue token marked as called', { queueToken })
})

export const markQueueTokenMissed = asyncHandler(async (req, res) => {
  const queueToken = await QueueToken.findById(req.params.id)

  if (!queueToken) {
    throw new ApiError(404, 'Queue token not found')
  }

  if (['completed', 'missed'].includes(queueToken.queueStatus)) {
    throw new ApiError(400, `Cannot mark token as missed in status: ${queueToken.queueStatus}`)
  }

  queueToken.queueStatus = 'missed'
  queueToken.isActive = false
  await queueToken.save()

  // Mark the check-in as expired so the patient can check in again
  if (queueToken.checkinId) {
    await Checkin.findByIdAndUpdate(queueToken.checkinId, { status: 'expired' })
  }

  if (queueToken.assignedDoctorId) {
    await recalculateDoctorQueue(queueToken.assignedDoctorId)
  }

  emitQueueUpdate(req, {
    departmentId: queueToken.departmentId,
    doctorId: queueToken.assignedDoctorId,
    patientId: queueToken.patientId,
  })

  // Send missed appointment notification (fire and forget)
  try {
    const patient = await Patient.findById(queueToken.patientId)
    const doctor = queueToken.assignedDoctorId ? await Doctor.findById(queueToken.assignedDoctorId) : null
    if (patient) {
      await notifyMissedAppointment({ queueToken, patient, doctor })
    }
  } catch (notifyError) {
    console.error('[Notification] Failed to send missed appointment notification:', notifyError.message)
  }

  return sendSuccess(res, 'Queue token marked as missed', { queueToken })
})

export const updateQueuePriority = asyncHandler(async (req, res) => {
  const { priorityLevel } = req.body

  if (!priorityLevel || !['normal', 'urgent'].includes(priorityLevel)) {
    throw new ApiError(400, 'priorityLevel must be "normal" or "urgent"')
  }

  const queueToken = await QueueToken.findByIdAndUpdate(
    req.params.id,
    { priorityLevel },
    { new: true },
  )

  if (!queueToken) {
    throw new ApiError(404, 'Queue token not found')
  }

  if (queueToken.assignedDoctorId) {
    await recalculateDoctorQueue(queueToken.assignedDoctorId)
  }

  emitQueueUpdate(req, {
    departmentId: queueToken.departmentId,
    doctorId: queueToken.assignedDoctorId,
    patientId: queueToken.patientId,
  })

  return sendSuccess(res, 'Queue priority updated successfully', { queueToken })
})

export const getQueueBoard = asyncHandler(async (req, res) => {
  const { departmentId, doctorId } = req.query
  const query = {
    queueStatus: { $in: ['waiting', 'assigned', 'called', 'in_consultation'] },
    isActive: true,
  }

  if (departmentId) query.departmentId = departmentId
  if (doctorId) query.assignedDoctorId = doctorId

  const queue = await QueueToken.find(query)
    .populate('assignedDoctorId', 'fullName consultationRoom specialization')
    .populate('patientId', 'fullName patientCode')
    .sort({ priorityLevel: -1, createdAt: 1 })
    .limit(100)

  return sendSuccess(res, 'Queue board fetched successfully', { queue })
})
