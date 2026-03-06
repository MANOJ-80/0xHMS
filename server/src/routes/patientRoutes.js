import { Router } from 'express'
import {
  createPatient,
  getPatient,
  listPatients,
  updatePatient,
} from '../controllers/patientController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)
router.get('/', requireRole('admin', 'doctor', 'receptionist'), listPatients)
router.post('/', requireRole('admin', 'receptionist'), createPatient)
router.get('/:id', requireRole('admin', 'doctor', 'receptionist', 'patient'), getPatient)
router.patch('/:id', requireRole('admin', 'receptionist'), updatePatient)

export default router
