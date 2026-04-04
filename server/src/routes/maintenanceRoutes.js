import { Router } from 'express'
import { purgeTransactionalData } from '../controllers/maintenanceController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth, requireRole('admin'))
router.delete('/purge', purgeTransactionalData)

export default router
