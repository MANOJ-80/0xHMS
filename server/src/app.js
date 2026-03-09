import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import appointmentRoutes from './routes/appointmentRoutes.js'
import auditRoutes from './routes/auditRoutes.js'
import authRoutes from './routes/authRoutes.js'
import checkinRoutes from './routes/checkinRoutes.js'
import consultationRoutes from './routes/consultationRoutes.js'
import configRoutes from './routes/configRoutes.js'
import departmentRoutes from './routes/departmentRoutes.js'
import doctorRoutes from './routes/doctorRoutes.js'
import healthRoutes from './routes/healthRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import patientRoutes from './routes/patientRoutes.js'
import prescriptionRoutes from './routes/prescriptionRoutes.js'
import queueRoutes from './routes/queueRoutes.js'
import reportRoutes from './routes/reportRoutes.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'
import { env } from './config/env.js'

export function createApp() {
  const app = express()

  const allowedOrigins = env.clientUrl
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  app.use(
    cors({
      origin(origin, callback) {
        // Allow requests with no origin (server-to-server, curl, health checks)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true)
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`))
        }
      },
      credentials: true,
    }),
  )
  app.use(helmet())
  app.use(morgan('dev'))
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(cookieParser())

  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Welcome to the SPCMS API',
    })
  })

  app.use('/api/v1/health', healthRoutes)
  app.use('/api/v1/auth', authRoutes)
  app.use('/api/v1/departments', departmentRoutes)
  app.use('/api/v1/patients', patientRoutes)
  app.use('/api/v1/doctors', doctorRoutes)
  app.use('/api/v1/appointments', appointmentRoutes)
  app.use('/api/v1/checkins', checkinRoutes)
  app.use('/api/v1/queue', queueRoutes)
  app.use('/api/v1/consultations', consultationRoutes)
  app.use('/api/v1/prescriptions', prescriptionRoutes)
  app.use('/api/v1/notifications', notificationRoutes)
  app.use('/api/v1/reports', reportRoutes)
  app.use('/api/v1/system-configs', configRoutes)
  app.use('/api/v1/audit-logs', auditRoutes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
