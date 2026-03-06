import { Router } from 'express'
import {
  createDoctor,
  getDoctor,
  getDoctorQueue,
  getDoctorSlots,
  listDoctors,
  updateAvailability,
  updateDoctor,
} from '../controllers/doctorController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// Public
router.get('/', listDoctors)
router.get('/:id/slots', getDoctorSlots)

// Authenticated
router.use(requireAuth)
router.get('/:id', requireRole('admin', 'receptionist', 'doctor'), getDoctor)
router.get('/:id/queue', requireRole('admin', 'receptionist', 'doctor'), getDoctorQueue)
router.post('/', requireRole('admin'), createDoctor)
router.patch('/:id', requireRole('admin'), updateDoctor)
router.patch('/:id/availability', requireRole('admin', 'doctor'), updateAvailability)

export default router
