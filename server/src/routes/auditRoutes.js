import { Router } from 'express'
import { listAuditLogs } from '../controllers/auditController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth, requireRole('admin'))
router.get('/', listAuditLogs)

export default router
