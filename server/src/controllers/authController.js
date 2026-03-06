import bcrypt from 'bcryptjs'
import { Patient } from '../models/Patient.js'
import { User } from '../models/User.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'
import { signAccessToken, signRefreshToken } from '../utils/tokens.js'

function generatePatientCode() {
  return `PAT-${Date.now()}`
}

export const registerPatient = asyncHandler(async (req, res) => {
  const { fullName, email, phone, password, dateOfBirth, gender } = req.body

  if (!fullName || !email || !password || !dateOfBirth) {
    throw new ApiError(400, 'fullName, email, password, and dateOfBirth are required')
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() })
  if (existingUser) {
    throw new ApiError(409, 'An account with this email already exists')
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const patient = await Patient.create({
    patientCode: generatePatientCode(),
    fullName,
    email,
    phone,
    dateOfBirth,
    gender,
  })

  const user = await User.create({
    fullName,
    email,
    phone,
    passwordHash,
    role: 'patient',
    linkedPatientId: patient._id,
  })

  const payload = {
    sub: user._id.toString(),
    role: user.role,
    linkedPatientId: patient._id.toString(),
  }

  return sendSuccess(
    res,
    'Patient account created successfully',
    {
      user, // toJSON auto-strips passwordHash
      patient,
      tokens: {
        accessToken: signAccessToken(payload),
        refreshToken: signRefreshToken(payload),
      },
    },
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
