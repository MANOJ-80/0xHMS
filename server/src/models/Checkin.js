import mongoose from 'mongoose'

const checkinSchema = new mongoose.Schema(
  {
    checkinNumber: { type: String, required: true, unique: true, trim: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    arrivedAt: { type: Date, default: Date.now },
    checkinMethod: { type: String, enum: ['reception', 'kiosk', 'qr', 'self_service'], default: 'reception' },
    isWalkIn: { type: Boolean, default: false },
    urgencyLevel: { type: String, enum: ['normal', 'urgent'], default: 'normal' },
    status: { type: String, enum: ['checked_in', 'queued', 'completed', 'cancelled', 'expired'], default: 'checked_in' },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
)

checkinSchema.index({ patientId: 1, createdAt: -1 })
checkinSchema.index({ departmentId: 1, status: 1 })

// RACE-3: Partial unique index to prevent duplicate active check-ins for the same patient
// This ensures that only one 'checked_in' status can exist per patient at a time
checkinSchema.index(
  { patientId: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: 'checked_in' }
  }
)
// Separate partial index for 'queued' status
checkinSchema.index(
  { patientId: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: 'queued' },
    name: 'patientId_status_queued_unique'
  }
)

export const Checkin = mongoose.model('Checkin', checkinSchema)
