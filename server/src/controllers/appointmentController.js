import { Appointment } from '../models/Appointment.js'
import { Doctor } from '../models/Doctor.js'
import { Patient } from '../models/Patient.js'
import { Department } from '../models/Department.js'
import { Checkin } from '../models/Checkin.js'
import { QueueToken } from '../models/QueueToken.js'
import { Consultation } from '../models/Consultation.js'
import { DoctorAssignment } from '../models/DoctorAssignment.js'
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

  // Validate appointment date is not in the past
  const appointmentDateObj = new Date(appointmentDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (appointmentDateObj < today) {
    throw new ApiError(400, 'Cannot book appointments in the past')
  }

  // For same-day appointments, ensure slot is not in the past
  const slotStartDate = new Date(slotStart)
  if (slotStartDate < new Date()) {
    throw new ApiError(400, 'Cannot book a time slot that has already passed')
  }

  const doctorId = req.body.doctorId || null

  // Validate bookingType consistency
  const resolvedBookingType = bookingType || (doctorId ? 'doctor' : 'specialization')
  if (resolvedBookingType === 'doctor' && !doctorId) {
    throw new ApiError(400, 'doctorId is required when bookingType is "doctor"')
  }
  if (resolvedBookingType === 'specialization' && doctorId) {
    // If user explicitly requested specialization but provided a doctorId, that's okay
    // The doctor becomes a preference. But if bookingType was auto-inferred, it should be 'doctor'
    // Since we auto-infer based on doctorId presence, this case only happens if user explicitly set it
  }

  // Check for double-booking - for both doctor-specific and specialization bookings
  const slotStartTime = new Date(slotStart)
  const slotEndTime = new Date(slotEnd)

  if (doctorId) {
    // Check if this specific doctor has a conflicting appointment
    const doctorOverlap = await Appointment.findOne({
      doctorId,
      status: { $in: ['scheduled', 'checked_in'] },
      slotStart: { $lt: slotEndTime },
      slotEnd: { $gt: slotStartTime },
    })

    if (doctorOverlap) {
      throw new ApiError(409, 'This doctor already has an appointment in the selected slot')
    }
  }

  // Also check if the same patient already has an appointment at this time
  const patientOverlap = await Appointment.findOne({
    patientId,
    status: { $in: ['scheduled', 'checked_in'] },
    slotStart: { $lt: slotEndTime },
    slotEnd: { $gt: slotStartTime },
  })

  if (patientOverlap) {
    throw new ApiError(409, 'You already have an appointment scheduled during this time slot')
  }

  const appointment = await Appointment.create({
    appointmentNumber: generateCode('APT'),
    patientId,
    doctorId,
    departmentId,
    specialization,
    bookingType: resolvedBookingType,
    visitType: req.body.visitType || 'scheduled',
    appointmentDate: new Date(appointmentDate),
    slotStart: new Date(slotStart),
    slotEnd: new Date(slotEnd),
    status: 'scheduled',
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

    // Patients can only cancel appointments at least 2 hours before the slot starts
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000)
    if (new Date(appointment.slotStart) < twoHoursFromNow) {
      throw new ApiError(
        400,
        'Appointments can only be cancelled at least 2 hours before the scheduled time. Please contact the hospital for assistance.',
      )
    }
  }

  appointment.status = 'cancelled'
  appointment.cancellationReason = req.body.reason || 'Cancelled by user'
  appointment.updatedBy = req.user?.sub || null
  await appointment.save()

  // Clean up related records in DB
  const cleanupResults = {}
  try {
    // Cancel related checkins
    const checkinResult = await Checkin.updateMany(
      { appointmentId: appointment._id, status: { $nin: ['completed', 'cancelled'] } },
      { $set: { status: 'cancelled' } }
    )
    cleanupResults.checkins = checkinResult.modifiedCount

    // Find related queue tokens to cascade cleanup
    const relatedTokens = await QueueToken.find({ appointmentId: appointment._id, isActive: true })
    const tokenIds = relatedTokens.map(t => t._id)

    // Deactivate queue tokens
    const tokenResult = await QueueToken.updateMany(
      { appointmentId: appointment._id, isActive: true },
      { $set: { queueStatus: 'missed', isActive: false } }
    )
    cleanupResults.queueTokens = tokenResult.modifiedCount

    // Cancel active consultations linked to these tokens
    if (tokenIds.length > 0) {
      const consultResult = await Consultation.updateMany(
        { queueTokenId: { $in: tokenIds }, status: { $nin: ['completed', 'cancelled'] } },
        { $set: { status: 'cancelled', cancelledAt: new Date() } }
      )
      cleanupResults.consultations = consultResult.modifiedCount

      // BIZ-4: Soft-delete doctor assignments for audit trail instead of hard delete
      const assignResult = await DoctorAssignment.updateMany(
        { queueTokenId: { $in: tokenIds }, status: 'active' },
        { 
          $set: { 
            status: 'cancelled',
            cancelledAt: new Date(),
            cancellationReason: req.body.reason || 'Appointment cancelled'
          } 
        }
      )
      cleanupResults.doctorAssignments = assignResult.modifiedCount
    }

    console.log(`[Cancel] Appointment ${appointment.appointmentNumber} cleanup:`, cleanupResults)
  } catch (cleanupError) {
    console.error('[Cancel] Cleanup error:', cleanupError.message)
  }

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

  return sendSuccess(res, 'Appointment cancelled successfully', { appointment, cleanup: cleanupResults })
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
  const requestedDate = new Date(date)
  const dayOfWeek = requestedDate.getDay()
  
  // Set up date range for finding existing appointments
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)

  const results = []

  for (const doctor of doctors) {
    const schedule = doctor.scheduleTemplate.find((item) => item.dayOfWeek === dayOfWeek && item.isActive)
    if (!schedule) continue

    // Fetch existing appointments for this doctor on this date
    const existingAppointments = await Appointment.find({
      doctorId: doctor._id,
      status: { $in: ['scheduled', 'checked_in'] },
      slotStart: { $gte: dayStart, $lte: dayEnd },
    }).select('slotStart slotEnd')

    // Generate all possible slots based on schedule
    const [startHour, startMin] = schedule.startTime.split(':').map(Number)
    const [endHour, endMin] = schedule.endTime.split(':').map(Number)
    const slotDuration = schedule.slotMinutes || 15

    const slots = []
    const slotStartTime = new Date(date)
    slotStartTime.setHours(startHour, startMin, 0, 0)
    
    const scheduleEndTime = new Date(date)
    scheduleEndTime.setHours(endHour, endMin, 0, 0)

    const now = new Date()

    while (slotStartTime < scheduleEndTime) {
      const slotEndTime = new Date(slotStartTime.getTime() + slotDuration * 60 * 1000)
      
      // Skip slots in the past
      if (slotStartTime < now) {
        slotStartTime.setTime(slotEndTime.getTime())
        continue
      }

      // Check if this slot overlaps with any existing appointment
      const isBooked = existingAppointments.some(appt => {
        const apptStart = new Date(appt.slotStart)
        const apptEnd = new Date(appt.slotEnd)
        return slotStartTime < apptEnd && slotEndTime > apptStart
      })

      if (!isBooked) {
        slots.push({
          start: slotStartTime.toISOString(),
          end: slotEndTime.toISOString(),
        })
      }

      slotStartTime.setTime(slotEndTime.getTime())
    }

    results.push({
      doctorId: doctor._id,
      doctorName: doctor.fullName,
      specialization: doctor.specialization,
      slotMinutes: schedule.slotMinutes,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      availableSlots: slots,
    })
  }

  return sendSuccess(res, 'Available slots fetched successfully', { slots: results })
})
