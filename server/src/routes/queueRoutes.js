import { Router } from 'express'
import {
  assignQueueToken,
  listQueueTokens,
  markQueueTokenCalled,
  markQueueTokenMissed,
  updateQueuePriority,
} from '../controllers/queueController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// All queue routes require authentication (no more public board)
router.use(requireAuth)
router.get('/tokens', requireRole('admin', 'doctor', 'receptionist', 'patient'), listQueueTokens)
router.patch('/tokens/:id/assign', requireRole('admin', 'receptionist'), assignQueueToken)
router.patch('/tokens/:id/call', requireRole('admin', 'receptionist', 'doctor'), markQueueTokenCalled)
router.patch('/tokens/:id/miss', requireRole('admin', 'receptionist', 'doctor'), markQueueTokenMissed)
router.patch('/tokens/:id/priority', requireRole('admin', 'receptionist', 'doctor'), updateQueuePriority)

export default router
