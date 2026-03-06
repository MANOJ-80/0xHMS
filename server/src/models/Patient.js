import mongoose from 'mongoose'

const patientSchema = new mongoose.Schema(
  {
    patientCode: { type: String, required: true, unique: true, trim: true },
    mrn: { type: String, trim: true, default: null },
    fullName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: 'prefer_not_to_say',
    },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },
    isActive: { type: Boolean, default: true },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

patientSchema.index({ fullName: 'text', phone: 'text', email: 'text', patientCode: 'text' })

export const Patient = mongoose.model('Patient', patientSchema)
