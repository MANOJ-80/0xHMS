import { Consultation } from '../models/Consultation.js'
import { Appointment } from '../models/Appointment.js'
import { Doctor } from '../models/Doctor.js'
import { QueueToken } from '../models/QueueToken.js'
import { createAuditLog } from '../services/auditService.js'
import { recalculateDoctorQueue } from '../services/queueService.js'
import { emitQueueUpdate } from '../services/socketService.js'
import { generateCode } from '../utils/code.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'

export const listConsultations = asyncHandler(async (req, res) => {
  const query = {}
  if (req.query.doctorId) query.doctorId = req.query.doctorId
  if (req.query.patientId) query.patientId = req.query.patientId
  if (req.query.status) query.status = req.query.status

  const consultations = await Consultation.find(query)
    .populate('patientId', 'fullName patientCode')
    .populate('doctorId', 'fullName')
    .sort({ createdAt: -1 })
    .limit(100)

  return sendSuccess(res, 'Consultations fetched successfully', { consultations })
})

export const startConsultation = asyncHandler(async (req, res) => {
  const { queueTokenId } = req.body

  if (!queueTokenId) {
    throw new ApiError(400, 'queueTokenId is required')
  }

  const queueToken = await QueueToken.findById(queueTokenId)
  if (!queueToken) {
    throw new ApiError(404, 'Queue token not found')
  }

  if (['completed', 'missed'].includes(queueToken.queueStatus)) {
    throw new ApiError(400, `Cannot start consultation — queue token is already ${queueToken.queueStatus}`)
  }

  if (queueToken.queueStatus === 'in_consultation') {
    throw new ApiError(400, 'Consultation is already in progress for this queue token')
  }

  if (!queueToken.assignedDoctorId) {
    throw new ApiError(400, 'Queue token has no assigned doctor — assign a doctor before starting consultation')
  }

  const consultation = await Consultation.create({
    consultationNumber: generateCode('CON'),
    patientId: queueToken.patientId,
    doctorId: queueToken.assignedDoctorId,
    appointmentId: queueToken.appointmentId,
    queueTokenId: queueToken._id,
    departmentId: queueToken.departmentId,
  })

  queueToken.queueStatus = 'in_consultation'
  queueToken.actualConsultationStartAt = new Date()
  await queueToken.save()

  await Doctor.findByIdAndUpdate(queueToken.assignedDoctorId, {
    availabilityStatus: 'busy',
  })

  await createAuditLog({
    req,
    actorId: req.user?.sub || null,
    actorRole: req.user?.role || 'doctor',
    action: 'consultation.started',
    entityType: 'Consultation',
    entityId: consultation._id,
    metadata: { queueTokenId: queueToken._id },
  })

  emitQueueUpdate(req, {
    departmentId: queueToken.departmentId,
    doctorId: queueToken.assignedDoctorId,
    patientId: queueToken.patientId,
  })

  return sendSuccess(res, 'Consultation started successfully', { consultation }, 201)
})

export const completeConsultation = asyncHandler(async (req, res) => {
  const consultation = await Consultation.findByIdAndUpdate(
    req.params.id,
    {
      status: 'completed',
      consultationNotes: req.body.consultationNotes || '',
      completedAt: new Date(),
    },
    { new: true },
  )

  if (!consultation) {
    throw new ApiError(404, 'Consultation not found')
  }

  await QueueToken.findByIdAndUpdate(consultation.queueTokenId, {
    queueStatus: 'completed',
    actualConsultationEndAt: new Date(),
    isActive: false,
  })

  await Doctor.findByIdAndUpdate(consultation.doctorId, {
    availabilityStatus: 'available',
  })

  if (consultation.appointmentId) {
    await Appointment.findByIdAndUpdate(consultation.appointmentId, { status: 'completed' })
  }

  await recalculateDoctorQueue(consultation.doctorId)

  await createAuditLog({
    req,
    actorId: req.user?.sub || null,
    actorRole: req.user?.role || 'doctor',
    action: 'consultation.completed',
    entityType: 'Consultation',
    entityId: consultation._id,
    metadata: { queueTokenId: consultation.queueTokenId },
  })

  emitQueueUpdate(req, {
    departmentId: consultation.departmentId,
    doctorId: consultation.doctorId,
    patientId: consultation.patientId,
  })

  return sendSuccess(res, 'Consultation completed successfully', { consultation })
})
