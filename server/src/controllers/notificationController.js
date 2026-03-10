import { Notification } from '../models/Notification.js'
import { sendNotification, retryNotification } from '../services/notificationService.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'

/**
 * List notifications with optional filters.
 * GET /api/v1/notifications
 */
export const listNotifications = asyncHandler(async (req, res) => {
  const { patientId, type, channel, status } = req.query
  const query = {}

  if (patientId) query.patientId = patientId
  if (type) query.type = type
  if (channel) query.channel = channel
  if (status) query.status = status

  // Patients can only see their own notifications
  if (req.user?.role === 'patient') {
    if (!req.user.linkedPatientId) {
      throw new ApiError(403, 'Patient account not linked')
    }
    query.patientId = req.user.linkedPatientId
  }

  const notifications = await Notification.find(query)
    .populate('patientId', 'fullName patientCode phone')
    .sort({ createdAt: -1 })
    .limit(100)

  return sendSuccess(res, 'Notifications fetched successfully', { notifications })
})

/**
 * Get a single notification by ID.
 * GET /api/v1/notifications/:id
 */
export const getNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id)
    .populate('patientId', 'fullName patientCode phone')

  if (!notification) {
    throw new ApiError(404, 'Notification not found')
  }

  // Access scoping: patients can only view their own notifications
  if (req.user?.role === 'patient') {
    if (!req.user.linkedPatientId || notification.patientId?._id?.toString() !== req.user.linkedPatientId.toString()) {
      throw new ApiError(403, 'You can only view your own notifications')
    }
  }

  return sendSuccess(res, 'Notification fetched successfully', { notification })
})

/**
 * Send a manual/ad-hoc notification.
 * POST /api/v1/notifications/send
 */
export const sendManualNotification = asyncHandler(async (req, res) => {
  const { patientId, type, channel, recipient, subject, message } = req.body

  if (!patientId || !message || !recipient) {
    throw new ApiError(400, 'patientId, recipient, and message are required')
  }

  const notification = await sendNotification({
    patientId,
    type: type || 'general',
    channel: channel || 'system',
    recipient,
    subject: subject || '',
    message,
  })

  return sendSuccess(res, 'Notification sent successfully', { notification }, 201)
})

/**
 * Retry a failed notification.
 * PATCH /api/v1/notifications/:id/retry
 */
export const retryFailedNotification = asyncHandler(async (req, res) => {
  // Check retry limits BEFORE attempting the retry
  const existing = await Notification.findById(req.params.id)
  if (!existing) {
    throw new ApiError(404, 'Notification not found')
  }
  if (existing.status !== 'failed') {
    throw new ApiError(400, 'Only failed notifications can be retried')
  }
  if (existing.retryCount >= existing.maxRetries) {
    throw new ApiError(400, 'Maximum retry attempts reached for this notification')
  }

  const notification = await retryNotification(req.params.id)

  return sendSuccess(res, 'Notification retry processed', { notification })
})

/**
 * Get notification statistics/summary.
 * GET /api/v1/notifications/stats
 */
export const getNotificationStats = asyncHandler(async (req, res) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [total, sent, failed, pending] = await Promise.all([
    Notification.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
    Notification.countDocuments({ status: 'sent', createdAt: { $gte: today, $lt: tomorrow } }),
    Notification.countDocuments({ status: 'failed', createdAt: { $gte: today, $lt: tomorrow } }),
    Notification.countDocuments({ status: 'pending', createdAt: { $gte: today, $lt: tomorrow } }),
  ])

  return sendSuccess(res, 'Notification stats fetched successfully', {
    stats: { total, sent, failed, pending, delivered: total - sent - failed - pending },
  })
})
