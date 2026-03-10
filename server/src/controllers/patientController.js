import { Patient } from '../models/Patient.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'

function buildPatientCode() {
  return `PAT-${Date.now()}`
}

export const createPatient = asyncHandler(async (req, res) => {
  const { fullName, dateOfBirth } = req.body

  if (!fullName || !dateOfBirth) {
    throw new ApiError(400, 'fullName and dateOfBirth are required')
  }

  const patient = await Patient.create({
    patientCode: req.body.patientCode || buildPatientCode(),
    fullName,
    dateOfBirth,
    gender: req.body.gender || 'prefer_not_to_say',
    phone: req.body.phone || '',
    email: req.body.email || '',
    address: req.body.address || {},
    emergencyContact: req.body.emergencyContact || {},
    notes: req.body.notes || '',
    createdBy: req.user?.sub || null,
    updatedBy: req.user?.sub || null,
  })

  return sendSuccess(res, 'Patient created successfully', { patient }, 201)
})

export const listPatients = asyncHandler(async (req, res) => {
  const { search, isActive } = req.query
  const query = {}

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    query.$or = [
      { fullName: { $regex: escaped, $options: 'i' } },
      { phone: { $regex: escaped, $options: 'i' } },
      { email: { $regex: escaped, $options: 'i' } },
      { patientCode: { $regex: escaped, $options: 'i' } },
    ]
  }

  if (isActive !== undefined) {
    query.isActive = isActive === 'true'
  }

  const patients = await Patient.find(query).sort({ createdAt: -1 }).limit(50)
  return sendSuccess(res, 'Patients fetched successfully', { patients })
})

export const getPatient = asyncHandler(async (req, res) => {
  // Access scoping: patients can only view their own profile
  if (req.user?.role === 'patient') {
    if (!req.user.linkedPatientId || req.params.id !== req.user.linkedPatientId.toString()) {
      throw new ApiError(403, 'You can only view your own profile')
    }
  }

  const patient = await Patient.findById(req.params.id)

  if (!patient) {
    throw new ApiError(404, 'Patient not found')
  }

  return sendSuccess(res, 'Patient fetched successfully', { patient })
})

export const updatePatient = asyncHandler(async (req, res) => {
  const allowedFields = [
    'fullName', 'dateOfBirth', 'gender', 'phone', 'email',
    'address', 'emergencyContact', 'notes', 'isActive',
  ]
  const updates = { updatedBy: req.user?.sub || null }
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field]
    }
  }

  const patient = await Patient.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  })

  if (!patient) {
    throw new ApiError(404, 'Patient not found')
  }

  return sendSuccess(res, 'Patient updated successfully', { patient })
})
