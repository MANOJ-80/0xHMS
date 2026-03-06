import mongoose from 'mongoose'

const transferHistorySchema = new mongoose.Schema(
  {
    fromDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    toDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    reason: { type: String, default: '' },
    transferredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    transferredAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const queueTokenSchema = new mongoose.Schema(
  {
    tokenNumber: { type: String, required: true, unique: true, trim: true },
    tokenSequence: { type: Number, required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    checkinId: { type: mongoose.Schema.Types.ObjectId, ref: 'Checkin', required: true },
    assignedDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    specialization: { type: String, required: true, trim: true },
    queueType: { type: String, enum: ['scheduled', 'walk_in'], required: true },
    priorityLevel: { type: String, enum: ['normal', 'urgent'], default: 'normal' },
    queueStatus: {
      type: String,
      enum: ['waiting', 'assigned', 'called', 'in_consultation', 'transferred', 'completed', 'missed'],
      default: 'waiting',
    },
    queuePosition: { type: Number, default: 0 },
    estimatedWaitMinutes: { type: Number, default: 0 },
    predictedConsultationStart: { type: Date, default: null },
    actualCalledAt: { type: Date, default: null },
    actualConsultationStartAt: { type: Date, default: null },
    actualConsultationEndAt: { type: Date, default: null },
    transferHistory: { type: [transferHistorySchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

queueTokenSchema.index({ assignedDoctorId: 1, queueStatus: 1, isActive: 1 })
queueTokenSchema.index({ departmentId: 1, queueStatus: 1, isActive: 1 })
queueTokenSchema.index({ patientId: 1, isActive: 1 })

export const QueueToken = mongoose.model('QueueToken', queueTokenSchema)
