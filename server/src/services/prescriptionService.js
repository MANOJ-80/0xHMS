import { Prescription } from '../models/Prescription.js'
import { generateCode } from '../utils/code.js'

/**
 * Create a prescription record linked to a consultation.
 */
export async function createPrescriptionRecord({
  patientId,
  doctorId,
  consultationId,
  appointmentId = null,
  departmentId,
  diagnosis,
  medicines,
  treatmentNotes = '',
  followUpDate = null,
  followUpInstructions = '',
  doctorSignature = '',
  hospitalName = 'SPCMS Hospital',
}) {
  const prescription = await Prescription.create({
    prescriptionNumber: generateCode('RX'),
    patientId,
    doctorId,
    consultationId,
    appointmentId,
    departmentId,
    diagnosis,
    medicines,
    treatmentNotes,
    followUpDate,
    followUpInstructions,
    doctorSignature,
    hospitalName,
  })

  return prescription
}
