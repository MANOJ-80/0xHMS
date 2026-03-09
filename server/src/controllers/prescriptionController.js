import { Prescription } from '../models/Prescription.js'
import { Consultation } from '../models/Consultation.js'
import { Patient } from '../models/Patient.js'
import { Doctor } from '../models/Doctor.js'
import { createPrescriptionRecord } from '../services/prescriptionService.js'
import { notifyPrescriptionReady } from '../services/notificationService.js'
import { createAuditLog } from '../services/auditService.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'

/**
 * Create a new prescription.
 * POST /api/v1/prescriptions
 */
export const createPrescription = asyncHandler(async (req, res) => {
  const {
    consultationId,
    diagnosis,
    medicines,
    treatmentNotes,
    followUpDate,
    followUpInstructions,
    doctorSignature,
    hospitalName,
  } = req.body

  if (!consultationId || !diagnosis || !medicines || !medicines.length) {
    throw new ApiError(400, 'consultationId, diagnosis, and at least one medicine are required')
  }

  // Validate each medicine item
  for (const med of medicines) {
    if (!med.medicineName || !med.dosage || !med.frequency || !med.duration) {
      throw new ApiError(400, 'Each medicine must have medicineName, dosage, frequency, and duration')
    }
  }

  const consultation = await Consultation.findById(consultationId)
  if (!consultation) {
    throw new ApiError(404, 'Consultation not found')
  }

  // Check for existing prescription for this consultation
  const existingPrescription = await Prescription.findOne({ consultationId })
  if (existingPrescription) {
    throw new ApiError(409, 'A prescription already exists for this consultation')
  }

  const prescription = await createPrescriptionRecord({
    patientId: consultation.patientId,
    doctorId: consultation.doctorId,
    consultationId: consultation._id,
    appointmentId: consultation.appointmentId,
    departmentId: consultation.departmentId,
    diagnosis,
    medicines,
    treatmentNotes: treatmentNotes || '',
    followUpDate: followUpDate || null,
    followUpInstructions: followUpInstructions || '',
    doctorSignature: doctorSignature || '',
    hospitalName: hospitalName || 'SPCMS Hospital',
  })

  // Send prescription ready notification (fire and forget)
  try {
    const patient = await Patient.findById(consultation.patientId)
    const doctor = await Doctor.findById(consultation.doctorId)
    if (patient) {
      await notifyPrescriptionReady({ prescription, patient, doctor })
    }
  } catch (notifyError) {
    console.error('[Notification] Failed to send prescription notification:', notifyError.message)
  }

  await createAuditLog({
    req,
    actorId: req.user?.sub || null,
    actorRole: req.user?.role || 'doctor',
    action: 'prescription.created',
    entityType: 'Prescription',
    entityId: prescription._id,
    metadata: { consultationId, patientId: consultation.patientId },
  })

  return sendSuccess(res, 'Prescription created successfully', { prescription }, 201)
})

/**
 * List prescriptions with optional filters.
 * GET /api/v1/prescriptions
 */
export const listPrescriptions = asyncHandler(async (req, res) => {
  const { patientId, doctorId, consultationId } = req.query
  const query = { isActive: true }

  if (patientId) query.patientId = patientId
  if (doctorId) query.doctorId = doctorId
  if (consultationId) query.consultationId = consultationId

  // Patients can only see their own prescriptions
  if (req.user?.role === 'patient' && req.user?.linkedPatientId) {
    query.patientId = req.user.linkedPatientId
  }

  const prescriptions = await Prescription.find(query)
    .populate('patientId', 'fullName patientCode phone email')
    .populate('doctorId', 'fullName specialization consultationRoom')
    .populate('departmentId', 'name')
    .populate('consultationId', 'consultationNumber startedAt completedAt')
    .sort({ createdAt: -1 })
    .limit(100)

  return sendSuccess(res, 'Prescriptions fetched successfully', { prescriptions })
})

/**
 * Get a single prescription by ID.
 * GET /api/v1/prescriptions/:id
 */
export const getPrescription = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id)
    .populate('patientId', 'fullName patientCode phone email dateOfBirth gender address')
    .populate('doctorId', 'fullName specialization consultationRoom doctorCode')
    .populate('departmentId', 'name code')
    .populate('consultationId', 'consultationNumber startedAt completedAt consultationNotes')

  if (!prescription) {
    throw new ApiError(404, 'Prescription not found')
  }

  return sendSuccess(res, 'Prescription fetched successfully', { prescription })
})

/**
 * Update a prescription (only by the doctor who created it).
 * PATCH /api/v1/prescriptions/:id
 */
export const updatePrescription = asyncHandler(async (req, res) => {
  const prescription = await Prescription.findById(req.params.id)

  if (!prescription) {
    throw new ApiError(404, 'Prescription not found')
  }

  // Verify the doctor is the one who created this prescription
  if (req.user?.role === 'doctor') {
    const doctor = await Doctor.findOne({ userId: req.user.sub })
    if (!doctor || doctor._id.toString() !== prescription.doctorId.toString()) {
      throw new ApiError(403, 'You can only update your own prescriptions')
    }
  }

  const allowedFields = [
    'diagnosis', 'medicines', 'treatmentNotes', 'followUpDate',
    'followUpInstructions', 'doctorSignature',
  ]
  const updates = {}
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field]
    }
  }

  // Validate medicines if being updated
  if (updates.medicines) {
    if (!Array.isArray(updates.medicines) || updates.medicines.length === 0) {
      throw new ApiError(400, 'At least one medicine is required')
    }
    for (const med of updates.medicines) {
      if (!med.medicineName || !med.dosage || !med.frequency || !med.duration) {
        throw new ApiError(400, 'Each medicine must have medicineName, dosage, frequency, and duration')
      }
    }
  }

  const updatedPrescription = await Prescription.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true },
  )

  await createAuditLog({
    req,
    actorId: req.user?.sub || null,
    actorRole: req.user?.role || 'doctor',
    action: 'prescription.updated',
    entityType: 'Prescription',
    entityId: prescription._id,
    metadata: { updatedFields: Object.keys(updates) },
  })

  return sendSuccess(res, 'Prescription updated successfully', { prescription: updatedPrescription })
})

/**
 * Get all prescriptions for a specific patient (patient history).
 * GET /api/v1/prescriptions/patient/:patientId
 */
export const getPatientPrescriptions = asyncHandler(async (req, res) => {
  const prescriptions = await Prescription.find({
    patientId: req.params.patientId,
    isActive: true,
  })
    .populate('doctorId', 'fullName specialization')
    .populate('departmentId', 'name')
    .populate('consultationId', 'consultationNumber startedAt completedAt')
    .sort({ createdAt: -1 })
    .limit(50)

  return sendSuccess(res, 'Patient prescriptions fetched successfully', { prescriptions })
})
