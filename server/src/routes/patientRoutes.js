import { Router } from 'express'
import {
  createPatient,
  getPatient,
  listPatients,
  updatePatient,
} from '../controllers/patientController.js'
import { getPatientHistory } from '../controllers/patientHistoryController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)
router.get('/', requireRole('admin', 'doctor', 'receptionist'), listPatients)
router.post('/', requireRole('admin', 'receptionist'), createPatient)
router.get('/:id', requireRole('admin', 'doctor', 'receptionist', 'patient'), getPatient)
router.get('/:id/history', requireRole('admin', 'doctor', 'receptionist', 'patient'), getPatientHistory)
router.patch('/:id', requireRole('admin', 'receptionist'), updatePatient)

export default router
