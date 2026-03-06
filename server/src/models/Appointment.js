import mongoose from 'mongoose'

const appointmentSchema = new mongoose.Schema(
  {
    appointmentNumber: { type: String, required: true, unique: true, trim: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    specialization: { type: String, required: true, trim: true },
    bookingType: { type: String, enum: ['doctor', 'specialization'], required: true },
    visitType: { type: String, enum: ['scheduled', 'walk_in'], default: 'scheduled' },
    appointmentDate: { type: Date, required: true },
    slotStart: { type: Date, required: true },
    slotEnd: { type: Date, required: true },
    status: {
      type: String,
      enum: ['scheduled', 'checked_in', 'cancelled', 'rescheduled', 'no_show', 'completed'],
      default: 'scheduled',
    },
    bookingSource: {
      type: String,
      enum: ['patient_portal', 'receptionist', 'admin'],
      default: 'patient_portal',
    },
    preferredDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
    reassignedDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
    cancellationReason: { type: String, default: null },
    rescheduledFromAppointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

appointmentSchema.index({ patientId: 1, status: 1 })
appointmentSchema.index({ doctorId: 1, appointmentDate: 1, status: 1 })
appointmentSchema.index({ departmentId: 1, appointmentDate: 1 })

export const Appointment = mongoose.model('Appointment', appointmentSchema)
