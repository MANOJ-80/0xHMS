import { Appointment } from '../models/Appointment.js'
import { Doctor } from '../models/Doctor.js'
import { QueueToken } from '../models/QueueToken.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'

export const listDoctors = asyncHandler(async (req, res) => {
  const { specialization, departmentId, availabilityStatus, isActive } = req.query
  const query = {}

  if (specialization) query.specialization = specialization
  if (departmentId) query.departmentId = departmentId
  if (availabilityStatus) query.availabilityStatus = availabilityStatus
  if (isActive !== undefined) query.isActive = isActive === 'true'

  const doctors = await Doctor.find(query)
    .populate('departmentId', 'name code')
    .sort({ fullName: 1 })
    .limit(100)

  return sendSuccess(res, 'Doctors fetched successfully', { doctors })
})

export const getDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id).populate('departmentId', 'name code')

  if (!doctor) {
    throw new ApiError(404, 'Doctor not found')
  }

  return sendSuccess(res, 'Doctor fetched successfully', { doctor })
})

export const createDoctor = asyncHandler(async (req, res) => {
  const { userId, doctorCode, fullName, specialization, departmentId } = req.body

  if (!userId || !doctorCode || !fullName || !specialization || !departmentId) {
    throw new ApiError(400, 'userId, doctorCode, fullName, specialization, and departmentId are required')
  }

  const doctor = await Doctor.create({
    userId,
    doctorCode,
    fullName,
    specialization,
    departmentId,
    consultationRoom: req.body.consultationRoom || '',
    maxQueueThreshold: req.body.maxQueueThreshold || 10,
    averageConsultationMinutes: req.body.averageConsultationMinutes || 15,
    allowAutoAssignment: req.body.allowAutoAssignment !== false,
    scheduleTemplate: req.body.scheduleTemplate || [],
  })

  return sendSuccess(res, 'Doctor created successfully', { doctor }, 201)
})

export const updateDoctor = asyncHandler(async (req, res) => {
  // Doctors can only update their own profile
  if (req.user?.role === 'doctor') {
    const requestingDoctor = await Doctor.findOne({ userId: req.user.sub })
    if (!requestingDoctor || requestingDoctor._id.toString() !== req.params.id) {
      throw new ApiError(403, 'You can only update your own profile')
    }
  }

  const allowedFields = [
    'fullName', 'specialization', 'departmentId', 'consultationRoom',
    'maxQueueThreshold', 'averageConsultationMinutes', 'allowAutoAssignment',
    'scheduleTemplate', 'isActive',
  ]
  const updates = {}
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field]
    }
  }

  const doctor = await Doctor.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })

  if (!doctor) {
    throw new ApiError(404, 'Doctor not found')
  }

  return sendSuccess(res, 'Doctor updated successfully', { doctor })
})

export const updateAvailability = asyncHandler(async (req, res) => {
  const { availabilityStatus } = req.body

  if (!availabilityStatus) {
    throw new ApiError(400, 'availabilityStatus is required')
  }

  // Doctors can only update their own availability
  if (req.user?.role === 'doctor') {
    const requestingDoctor = await Doctor.findOne({ userId: req.user.sub })
    if (!requestingDoctor || requestingDoctor._id.toString() !== req.params.id) {
      throw new ApiError(403, 'You can only update your own availability status')
    }
  }

  const validStatuses = ['available', 'busy', 'on_break', 'offline', 'overrun']
  if (!validStatuses.includes(availabilityStatus)) {
    throw new ApiError(400, `availabilityStatus must be one of: ${validStatuses.join(', ')}`)
  }

  const doctor = await Doctor.findByIdAndUpdate(
    req.params.id,
    { availabilityStatus },
    { new: true },
  )

  if (!doctor) {
    throw new ApiError(404, 'Doctor not found')
  }

  return sendSuccess(res, 'Doctor availability updated successfully', { doctor })
})

export const getDoctorQueue = asyncHandler(async (req, res) => {
  // Enforce doctor-patient lock: doctors can only view their own queue
  if (req.user?.role === 'doctor') {
    const requestingDoctor = await Doctor.findOne({ userId: req.user.sub })
    if (!requestingDoctor || requestingDoctor._id.toString() !== req.params.id) {
      throw new ApiError(403, 'You can only view your own patient queue')
    }
  }

  const queue = await QueueToken.find({
    assignedDoctorId: req.params.id,
    queueStatus: { $in: ['waiting', 'assigned', 'called', 'in_consultation'] },
    isActive: true,
  })
    .populate('patientId', 'fullName patientCode phone')
    .populate('appointmentId', 'appointmentNumber slotStart')
    .sort({ priorityLevel: -1, createdAt: 1 })

  return sendSuccess(res, 'Doctor queue fetched successfully', { queue })
})

export const getDoctorAppointments = asyncHandler(async (req, res) => {
  // Enforce doctor-patient lock: doctors can only view their own appointments
  if (req.user?.role === 'doctor') {
    const requestingDoctor = await Doctor.findOne({ userId: req.user.sub })
    if (!requestingDoctor || requestingDoctor._id.toString() !== req.params.id) {
      throw new ApiError(403, 'You can only view your own appointments')
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const appointments = await Appointment.find({
    doctorId: req.params.id,
    status: 'scheduled',
    appointmentDate: { $gte: today, $lt: tomorrow },
  })
    .populate('patientId', 'fullName patientCode phone')
    .populate('departmentId', 'name')
    .sort({ slotStart: 1 })

  return sendSuccess(res, 'Doctor appointments fetched successfully', { appointments })
})

export const getDoctorSlots = asyncHandler(async (req, res) => {
  const { date } = req.query

  if (!date) {
    throw new ApiError(400, 'date query parameter is required')
  }

  const doctor = await Doctor.findById(req.params.id)
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found')
  }

  const targetDate = new Date(date)
  if (Number.isNaN(targetDate.getTime())) {
    throw new ApiError(400, 'Invalid date format')
  }

  const dayOfWeek = targetDate.getDay()
  const schedule = doctor.scheduleTemplate?.find((item) => item.dayOfWeek === dayOfWeek && item.isActive)

  if (!schedule) {
    return sendSuccess(res, 'No slots available for selected date', { slots: [] })
  }

  const appointments = await Appointment.find({
    doctorId: doctor._id,
    appointmentDate: {
      $gte: new Date(new Date(targetDate).setHours(0, 0, 0, 0)),
      $lt: new Date(new Date(targetDate).setHours(23, 59, 59, 999)),
    },
    status: { $in: ['scheduled', 'checked_in'] },
  }).select('slotStart slotEnd')

  const [startHour, startMinute] = schedule.startTime.split(':').map(Number)
  const [endHour, endMinute] = schedule.endTime.split(':').map(Number)
  const cursor = new Date(targetDate)
  cursor.setHours(startHour, startMinute, 0, 0)

  const end = new Date(targetDate)
  end.setHours(endHour, endMinute, 0, 0)

  const slots = []

  // Parse break times if defined
  let breakStartTime = null
  let breakEndTime = null
  if (schedule.breakStart && schedule.breakEnd) {
    const [bsHour, bsMin] = schedule.breakStart.split(':').map(Number)
    const [beHour, beMin] = schedule.breakEnd.split(':').map(Number)
    breakStartTime = new Date(targetDate)
    breakStartTime.setHours(bsHour, bsMin, 0, 0)
    breakEndTime = new Date(targetDate)
    breakEndTime.setHours(beHour, beMin, 0, 0)
  }

  while (cursor < end) {
    const slotStart = new Date(cursor)
    const slotEnd = new Date(cursor)
    slotEnd.setMinutes(slotEnd.getMinutes() + schedule.slotMinutes)

    // Skip slots that overlap with break time
    const duringBreak =
      breakStartTime && breakEndTime && slotStart < breakEndTime && slotEnd > breakStartTime

    const overlaps = appointments.some(
      (appointment) => slotStart < appointment.slotEnd && slotEnd > appointment.slotStart,
    )

    if (!overlaps && !duringBreak && slotEnd <= end) {
      slots.push({ slotStart, slotEnd })
    }

    cursor.setMinutes(cursor.getMinutes() + schedule.slotMinutes)
  }

  return sendSuccess(res, 'Doctor slots fetched successfully', { slots })
})
