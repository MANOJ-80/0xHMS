import bcrypt from 'bcryptjs'
import supertest from 'supertest'
import { createApp } from '../app.js'
import { Department } from '../models/Department.js'
import { Doctor } from '../models/Doctor.js'
import { Patient } from '../models/Patient.js'
import { User } from '../models/User.js'
import { signAccessToken } from '../utils/tokens.js'

// Re-usable app instance for supertest
let _app
export function getApp() {
  if (!_app) _app = createApp()
  return _app
}

export function api() {
  return supertest(getApp())
}

// ---------------------------------------------------------------------------
// Seed helpers — create minimal entities needed for integration tests
// ---------------------------------------------------------------------------

export async function seedDepartment(overrides = {}) {
  return Department.create({
    name: 'Test OPD',
    code: `OPD-${Date.now()}`,
    description: 'Test department',
    isActive: true,
    ...overrides,
  })
}

export async function seedUser({ role = 'patient', ...overrides } = {}) {
  const ts = Date.now()
  const passwordHash = await bcrypt.hash('Test@123', 4) // fast rounds for tests
  return User.create({
    fullName: overrides.fullName || `Test ${role} ${ts}`,
    email: overrides.email || `test-${role}-${ts}@spcms.test`,
    phone: overrides.phone || `900000${ts.toString().slice(-4)}`,
    passwordHash,
    role,
    isActive: true,
    ...overrides,
  })
}

export async function seedPatient(overrides = {}) {
  const ts = Date.now()
  return Patient.create({
    patientCode: `PAT-T-${ts}`,
    fullName: overrides.fullName || `Test Patient ${ts}`,
    dateOfBirth: new Date('1990-01-01'),
    gender: 'male',
    phone: overrides.phone || `800000${ts.toString().slice(-4)}`,
    email: overrides.email || `patient-${ts}@spcms.test`,
    ...overrides,
  })
}

export async function seedDoctor(departmentId, overrides = {}) {
  const ts = Date.now()
  const user = await seedUser({ role: 'doctor', ...overrides })
  const doctor = await Doctor.create({
    userId: user._id,
    doctorCode: `DOC-T-${ts}`,
    fullName: user.fullName,
    specialization: overrides.specialization || 'General Medicine',
    departmentId,
    consultationRoom: overrides.consultationRoom || 'T-101',
    availabilityStatus: 'available',
    averageConsultationMinutes: 10,
    maxQueueThreshold: 10,
    allowAutoAssignment: true,
    scheduleTemplate: [
      { dayOfWeek: 0, startTime: '00:00', endTime: '23:59', slotMinutes: 15, isActive: true },
      { dayOfWeek: 1, startTime: '00:00', endTime: '23:59', slotMinutes: 15, isActive: true },
      { dayOfWeek: 2, startTime: '00:00', endTime: '23:59', slotMinutes: 15, isActive: true },
      { dayOfWeek: 3, startTime: '00:00', endTime: '23:59', slotMinutes: 15, isActive: true },
      { dayOfWeek: 4, startTime: '00:00', endTime: '23:59', slotMinutes: 15, isActive: true },
      { dayOfWeek: 5, startTime: '00:00', endTime: '23:59', slotMinutes: 15, isActive: true },
      { dayOfWeek: 6, startTime: '00:00', endTime: '23:59', slotMinutes: 15, isActive: true },
    ],
    ...overrides,
  })
  await User.findByIdAndUpdate(user._id, { linkedDoctorId: doctor._id })
  return { user, doctor }
}

// ---------------------------------------------------------------------------
// Auth helpers — generate JWT tokens for test requests
// ---------------------------------------------------------------------------

export function tokenFor(user, extras = {}) {
  return signAccessToken({
    sub: user._id.toString(),
    role: user.role,
    linkedPatientId: user.linkedPatientId?.toString() || null,
    linkedDoctorId: user.linkedDoctorId?.toString() || null,
    ...extras,
  })
}

export async function seedAdmin() {
  return seedUser({ role: 'admin' })
}

export async function seedReceptionist() {
  return seedUser({ role: 'receptionist' })
}
