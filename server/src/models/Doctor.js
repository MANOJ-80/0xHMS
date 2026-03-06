import mongoose from 'mongoose'

const doctorScheduleSchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    breakStart: { type: String, default: null },
    breakEnd: { type: String, default: null },
    slotMinutes: { type: Number, default: 15 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
)

const doctorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    doctorCode: { type: String, required: true, unique: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    specialization: { type: String, required: true, trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    consultationRoom: { type: String, default: '' },
    availabilityStatus: {
      type: String,
      enum: ['available', 'busy', 'on_break', 'offline', 'overrun'],
      default: 'offline',
    },
    maxQueueThreshold: { type: Number, default: 10 },
    averageConsultationMinutes: { type: Number, default: 15 },
    allowAutoAssignment: { type: Boolean, default: true },
    scheduleTemplate: { type: [doctorScheduleSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

doctorSchema.index({ departmentId: 1, isActive: 1, availabilityStatus: 1 })
doctorSchema.index({ specialization: 1, isActive: 1 })

export const Doctor = mongoose.model('Doctor', doctorSchema)
