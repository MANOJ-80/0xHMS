import { Router } from 'express'
import {
  createPrescription,
  getPrescription,
  getPatientPrescriptions,
  listPrescriptions,
  updatePrescription,
} from '../controllers/prescriptionController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)
router.get('/', requireRole('admin', 'doctor', 'receptionist', 'patient'), listPrescriptions)
router.get('/patient/:patientId', requireRole('admin', 'doctor', 'receptionist', 'patient'), getPatientPrescriptions)
router.get('/:id', requireRole('admin', 'doctor', 'receptionist', 'patient'), getPrescription)
router.post('/', requireRole('doctor'), createPrescription)
router.patch('/:id', requireRole('doctor', 'admin'), updatePrescription)

export default router
