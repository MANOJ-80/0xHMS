import { Router } from 'express'
import { completeConsultation, startConsultation, listConsultations } from '../controllers/consultationController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)
router.get('/', requireRole('admin', 'receptionist', 'doctor'), listConsultations)
router.post('/start', requireRole('doctor'), startConsultation)
router.patch('/:id/complete', requireRole('doctor'), completeConsultation)

export default router
