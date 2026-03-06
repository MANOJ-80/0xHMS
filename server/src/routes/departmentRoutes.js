import { Router } from 'express'
import {
  createDepartment,
  getDepartment,
  listDepartments,
  updateDepartment,
} from '../controllers/departmentController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// Public
router.get('/', listDepartments)

// Authenticated
router.use(requireAuth)
router.get('/:id', requireRole('admin', 'receptionist'), getDepartment)
router.post('/', requireRole('admin'), createDepartment)
router.patch('/:id', requireRole('admin'), updateDepartment)

export default router
