import { Notification } from '../models/Notification.js'
import { Patient } from '../models/Patient.js'
import { Doctor } from '../models/Doctor.js'
import { Department } from '../models/Department.js'
import { env } from '../config/env.js'

// ---------------------------------------------------------------------------
// Message template builders
// ---------------------------------------------------------------------------

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function buildAppointmentConfirmationMessage({ patientName, doctorName, appointmentDate, slotStart, hospitalName = 'SPCMS Hospital' }) {
  return (
    `Hello ${patientName},\n` +
    `Your appointment with ${doctorName} is confirmed for ` +
    `${formatDate(appointmentDate)} at ${formatTime(slotStart)}.\n` +
    `Please arrive 10 minutes early.\n` +
    `- ${hospitalName}`
  )
}

export function buildAppointmentReminderMessage({ patientName, doctorName, slotStart }) {
  return (
    `Reminder: Hi ${patientName}, your appointment with ${doctorName} is scheduled today at ${formatTime(slotStart)}.\n` +
    `Please ensure you arrive on time.`
  )
}

export function buildQueueNextMessage({ patientName, doctorName, consultationRoom }) {
  return (
    `Hello ${patientName},\n` +
    `You are next in queue for ${doctorName}.\n` +
    `Please proceed to Consultation Room ${consultationRoom || 'as directed'}.`
  )
}

export function buildQueueAlertMessage({ patientName, doctorName, queuePosition, estimatedWaitMinutes }) {
  return (
    `Hello ${patientName},\n` +
    `Your token for ${doctorName} is now active.\n` +
    `Queue position: ${queuePosition}. Estimated wait: ~${estimatedWaitMinutes} minutes.`
  )
}

export function buildMissedAppointmentMessage({ patientName, doctorName }) {
  return (
    `Hello ${patientName},\n` +
    `You did not arrive within the allotted time for your appointment with ${doctorName}.\n` +
    `Your slot has been skipped. Please contact reception to reschedule.`
  )
}

export function buildDoctorAssignmentMessage({ patientName, doctorName, consultationRoom }) {
  return (
    `Hello ${patientName},\n` +
    `You have been assigned to ${doctorName}.\n` +
    `Consultation Room: ${consultationRoom || 'To be announced'}.`
  )
}

export function buildPrescriptionReadyMessage({ patientName, doctorName }) {
  return (
    `Hello ${patientName},\n` +
    `Your prescription from ${doctorName} is now available.\n` +
    `You can view it in the patient portal.`
  )
}

export function buildCancellationMessage({ patientName, doctorName, appointmentDate }) {
  return (
    `Hello ${patientName},\n` +
    `Your appointment with ${doctorName} on ${formatDate(appointmentDate)} has been cancelled.\n` +
    `Please contact reception if you wish to reschedule.`
  )
}

// ---------------------------------------------------------------------------
// Channel provider abstraction (pluggable)
// ---------------------------------------------------------------------------

async function sendViaSms(recipient, message) {
  const providerEnabled = env.smsProviderEnabled
  const apiKey = env.fast2smsApiKey

  if (providerEnabled && apiKey) {
    // Strip +91 or leading 0 — Fast2SMS expects 10-digit Indian numbers
    const phone = recipient.replace(/^(\+91|91|0)/, '').trim()
    if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      console.warn(`[SMS] Invalid Indian phone number: ${recipient}`)
      return { success: false, providerMessageId: null }
    }

    try {
      const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'q',           // Quick SMS (no DLT registration needed)
          message,
          language: 'english',
          flash: 0,
          numbers: phone,
        }),
      })

      const data = await res.json()

      if (data.return === true) {
        console.log(`[SMS] Sent to ${phone} via Fast2SMS — request_id: ${data.request_id}`)
        return { success: true, providerMessageId: data.request_id }
      }

      console.error(`[SMS] Fast2SMS error:`, data.message || data)
      return { success: false, providerMessageId: null }
    } catch (err) {
      console.error(`[SMS] Fast2SMS request failed:`, err.message)
      return { success: false, providerMessageId: null }
    }
  }

  // Fallback: mock when provider is disabled
  console.log(`[SMS] To: ${recipient} | Message: ${message}`)
  return { success: true, providerMessageId: `sms-mock-${Date.now()}` }
}

async function sendViaWhatsapp(recipient, message) {
  // Integration point for WhatsApp provider (e.g., Twilio WhatsApp, WhatsApp Business API)
  const providerEnabled = env.whatsappProviderEnabled
  if (providerEnabled) {
    // TODO: Replace with actual WhatsApp API call
    // const response = await twilioClient.messages.create({
    //   body: message,
    //   to: `whatsapp:${recipient}`,
    //   from: `whatsapp:${env.whatsappFromNumber}`,
    // })
    // return { success: true, providerMessageId: response.sid }
  }

  console.log(`[WhatsApp] To: ${recipient} | Message: ${message}`)
  return { success: true, providerMessageId: `wa-mock-${Date.now()}` }
}

async function sendViaChannel(channel, recipient, message) {
  switch (channel) {
    case 'sms':
      return sendViaSms(recipient, message)
    case 'whatsapp':
      return sendViaWhatsapp(recipient, message)
    case 'system':
      // System notifications are stored in DB only (for in-app display)
      return { success: true, providerMessageId: null }
    default:
      return { success: true, providerMessageId: null }
  }
}

// ---------------------------------------------------------------------------
// Core notification functions
// ---------------------------------------------------------------------------

/**
 * Create and send a notification.
 * The notification is persisted in the database and dispatched via the chosen channel.
 */
export async function sendNotification({
  patientId,
  appointmentId = null,
  queueTokenId = null,
  consultationId = null,
  prescriptionId = null,
  type = 'general',
  channel = 'system',
  recipient,
  subject = '',
  message,
  scheduledFor = null,
}) {
  const notification = await Notification.create({
    patientId,
    appointmentId,
    queueTokenId,
    consultationId,
    prescriptionId,
    type,
    channel,
    recipient,
    subject,
    message,
    status: scheduledFor ? 'pending' : 'pending',
    scheduledFor,
  })

  // If not scheduled for the future, attempt to send immediately
  if (!scheduledFor) {
    try {
      const result = await sendViaChannel(channel, recipient, message)
      notification.status = result.success ? 'sent' : 'failed'
      notification.providerMessageId = result.providerMessageId
      notification.sentAt = result.success ? new Date() : null
    } catch (error) {
      notification.status = 'failed'
      notification.errorMessage = error.message || 'Unknown send error'
    }
    await notification.save()
  }

  return notification
}

/**
 * Retry a failed notification.
 */
export async function retryNotification(notificationId) {
  const notification = await Notification.findById(notificationId)
  if (!notification) return null
  if (notification.status !== 'failed') return notification

  if (notification.retryCount >= notification.maxRetries) {
    return notification
  }

  notification.retryCount += 1

  try {
    const result = await sendViaChannel(notification.channel, notification.recipient, notification.message)
    notification.status = result.success ? 'sent' : 'failed'
    notification.providerMessageId = result.providerMessageId
    notification.sentAt = result.success ? new Date() : notification.sentAt
    notification.errorMessage = result.success ? null : 'Retry failed'
  } catch (error) {
    notification.status = 'failed'
    notification.errorMessage = error.message || 'Retry send error'
  }

  await notification.save()
  return notification
}

// ---------------------------------------------------------------------------
// Higher-level notification helpers (called from controllers)
// ---------------------------------------------------------------------------

/**
 * Resolve the preferred notification channel for a patient.
 * Falls back to 'system' if no phone number is available.
 */
function resolveChannel(patient) {
  const defaultChannel = env.notificationDefaultChannel || 'system'
  if (!patient?.phone) return 'system'
  return defaultChannel
}

/**
 * Send appointment confirmation notification.
 */
export async function notifyAppointmentConfirmation({ appointment, patient, doctor, department }) {
  const patientName = patient?.fullName || 'Patient'
  const doctorName = doctor?.fullName || 'your doctor'
  const channel = resolveChannel(patient)
  const recipient = patient?.phone || patient?.email || 'system'

  const message = buildAppointmentConfirmationMessage({
    patientName,
    doctorName,
    appointmentDate: appointment.appointmentDate,
    slotStart: appointment.slotStart,
    hospitalName: department?.name || 'SPCMS Hospital',
  })

  return sendNotification({
    patientId: patient._id,
    appointmentId: appointment._id,
    type: 'appointment_confirmation',
    channel,
    recipient,
    subject: 'Appointment Confirmed',
    message,
  })
}

/**
 * Send queue status notification when patient is assigned/queued.
 */
export async function notifyQueueAlert({ queueToken, patient, doctor }) {
  const patientName = patient?.fullName || 'Patient'
  const doctorName = doctor?.fullName || 'your doctor'
  const channel = resolveChannel(patient)
  const recipient = patient?.phone || patient?.email || 'system'

  const message = buildQueueAlertMessage({
    patientName,
    doctorName,
    queuePosition: queueToken.queuePosition,
    estimatedWaitMinutes: queueToken.estimatedWaitMinutes,
  })

  return sendNotification({
    patientId: patient._id,
    queueTokenId: queueToken._id,
    appointmentId: queueToken.appointmentId,
    type: 'queue_alert',
    channel,
    recipient,
    subject: 'Queue Update',
    message,
  })
}

/**
 * Send notification when patient is next in queue (called).
 */
export async function notifyQueueNext({ queueToken, patient, doctor }) {
  const patientName = patient?.fullName || 'Patient'
  const doctorName = doctor?.fullName || 'your doctor'
  const channel = resolveChannel(patient)
  const recipient = patient?.phone || patient?.email || 'system'

  const message = buildQueueNextMessage({
    patientName,
    doctorName,
    consultationRoom: doctor?.consultationRoom,
  })

  return sendNotification({
    patientId: patient._id,
    queueTokenId: queueToken._id,
    appointmentId: queueToken.appointmentId,
    type: 'queue_next',
    channel,
    recipient,
    subject: 'Your Turn is Next',
    message,
  })
}

/**
 * Send missed appointment notification.
 */
export async function notifyMissedAppointment({ queueToken, patient, doctor }) {
  const patientName = patient?.fullName || 'Patient'
  const doctorName = doctor?.fullName || 'your doctor'
  const channel = resolveChannel(patient)
  const recipient = patient?.phone || patient?.email || 'system'

  const message = buildMissedAppointmentMessage({ patientName, doctorName })

  return sendNotification({
    patientId: patient._id,
    queueTokenId: queueToken._id,
    appointmentId: queueToken.appointmentId,
    type: 'missed_appointment',
    channel,
    recipient,
    subject: 'Missed Appointment',
    message,
  })
}

/**
 * Send doctor assignment notification.
 */
export async function notifyDoctorAssignment({ queueToken, patient, doctor }) {
  const patientName = patient?.fullName || 'Patient'
  const doctorName = doctor?.fullName || 'your doctor'
  const channel = resolveChannel(patient)
  const recipient = patient?.phone || patient?.email || 'system'

  const message = buildDoctorAssignmentMessage({
    patientName,
    doctorName,
    consultationRoom: doctor?.consultationRoom,
  })

  return sendNotification({
    patientId: patient._id,
    queueTokenId: queueToken._id,
    appointmentId: queueToken.appointmentId,
    type: 'doctor_assignment',
    channel,
    recipient,
    subject: 'Doctor Assigned',
    message,
  })
}

/**
 * Send prescription ready notification.
 */
export async function notifyPrescriptionReady({ prescription, patient, doctor }) {
  const patientName = patient?.fullName || 'Patient'
  const doctorName = doctor?.fullName || 'your doctor'
  const channel = resolveChannel(patient)
  const recipient = patient?.phone || patient?.email || 'system'

  const message = buildPrescriptionReadyMessage({ patientName, doctorName })

  return sendNotification({
    patientId: patient._id,
    consultationId: prescription.consultationId,
    prescriptionId: prescription._id,
    type: 'prescription_ready',
    channel,
    recipient,
    subject: 'Prescription Available',
    message,
  })
}

/**
 * Send cancellation notification.
 */
export async function notifyCancellation({ appointment, patient, doctor }) {
  const patientName = patient?.fullName || 'Patient'
  const doctorName = doctor?.fullName || 'your doctor'
  const channel = resolveChannel(patient)
  const recipient = patient?.phone || patient?.email || 'system'

  const message = buildCancellationMessage({
    patientName,
    doctorName,
    appointmentDate: appointment.appointmentDate,
  })

  return sendNotification({
    patientId: patient._id,
    appointmentId: appointment._id,
    type: 'cancellation',
    channel,
    recipient,
    subject: 'Appointment Cancelled',
    message,
  })
}
