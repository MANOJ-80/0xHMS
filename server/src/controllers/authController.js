import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { Patient } from '../models/Patient.js'
import { Doctor } from '../models/Doctor.js'
import { User } from '../models/User.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'
import { signAccessToken, signRefreshToken } from '../utils/tokens.js'
import { generatePatientCode, generateDoctorCode } from '../utils/code.js'

export const registerPatient = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, dateOfBirth, gender } = req.body

  if (!fullName || !email || !phone || !password || !dateOfBirth) {
    throw new ApiError(400, 'fullName, email, phone, password, and dateOfBirth are required')
  }

  // Validate Indian phone number (10 digits)
  const cleanPhone = phone.replace(/^(\+91|91|0)/, '').trim()
  if (!/^\d{10}$/.test(cleanPhone)) {
    throw new ApiError(400, 'Please enter a valid 10-digit Indian mobile number')
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() })
  if (existingUser) {
    throw new ApiError(409, 'An account with this email already exists')
  }

  const passwordHash = await bcrypt.hash(password, 10)

  // Use transaction to prevent orphaned records if User creation fails
  const session = await mongoose.startSession()
  let patient, user

  try {
    await session.withTransaction(async () => {
      const [createdPatient] = await Patient.create(
        [
          {
            patientCode: generatePatientCode(),
            fullName,
            email,
            phone: cleanPhone,
            dateOfBirth,
            gender,
          },
        ],
        { session },
      )
      patient = createdPatient

      const [createdUser] = await User.create(
        [
          {
            fullName,
            email,
            phone: cleanPhone,
            passwordHash,
            role: 'patient',
            linkedPatientId: patient._id,
          },
        ],
        { session },
      )
      user = createdUser
    })
  } finally {
    await session.endSession()
  }

  const payload = {
    sub: user._id.toString(),
    role: user.role,
    linkedPatientId: patient._id.toString(),
  }

  return sendSuccess(
    res,
    'Patient account created successfully',
    {
      user,
      patient,
      tokens: {
        accessToken: signAccessToken(payload),
        refreshToken: signRefreshToken(payload),
      },
    },
    201,
  )
})

export const registerStaff = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, role, specialization, departmentId } = req.body

  if (!fullName || !email || !password || !role) {
    throw new ApiError(400, 'fullName, email, password, and role are required')
  }

  if (role !== 'doctor' && role !== 'receptionist') {
    throw new ApiError(400, 'Role must be either doctor or receptionist')
  }

  if (role === 'doctor' && (!specialization || !departmentId)) {
    throw new ApiError(400, 'Doctors require a specialization and departmentId')
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() })
  if (existingUser) {
    throw new ApiError(409, 'An account with this email already exists')
  }

  const passwordHash = await bcrypt.hash(password, 10)

  let cleanPhone = undefined
  if (phone) {
    cleanPhone = phone.replace(/^(\+91|91|0)/, '').trim()
    if (!/^\d{10}$/.test(cleanPhone)) {
      throw new ApiError(400, 'If provided, please enter a valid 10-digit Indian mobile number')
    }
  }

  let user, doctor = null

  if (role === 'doctor') {
    // Use transaction for doctor registration to prevent orphaned records
    const session = await mongoose.startSession()
    try {
      await session.withTransaction(async () => {
        const [createdUser] = await User.create(
          [
            {
              fullName,
              email,
              phone: cleanPhone,
              passwordHash,
              role,
            },
          ],
          { session },
        )
        user = createdUser

        const [createdDoctor] = await Doctor.create(
          [
            {
              userId: user._id,
              doctorCode: generateDoctorCode(fullName),
              fullName,
              specialization,
              departmentId,
              allowAutoAssignment: true,
              isActive: true,
            },
          ],
          { session },
        )
        doctor = createdDoctor

        user.linkedDoctorId = doctor._id
        await user.save({ session })
      })
    } finally {
      await session.endSession()
    }
  } else {
    // Receptionist - no linked record, no transaction needed
    user = await User.create({
      fullName,
      email,
      phone: cleanPhone,
      passwordHash,
      role,
    })
  }

  return sendSuccess(
    res,
    `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`,
    { user, doctor },
    201,
  )
})

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required')
  }

  // Explicitly select passwordHash since it defaults to select:false
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash')
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid credentials')
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash)
  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid credentials')
  }

  user.lastLoginAt = new Date()
  await user.save()

  const payload = {
    sub: user._id.toString(),
    role: user.role,
    linkedPatientId: user.linkedPatientId?.toString() || null,
    linkedDoctorId: user.linkedDoctorId?.toString() || null,
  }

  return sendSuccess(res, 'Login successful', {
    user, // toJSON auto-strips passwordHash
    tokens: {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    },
  })
})

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.sub)
  if (!user) {
    throw new ApiError(404, 'User not found')
  }

  return sendSuccess(res, 'Current user fetched successfully', { user })
})

export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.sub)
  if (!user) throw new ApiError(404, 'User not found')

  let profile = null
  if (user.role === 'patient' && user.linkedPatientId) {
    profile = await Patient.findById(user.linkedPatientId)
  } else if (user.role === 'doctor' && user.linkedDoctorId) {
    profile = await Doctor.findById(user.linkedDoctorId).populate('departmentId', 'name code')
  }

  return sendSuccess(res, 'Profile fetched successfully', { user, profile })
})

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.sub)
  if (!user) throw new ApiError(404, 'User not found')

  const { fullName, phone, gender, dateOfBirth, address, emergencyContact, currentPassword, newPassword } = req.body

  // Phone validation if provided
  if (phone) {
    const cleanPhone = phone.replace(/^(\+91|91|0)/, '').trim()
    if (!/^\d{10}$/.test(cleanPhone)) {
      throw new ApiError(400, 'Please enter a valid 10-digit Indian mobile number')
    }
    user.phone = cleanPhone
  }

  if (fullName) user.fullName = fullName

  // Password change (optional)
  if (newPassword) {
    if (!currentPassword) throw new ApiError(400, 'Current password is required to set a new password')
    const userWithHash = await User.findById(req.user.sub).select('+passwordHash')
    const match = await bcrypt.compare(currentPassword, userWithHash.passwordHash)
    if (!match) throw new ApiError(403, 'Current password is incorrect')
    if (newPassword.length < 6) throw new ApiError(400, 'New password must be at least 6 characters')
    user.passwordHash = await bcrypt.hash(newPassword, 10)
  }

  await user.save()

  // Update linked profile too
  if (user.role === 'patient' && user.linkedPatientId) {
    const updates = {}
    if (fullName) updates.fullName = fullName
    if (phone) updates.phone = user.phone
    if (gender) updates.gender = gender
    if (dateOfBirth) updates.dateOfBirth = dateOfBirth
    if (address) updates.address = address
    if (emergencyContact) updates.emergencyContact = emergencyContact
    updates.updatedBy = user._id

    await Patient.findByIdAndUpdate(user.linkedPatientId, updates, { runValidators: true })
  } else if (user.role === 'doctor' && user.linkedDoctorId) {
    const updates = {}
    if (fullName) updates.fullName = fullName
    await Doctor.findByIdAndUpdate(user.linkedDoctorId, updates, { runValidators: true })
  }

  // Return updated profile
  let profile = null
  if (user.role === 'patient' && user.linkedPatientId) {
    profile = await Patient.findById(user.linkedPatientId)
  } else if (user.role === 'doctor' && user.linkedDoctorId) {
    profile = await Doctor.findById(user.linkedDoctorId).populate('departmentId', 'name code')
  }

  return sendSuccess(res, 'Profile updated successfully', { user, profile })
})
