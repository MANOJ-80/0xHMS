import { Router } from 'express'
import {
  getNotification,
  getNotificationStats,
  listNotifications,
  retryFailedNotification,
  sendManualNotification,
} from '../controllers/notificationController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)
router.get('/stats', requireRole('admin'), getNotificationStats)
router.get('/', requireRole('admin', 'receptionist', 'doctor', 'patient'), listNotifications)
router.get('/:id', requireRole('admin', 'receptionist', 'doctor', 'patient'), getNotification)
router.post('/send', requireRole('admin', 'receptionist'), sendManualNotification)
router.patch('/:id/retry', requireRole('admin'), retryFailedNotification)

export default router
