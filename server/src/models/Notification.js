import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    queueTokenId: { type: mongoose.Schema.Types.ObjectId, ref: 'QueueToken', default: null },
    type: {
      type: String,
      enum: [
        'appointment_confirmation',
        'appointment_reminder',
        'queue_alert',
        'doctor_assignment',
        'cancellation',
        'reschedule',
        'general',
      ],
      default: 'general',
    },
    channel: { type: String, enum: ['sms', 'email', 'system'], default: 'system' },
    recipient: { type: String, required: true },
    subject: { type: String, default: '' },
    message: { type: String, required: true },
    status: { type: String, enum: ['pending', 'sent', 'failed', 'delivered'], default: 'sent' },
    providerMessageId: { type: String, default: null },
    errorMessage: { type: String, default: null },
    scheduledFor: { type: Date, default: null },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

export const Notification = mongoose.model('Notification', notificationSchema)
