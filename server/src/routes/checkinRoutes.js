import { Router } from 'express'
import { createCheckin, listCheckins } from '../controllers/checkinController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)
router.get('/', requireRole('admin', 'receptionist'), listCheckins)
router.post('/', requireRole('admin', 'receptionist', 'patient'), createCheckin)

export default router
