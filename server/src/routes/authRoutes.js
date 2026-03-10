import { Router } from 'express'
import { getProfile, login, me, registerPatient, updateProfile } from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/register-patient', registerPatient)
router.post('/login', login)
router.get('/me', requireAuth, me)
router.get('/profile', requireAuth, getProfile)
router.patch('/profile', requireAuth, updateProfile)

export default router
