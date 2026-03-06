import { Router } from 'express'
import { getDashboardReport, getOverview } from '../controllers/reportController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/overview', getOverview)
router.get('/dashboard', requireAuth, requireRole('admin'), getDashboardReport)

export default router
