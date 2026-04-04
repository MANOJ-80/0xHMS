import { Consultation } from '../models/Consultation.js'
import { Appointment } from '../models/Appointment.js'
import { Checkin } from '../models/Checkin.js'
import { Doctor } from '../models/Doctor.js'
import { Prescription } from '../models/Prescription.js'
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

  // Enforce doctor-patient lock: doctors can only see their own consultations
  if (req.user?.role === 'doctor') {
    const requestingDoctor = await Doctor.findOne({ userId: req.user.sub })
    if (requestingDoctor) {
      query.doctorId = requestingDoctor._id
    }
  }

  // Patients can only see their own consultations
  if (req.user?.role === 'patient' && req.user?.linkedPatientId) {
    query.patientId = req.user.linkedPatientId
  }

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

  // Enforce doctor-patient lock: only the assigned doctor can start this consultation
  if (req.user?.role === 'doctor') {
    const requestingDoctor = await Doctor.findOne({ userId: req.user.sub })
    if (!requestingDoctor || requestingDoctor._id.toString() !== queueToken.assignedDoctorId.toString()) {
      throw new ApiError(403, 'This patient is assigned to a different doctor. Only the assigned doctor can start this consultation.')
    }
  }

  // RACE-4: Use atomic findOneAndUpdate to prevent double consultation start
  // Only update if status is NOT already 'in_consultation', 'completed', or 'missed'
  const updatedQueueToken = await QueueToken.findOneAndUpdate(
    {
      _id: queueTokenId,
      queueStatus: { $nin: ['in_consultation', 'completed', 'missed'] }
    },
    {
      $set: {
        queueStatus: 'in_consultation',
        actualConsultationStartAt: new Date()
      }
    },
    { new: true }
  )

  if (!updatedQueueToken) {
    // Another request already started the consultation
    throw new ApiError(409, 'Consultation has already been started by another request')
  }

  const consultation = await Consultation.create({
    consultationNumber: generateCode('CON'),
    patientId: updatedQueueToken.patientId,
    doctorId: updatedQueueToken.assignedDoctorId,
    appointmentId: updatedQueueToken.appointmentId,
    queueTokenId: updatedQueueToken._id,
    checkinId: updatedQueueToken.checkinId,
    departmentId: updatedQueueToken.departmentId,
  })

  await Doctor.findByIdAndUpdate(updatedQueueToken.assignedDoctorId, {
    availabilityStatus: 'busy',
  })

  await createAuditLog({
    req,
    actorId: req.user?.sub || null,
    actorRole: req.user?.role || 'doctor',
    action: 'consultation.started',
    entityType: 'Consultation',
    entityId: consultation._id,
    metadata: { queueTokenId: updatedQueueToken._id },
  })

  emitQueueUpdate(req, {
    departmentId: updatedQueueToken.departmentId,
    doctorId: updatedQueueToken.assignedDoctorId,
    patientId: updatedQueueToken.patientId,
  })

  return sendSuccess(res, 'Consultation started successfully', { consultation }, 201)
})

export const completeConsultation = asyncHandler(async (req, res) => {
  const consultation = await Consultation.findById(req.params.id)

  if (!consultation) {
    throw new ApiError(404, 'Consultation not found')
  }

  // Enforce doctor-patient lock: only the assigned doctor can complete this consultation
  if (req.user?.role === 'doctor') {
    const requestingDoctor = await Doctor.findOne({ userId: req.user.sub })
    if (!requestingDoctor || requestingDoctor._id.toString() !== consultation.doctorId.toString()) {
      throw new ApiError(403, 'Only the assigned doctor can complete this consultation.')
    }
  }

  consultation.status = 'completed'
  consultation.consultationNotes = req.body.consultationNotes || ''
  consultation.completedAt = new Date()
  await consultation.save()

  await QueueToken.findByIdAndUpdate(consultation.queueTokenId, {
    queueStatus: 'completed',
    actualConsultationEndAt: new Date(),
    isActive: false,
  })

  // Mark the check-in as completed so the patient can check in again later
  if (consultation.checkinId) {
    await Checkin.findByIdAndUpdate(consultation.checkinId, { status: 'completed' })
  } else {
    // Fallback: find checkin via queueToken
    const qt = await QueueToken.findById(consultation.queueTokenId)
    if (qt?.checkinId) {
      await Checkin.findByIdAndUpdate(qt.checkinId, { status: 'completed' })
    }
  }

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

  // Check if a prescription was already created for this consultation
  const prescription = await Prescription.findOne({ consultationId: consultation._id })

  return sendSuccess(res, 'Consultation completed successfully', {
    consultation,
    prescription: prescription || null,
    prescriptionPending: !prescription,
  })
})
