import mongoose from 'mongoose'

const consultationSchema = new mongoose.Schema(
  {
    consultationNumber: { type: String, required: true, unique: true, trim: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    queueTokenId: { type: mongoose.Schema.Types.ObjectId, ref: 'QueueToken', required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    status: { type: String, enum: ['in_consultation', 'completed', 'cancelled', 'transferred'], default: 'in_consultation' },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    transferReason: { type: String, default: null },
    consultationNotes: { type: String, default: '' },
  },
  { timestamps: true },
)

consultationSchema.index({ doctorId: 1, status: 1 })
consultationSchema.index({ patientId: 1, createdAt: -1 })
consultationSchema.index({ queueTokenId: 1 })

export const Consultation = mongoose.model('Consultation', consultationSchema)
