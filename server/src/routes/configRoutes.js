import { Router } from 'express'
import { listSystemConfigs, updateSystemConfig } from '../controllers/configController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth, requireRole('admin'))
router.get('/', listSystemConfigs)
router.patch('/:key', updateSystemConfig)

export default router
