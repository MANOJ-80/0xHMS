import { Router } from 'express'
import { login, me, registerPatient } from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/register-patient', registerPatient)
router.post('/login', login)
router.get('/me', requireAuth, me)

export default router
