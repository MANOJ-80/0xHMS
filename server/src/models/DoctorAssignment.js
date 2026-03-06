import mongoose from 'mongoose'

const doctorAssignmentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    queueTokenId: { type: mongoose.Schema.Types.ObjectId, ref: 'QueueToken', required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    specialization: { type: String, required: true, trim: true },
    assignmentType: { type: String, enum: ['initial', 'reassignment', 'transfer'], default: 'initial' },
    assignedDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    previousDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
    decisionReason: { type: String, default: '' },
    estimatedWaitBefore: { type: Number, default: null },
    estimatedWaitAfter: { type: Number, default: null },
    assignedByType: { type: String, enum: ['system', 'doctor', 'receptionist', 'admin', 'patient'], default: 'system' },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

doctorAssignmentSchema.index({ queueTokenId: 1 })
doctorAssignmentSchema.index({ assignedDoctorId: 1, createdAt: -1 })

export const DoctorAssignment = mongoose.model('DoctorAssignment', doctorAssignmentSchema)
