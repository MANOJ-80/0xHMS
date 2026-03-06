import { AuditLog } from '../models/AuditLog.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'

export const listAuditLogs = asyncHandler(async (req, res) => {
  const logs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(200)
  return sendSuccess(res, 'Audit logs fetched successfully', { logs })
})
