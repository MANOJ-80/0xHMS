import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['admin', 'doctor', 'receptionist', 'patient'],
      required: true,
    },
    linkedPatientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', default: null },
    linkedDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
    refreshTokenVersion: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash
        delete ret.__v
        return ret
      },
    },
    toObject: {
      transform(_doc, ret) {
        delete ret.passwordHash
        delete ret.__v
        return ret
      },
    },
  },
)

userSchema.index({ role: 1, isActive: 1 })
userSchema.index({ linkedPatientId: 1 }, { sparse: true })
userSchema.index({ linkedDoctorId: 1 }, { sparse: true })

export const User = mongoose.model('User', userSchema)
