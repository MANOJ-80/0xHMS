import { Router } from 'express'
import {
  cancelAppointment,
  createAppointment,
  getAppointment,
  getAvailableSlots,
  listAppointments,
} from '../controllers/appointmentController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// Public
router.get('/available-slots', getAvailableSlots)

// Authenticated
router.use(requireAuth)
router.get('/', requireRole('admin', 'doctor', 'receptionist', 'patient'), listAppointments)
router.get('/:id', requireRole('admin', 'doctor', 'receptionist', 'patient'), getAppointment)
router.post('/', requireRole('admin', 'receptionist', 'patient'), createAppointment)
router.patch('/:id/cancel', requireRole('admin', 'receptionist', 'patient'), cancelAppointment)

export default router
