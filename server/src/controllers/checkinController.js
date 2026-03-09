import { Appointment } from '../models/Appointment.js'
import { Checkin } from '../models/Checkin.js'
import { Patient } from '../models/Patient.js'
import { QueueToken } from '../models/QueueToken.js'
import { createAuditLog } from '../services/auditService.js'
import { findBestDoctor, logAssignment } from '../services/assignmentService.js'
import { notifyDoctorAssignment } from '../services/notificationService.js'
import { recalculateDoctorQueue } from '../services/queueService.js'
import { emitQueueUpdate } from '../services/socketService.js'
import { generateCode } from '../utils/code.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'

async function getNextTokenSequence(departmentId) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const count = await QueueToken.countDocuments({
    departmentId,
    createdAt: { $gte: start, $lt: end },
  })

  return count + 1
}

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
  } = req.body

  const appointment = appointmentId ? await Appointment.findById(appointmentId) : null
  const patientId = bodyPatientId || appointment?.patientId?.toString() || req.user?.linkedPatientId || null

  if (!patientId || !departmentId) {
    throw new ApiError(400, 'patientId and departmentId are required')
  }

  const patient = await Patient.findById(patientId)
  if (!patient) {
    throw new ApiError(404, 'Patient not found')
  }

  const specialization = appointment?.specialization || req.body.specialization || 'General'

  const suggestedDoctor = await findBestDoctor({
    departmentId,
    specialization,
    preferredDoctorId: doctorId || appointment?.doctorId || null,
  })

  // Resolve final specialization: use doctor's specialization as last resort
  const resolvedSpecialization =
    specialization !== 'General' ? specialization : suggestedDoctor?.doctor?.specialization || 'General'

  // --- Create the Checkin record FIRST ---
  const checkin = await Checkin.create({
    checkinNumber: generateCode('CHK'),
    patientId,
    appointmentId: appointment?._id || null,
    doctorId: suggestedDoctor?.doctor?._id || doctorId || appointment?.doctorId || null,
    departmentId,
    checkinMethod: checkinMethod || 'reception',
    isWalkIn: Boolean(isWalkIn),
    urgencyLevel,
    notes,
    handledBy: req.user?.sub || null,
  })

  // --- Now create the QueueToken using checkin._id ---
  const tokenSequence = await getNextTokenSequence(departmentId)
  const deptPrefix = departmentId.toString().slice(-3).toUpperCase()

  const queueToken = await QueueToken.create({
    tokenNumber: `${urgencyLevel === 'urgent' ? 'U' : 'A'}-${deptPrefix}-${String(tokenSequence).padStart(3, '0')}`,
    tokenSequence,
    patientId,
    appointmentId: appointment?._id || null,
    checkinId: checkin._id,
    assignedDoctorId: suggestedDoctor?.doctor?._id || doctorId || appointment?.doctorId || null,
    departmentId,
    specialization: resolvedSpecialization,
    queueType: isWalkIn ? 'walk_in' : 'scheduled',
    priorityLevel: urgencyLevel,
    queueStatus: suggestedDoctor?.doctor ? 'assigned' : 'waiting',
  })

  checkin.status = 'queued'
  await checkin.save()

  if (appointment) {
    appointment.status = 'checked_in'
    await appointment.save()
  }

  if (suggestedDoctor?.doctor) {
    await logAssignment({
      queueTokenId: queueToken._id,
      patientId,
      appointmentId: appointment?._id || null,
      departmentId,
      specialization: queueToken.specialization,
      assignedDoctorId: suggestedDoctor.doctor._id,
      assignedByType: req.user?.role || 'system',
      assignedBy: req.user?.sub || null,
      decisionReason:
        doctorId || appointment?.doctorId ? 'preferred doctor respected' : 'shortest predicted wait',
      estimatedWaitAfter: suggestedDoctor.stats.estimatedWaitMinutes,
      assignmentType: 'initial',
    })
  }

  if (queueToken.assignedDoctorId) {
    await recalculateDoctorQueue(queueToken.assignedDoctorId)
  }

  await createAuditLog({
    req,
    actorId: req.user?.sub || null,
    actorRole: req.user?.role || 'system',
    action: 'checkin.created',
    entityType: 'Checkin',
    entityId: checkin._id,
    metadata: { patientId, queueTokenId: queueToken._id, urgencyLevel },
  })

  emitQueueUpdate(req, {
    departmentId,
    doctorId: queueToken.assignedDoctorId,
    patientId,
  })

  // Send doctor assignment notification if a doctor was assigned (fire and forget)
  if (queueToken.assignedDoctorId) {
    try {
      await notifyDoctorAssignment({ queueToken, patient, doctor: suggestedDoctor?.doctor })
    } catch (notifyError) {
      console.error('[Notification] Failed to send doctor assignment notification at checkin:', notifyError.message)
    }
  }

  return sendSuccess(res, 'Patient checked in successfully', { checkin, queueToken }, 201)
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
