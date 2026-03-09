import bcrypt from 'bcryptjs'
import { connectDatabase } from '../config/db.js'
import { Department } from '../models/Department.js'
import { Doctor } from '../models/Doctor.js'
import { Patient } from '../models/Patient.js'
import { SystemConfig } from '../models/SystemConfig.js'
import { User } from '../models/User.js'

async function upsertUser({ fullName, email, phone, password, role }) {
  const passwordHash = await bcrypt.hash(password, 10)

  return User.findOneAndUpdate(
    { email },
    { fullName, email, phone, passwordHash, role, isActive: true },
    { new: true, upsert: true },
  )
}

async function seed() {
  await connectDatabase()

  const department = await Department.findOneAndUpdate(
    { code: 'OPD' },
    {
      name: 'Outpatient Department',
      code: 'OPD',
      description: 'Primary outpatient consultation department',
      isActive: true,
    },
    { new: true, upsert: true },
  )

  const admin = await upsertUser({
    fullName: 'System Admin',
    email: 'admin@spcms.local',
    phone: '1000000000',
    password: 'Admin@123',
    role: 'admin',
  })

  await upsertUser({
    fullName: 'Front Desk Reception',
    email: 'reception@spcms.local',
    phone: '1000000001',
    password: 'Reception@123',
    role: 'receptionist',
  })

  const doctorUsers = await Promise.all([
    upsertUser({ fullName: 'Dr. Arun Rao', email: 'arun.rao@spcms.local', phone: '1000000002', password: 'Doctor@123', role: 'doctor' }),
    upsertUser({ fullName: 'Dr. Sara Iqbal', email: 'sara.iqbal@spcms.local', phone: '1000000003', password: 'Doctor@123', role: 'doctor' }),
    upsertUser({ fullName: 'Dr. Njeri Singh', email: 'njeri.singh@spcms.local', phone: '1000000004', password: 'Doctor@123', role: 'doctor' }),
  ])

  const doctorProfiles = [
    { user: doctorUsers[0], doctorCode: 'DOC-RAO', specialization: 'General Medicine', consultationRoom: 'A-101' },
    { user: doctorUsers[1], doctorCode: 'DOC-IQB', specialization: 'Cardiology', consultationRoom: 'B-204' },
    { user: doctorUsers[2], doctorCode: 'DOC-NJS', specialization: 'Dermatology', consultationRoom: 'C-112' },
  ]

  for (const profile of doctorProfiles) {
    const doctor = await Doctor.findOneAndUpdate(
      { doctorCode: profile.doctorCode },
      {
        userId: profile.user._id,
        doctorCode: profile.doctorCode,
        fullName: profile.user.fullName,
        specialization: profile.specialization,
        departmentId: department._id,
        consultationRoom: profile.consultationRoom,
        availabilityStatus: 'available',
        averageConsultationMinutes: 15,
        maxQueueThreshold: 10,
        allowAutoAssignment: true,
        scheduleTemplate: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '16:00', breakStart: '12:30', breakEnd: '13:00', slotMinutes: 15, isActive: true },
          { dayOfWeek: 2, startTime: '09:00', endTime: '16:00', breakStart: '12:30', breakEnd: '13:00', slotMinutes: 15, isActive: true },
          { dayOfWeek: 3, startTime: '09:00', endTime: '16:00', breakStart: '12:30', breakEnd: '13:00', slotMinutes: 15, isActive: true },
          { dayOfWeek: 4, startTime: '09:00', endTime: '16:00', breakStart: '12:30', breakEnd: '13:00', slotMinutes: 15, isActive: true },
          { dayOfWeek: 5, startTime: '09:00', endTime: '16:00', breakStart: '12:30', breakEnd: '13:00', slotMinutes: 15, isActive: true },
        ],
      },
      { new: true, upsert: true },
    )

    await User.findByIdAndUpdate(profile.user._id, { linkedDoctorId: doctor._id })
  }

  // Seed patients
  const patientData = [
    { fullName: 'John Doe', email: 'john.doe@example.com', phone: '9000000001', gender: 'male', patientCode: 'PAT-001' },
    { fullName: 'Jane Smith', email: 'jane.smith@example.com', phone: '9000000002', gender: 'female', patientCode: 'PAT-002' },
    { fullName: 'Alice Johnson', email: 'alice.j@example.com', phone: '9000000003', gender: 'female', patientCode: 'PAT-003' },
  ]
  
  for (const p of patientData) {
    const patientUser = await upsertUser({
      fullName: p.fullName,
      email: p.email,
      phone: p.phone,
      password: 'Patient@123',
      role: 'patient'
    })
    
    const patient = await Patient.findOneAndUpdate(
      { email: p.email },
      { ...p, dateOfBirth: new Date('1990-01-01') },
      { new: true, upsert: true }
    )
    
    await User.findByIdAndUpdate(patientUser._id, { linkedPatientId: patient._id })
  }

  const defaultConfigs = [
    { key: 'queue.noShowGraceMinutes', value: 15, description: 'Minutes before a checked-in patient is marked missed.' },
    { key: 'assignment.reassignThresholdMinutes', value: 15, description: 'Minimum wait reduction required to reassign a patient.' },
    { key: 'hospital.defaultSlotMinutes', value: 15, description: 'Default doctor slot duration in minutes.' },
    { key: 'notification.defaultChannel', value: 'system', description: 'Default notification channel: system | sms | whatsapp.' },
    { key: 'notification.maxRetries', value: 3, description: 'Maximum retry attempts for failed notifications.' },
    { key: 'notification.smsEnabled', value: false, description: 'Whether SMS delivery is enabled.' },
    { key: 'notification.whatsappEnabled', value: false, description: 'Whether WhatsApp delivery is enabled.' },
  ]

  for (const config of defaultConfigs) {
    await SystemConfig.findOneAndUpdate(
      { key: config.key },
      { ...config, updatedBy: admin._id },
      { new: true, upsert: true },
    )
  }

  console.log('Seed completed successfully')
  process.exit(0)
}

seed().catch((error) => {
  console.error('Seed failed', error)
  process.exit(1)
})
