import { Patient } from '../models/Patient.js'
import { Appointment } from '../models/Appointment.js'
import { Consultation } from '../models/Consultation.js'
import { Prescription } from '../models/Prescription.js'
import { Checkin } from '../models/Checkin.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'

export const getPatientHistory = asyncHandler(async (req, res) => {
  const { id } = req.params

  // Access scoping: patients can only view their own history
  if (req.user?.role === 'patient') {
    if (!req.user.linkedPatientId || id !== req.user.linkedPatientId.toString()) {
      throw new ApiError(403, 'You can only view your own history')
    }
  }

  const patient = await Patient.findById(id)
  if (!patient) {
    throw new ApiError(404, 'Patient not found')
  }

  const [appointments, consultations, prescriptions, checkins] = await Promise.all([
    Appointment.find({ patientId: id })
      .populate('doctorId', 'fullName specialization')
      .populate('departmentId', 'name')
      .sort({ slotStart: -1 })
      .limit(50),
    Consultation.find({ patientId: id })
      .populate('doctorId', 'fullName specialization')
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 })
      .limit(50),
    Prescription.find({ patientId: id })
      .populate('doctorId', 'fullName specialization')
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 })
      .limit(50),
    Checkin.find({ patientId: id })
      .populate('doctorId', 'fullName specialization')
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 })
      .limit(50),
  ])

  return sendSuccess(res, 'Patient history fetched successfully', {
    patient,
    appointments,
    consultations,
    prescriptions,
    checkins,
  })
})
