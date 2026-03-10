import { Router } from 'express'
import {
  createDoctor,
  getDoctor,
  getDoctorAppointments,
  getDoctorQueue,
  getDoctorSlots,
  listDoctors,
  updateAvailability,
  updateDoctor,
} from '../controllers/doctorController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// Authenticated
router.use(requireAuth)
router.get('/', listDoctors)
router.get('/:id/slots', getDoctorSlots)
router.get('/:id', requireRole('admin', 'receptionist', 'doctor'), getDoctor)
router.get('/:id/queue', requireRole('admin', 'receptionist', 'doctor'), getDoctorQueue)
router.get('/:id/appointments', requireRole('admin', 'receptionist', 'doctor'), getDoctorAppointments)
router.post('/', requireRole('admin'), createDoctor)
router.patch('/:id', requireRole('admin', 'doctor'), updateDoctor)
router.patch('/:id/availability', requireRole('admin', 'doctor'), updateAvailability)

export default router
