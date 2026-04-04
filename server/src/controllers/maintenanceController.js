import mongoose from 'mongoose'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'

const TRANSACTIONAL_COLLECTIONS = [
  'appointments',
  'queuetokens',
  'checkins',
  'consultations',
  'prescriptions',
  'doctorassignments',
  'notifications',
  'auditlogs',
]

export const purgeTransactionalData = asyncHandler(async (req, res) => {
  const db = mongoose.connection.db
  const results = {}

  for (const col of TRANSACTIONAL_COLLECTIONS) {
    try {
      const r = await db.collection(col).deleteMany({})
      results[col] = r.deletedCount
    } catch (e) {
      results[col] = `error: ${e.message}`
    }
  }

  return sendSuccess(res, 'All transactional data purged successfully', { purged: results })
})
