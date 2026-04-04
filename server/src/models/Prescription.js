import mongoose from 'mongoose'

const medicineItemSchema = new mongoose.Schema(
  {
    medicineName: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    frequency: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    reasonForChosen: { type: String, required: true, trim: true },
    route: { type: String, default: 'oral', trim: true },
    instructions: { type: String, default: '', trim: true },
  },
  { _id: false },
)

const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionNumber: { type: String, required: true, unique: true, trim: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    consultationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    diagnosis: { type: String, required: true, trim: true },
    medicines: { type: [medicineItemSchema], required: true, validate: [arr => arr.length > 0, 'At least one medicine is required'] },
    treatmentNotes: { type: String, default: '', trim: true },
    followUpDate: { type: Date, default: null },
    followUpInstructions: { type: String, default: '', trim: true },
    doctorSignature: { type: String, default: '', trim: true },
    hospitalName: { type: String, default: 'SPCMS Hospital', trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

prescriptionSchema.index({ patientId: 1, createdAt: -1 })
prescriptionSchema.index({ doctorId: 1, createdAt: -1 })
// RACE-5: Make consultationId unique to prevent duplicate prescriptions for the same consultation
prescriptionSchema.index({ consultationId: 1 }, { unique: true })

export const Prescription = mongoose.model('Prescription', prescriptionSchema)
