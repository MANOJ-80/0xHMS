import { Appointment } from '../models/Appointment.js'
import { Doctor } from '../models/Doctor.js'
import { Patient } from '../models/Patient.js'
import { Department } from '../models/Department.js'
import { notifyAppointmentConfirmation, notifyCancellation } from '../services/notificationService.js'
import { generateCode } from '../utils/code.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'

export const createAppointment = asyncHandler(async (req, res) => {
  const {
    patientId,
    departmentId,
    specialization,
    bookingType,
    appointmentDate,
    slotStart,
    slotEnd,
  } = req.body

  if (!patientId || !departmentId || !specialization || !appointmentDate || !slotStart || !slotEnd) {
    throw new ApiError(
      400,
      'patientId, departmentId, specialization, appointmentDate, slotStart, and slotEnd are required',
    )
  }

  const doctorId = req.body.doctorId || null

  // Check for double-booking if a specific doctor and time are provided
  if (doctorId && slotStart && slotEnd) {
    const overlap = await Appointment.findOne({
      doctorId,
      status: { $in: ['scheduled', 'checked_in'] },
      slotStart: { $lt: new Date(slotEnd) },
      slotEnd: { $gt: new Date(slotStart) },
    })

    if (overlap) {
      throw new ApiError(409, 'This doctor already has an appointment in the selected slot')
    }
  }

  const appointment = await Appointment.create({
    appointmentNumber: generateCode('APT'),
    patientId,
    doctorId,
    departmentId,
    specialization,
    bookingType: bookingType || (doctorId ? 'doctor' : 'specialization'),
    visitType: req.body.visitType || 'scheduled',
    appointmentDate: new Date(appointmentDate),
    slotStart: new Date(slotStart),
    slotEnd: new Date(slotEnd),
    status: req.body.status || 'scheduled',
    bookingSource: req.body.bookingSource || 'patient_portal',
    preferredDoctorId: req.body.preferredDoctorId || null,
    notes: req.body.notes || '',
    createdBy: req.user?.sub || null,
    updatedBy: req.user?.sub || null,
  })

  // Send appointment confirmation notification (fire and forget)
  try {
    const patient = await Patient.findById(patientId)
    const doctor = doctorId ? await Doctor.findById(doctorId) : null
    const department = await Department.findById(departmentId)
    if (patient) {
      await notifyAppointmentConfirmation({ appointment, patient, doctor, department })
    }
  } catch (notifyError) {
    console.error('[Notification] Failed to send appointment confirmation:', notifyError.message)
  }

  return sendSuccess(res, 'Appointment created successfully', { appointment }, 201)
})

export const listAppointments = asyncHandler(async (req, res) => {
  const query = {}
  const { patientId, doctorId, status, departmentId, date } = req.query

  if (patientId) query.patientId = patientId
  if (doctorId) query.doctorId = doctorId
  if (status) query.status = status
  if (departmentId) query.departmentId = departmentId
  if (date) {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    query.appointmentDate = { $gte: start, $lt: end }
  }

  // Role-based access scoping
  if (req.user?.role === 'patient') {
    if (!req.user.linkedPatientId) {
      throw new ApiError(403, 'Patient account not linked')
    }
    query.patientId = req.user.linkedPatientId
  } else if (req.user?.role === 'doctor') {
    const doctor = await Doctor.findOne({ userId: req.user.sub })
    if (doctor) {
      query.doctorId = doctor._id
    }
  }

  const appointments = await Appointment.find(query)
    .populate('doctorId', 'fullName specialization consultationRoom')
    .populate('patientId', 'fullName patientCode phone')
    .populate('departmentId', 'name')
    .sort({ slotStart: 1 })
    .limit(100)

  return sendSuccess(res, 'Appointments fetched successfully', { appointments })
})

export const getAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate('doctorId', 'fullName specialization')
    .populate('patientId', 'fullName patientCode')
    .populate('departmentId', 'name')

  if (!appointment) {
    throw new ApiError(404, 'Appointment not found')
  }

  return sendSuccess(res, 'Appointment fetched successfully', { appointment })
})

export const cancelAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)

  if (!appointment) {
    throw new ApiError(404, 'Appointment not found')
  }

  if (appointment.status === 'cancelled') {
    throw new ApiError(400, 'Appointment is already cancelled')
  }

  if (appointment.status === 'completed') {
    throw new ApiError(400, 'Cannot cancel a completed appointment')
  }

  // Ownership check for patients
  if (req.user?.role === 'patient') {
    if (!req.user.linkedPatientId || appointment.patientId.toString() !== req.user.linkedPatientId.toString()) {
      throw new ApiError(403, 'You can only cancel your own appointments')
    }
  }

  appointment.status = 'cancelled'
  appointment.cancellationReason = req.body.reason || 'Cancelled by user'
  appointment.updatedBy = req.user?.sub || null
  await appointment.save()

  // Send cancellation notification (fire and forget)
  try {
    const patient = await Patient.findById(appointment.patientId)
    const doctor = appointment.doctorId ? await Doctor.findById(appointment.doctorId) : null
    if (patient) {
      await notifyCancellation({ appointment, patient, doctor })
    }
  } catch (notifyError) {
    console.error('[Notification] Failed to send cancellation notification:', notifyError.message)
  }

  return sendSuccess(res, 'Appointment cancelled successfully', { appointment })
})

export const getAvailableSlots = asyncHandler(async (req, res) => {
  const { doctorId, specialization, departmentId, date } = req.query

  if (!date) {
    throw new ApiError(400, 'date query parameter is required')
  }

  const query = { isActive: true }
  if (departmentId) query.departmentId = departmentId
  if (doctorId) query._id = doctorId
  if (specialization) query.specialization = specialization

  const doctors = await Doctor.find(query).limit(20)
  const dayOfWeek = new Date(date).getDay()
  const results = []

  for (const doctor of doctors) {
    const schedule = doctor.scheduleTemplate.find((item) => item.dayOfWeek === dayOfWeek && item.isActive)
    if (!schedule) continue

    results.push({
      doctorId: doctor._id,
      doctorName: doctor.fullName,
      specialization: doctor.specialization,
      slotMinutes: schedule.slotMinutes,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
    })
  }

  return sendSuccess(res, 'Available slot templates fetched successfully', { slots: results })
})
