import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    queueTokenId: { type: mongoose.Schema.Types.ObjectId, ref: 'QueueToken', default: null },
    consultationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation', default: null },
    prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription', default: null },
    type: {
      type: String,
      enum: [
        'appointment_confirmation',
        'appointment_reminder',
        'queue_alert',
        'queue_next',
        'doctor_assignment',
        'cancellation',
        'reschedule',
        'missed_appointment',
        'prescription_ready',
        'general',
      ],
      default: 'general',
    },
    channel: { type: String, enum: ['sms', 'whatsapp', 'email', 'system'], default: 'system' },
    recipient: { type: String, required: true },
    subject: { type: String, default: '' },
    message: { type: String, required: true },
    status: { type: String, enum: ['pending', 'sent', 'failed', 'delivered'], default: 'pending' },
    providerMessageId: { type: String, default: null },
    errorMessage: { type: String, default: null },
    scheduledFor: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
  },
  { timestamps: true },
)

notificationSchema.index({ patientId: 1, createdAt: -1 })
notificationSchema.index({ status: 1, scheduledFor: 1 })
notificationSchema.index({ appointmentId: 1 })
notificationSchema.index({ type: 1, createdAt: -1 })

export const Notification = mongoose.model('Notification', notificationSchema)
