import mongoose from 'mongoose'
import { sendSuccess } from '../utils/response.js'

export function getHealth(req, res) {
  return sendSuccess(res, 'Server is healthy', {
    service: 'SPCMS API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    databaseState: mongoose.connection.readyState,
  })
}
