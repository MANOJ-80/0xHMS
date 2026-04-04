import { Doctor } from '../models/Doctor.js'
import { Appointment } from '../models/Appointment.js'
import { Consultation } from '../models/Consultation.js'
import { Prescription } from '../models/Prescription.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'

export const getDoctorHistory = asyncHandler(async (req, res) => {
  const { id } = req.params

  // Access scoping: doctors can only view their own history
  if (req.user?.role === 'doctor') {
    const requestingDoctor = await Doctor.findOne({ userId: req.user.sub })
    if (!requestingDoctor || id !== requestingDoctor._id.toString()) {
      throw new ApiError(403, 'You can only view your own history')
    }
  }

  const doctor = await Doctor.findById(id).populate('departmentId', 'name code')
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found')
  }

  const [appointments, consultations, prescriptions] = await Promise.all([
    Appointment.find({ doctorId: id })
      .populate('patientId', 'fullName patientCode phone')
      .populate('departmentId', 'name')
      .sort({ slotStart: -1 })
      .limit(100),
    Consultation.find({ doctorId: id })
      .populate('patientId', 'fullName patientCode')
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 })
      .limit(100),
    Prescription.find({ doctorId: id })
      .populate('patientId', 'fullName patientCode')
      .populate('departmentId', 'name')
      .sort({ createdAt: -1 })
      .limit(100),
  ])

  // Calculate stats
  const stats = {
    totalAppointments: appointments.length,
    completedConsultations: consultations.filter(c => c.status === 'completed').length,
    totalPrescriptions: prescriptions.length,
    todayAppointments: appointments.filter(a => {
      const today = new Date()
      const aptDate = new Date(a.appointmentDate)
      return aptDate.toDateString() === today.toDateString()
    }).length,
  }

  return sendSuccess(res, 'Doctor history fetched successfully', {
    doctor,
    appointments,
    consultations,
    prescriptions,
    stats,
  })
})
