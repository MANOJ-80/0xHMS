import { Doctor } from '../models/Doctor.js'
import { DoctorAssignment } from '../models/DoctorAssignment.js'
import { QueueToken } from '../models/QueueToken.js'
import { getDoctorQueueStats, recalculateDoctorQueue } from './queueService.js'
import { ApiError } from '../utils/ApiError.js'

/**
 * Validate and return a specific doctor for direct assignment.
 * This is the primary assignment path — receptionist explicitly picks the doctor.
 * Returns { doctor, stats } or null if invalid/inactive.
 */
export async function assignSpecificDoctor(doctorId) {
  if (!doctorId) return null

  const doctor = await Doctor.findById(doctorId)
  if (!doctor || !doctor.isActive) return null

  // Doctor must be in a workable state (available, busy, or overrun)
  const workableStatuses = ['available', 'busy', 'overrun']
  if (!workableStatuses.includes(doctor.availabilityStatus)) return null

  const stats = await getDoctorQueueStats(doctor._id)
  return { doctor, stats }
}

async function getEligibleDoctors({ departmentId, specialization }) {
  const query = {
    departmentId,
    isActive: true,
    allowAutoAssignment: true,
    availabilityStatus: { $in: ['available', 'busy', 'overrun'] },
  }

  if (specialization && specialization !== 'General') {
    query.specialization = specialization
  }

  return Doctor.find(query).sort({ fullName: 1 })
}

/**
 * Legacy auto-assignment fallback. Kept for edge-cases but the primary flow
 * now uses assignSpecificDoctor via receptionist's explicit choice.
 */
export async function findBestDoctor({ departmentId, specialization, preferredDoctorId = null }) {
  const doctors = await getEligibleDoctors({ departmentId, specialization })
  if (!doctors.length) return null

  // If a preferred doctor was requested, check capacity
  if (preferredDoctorId) {
    const preferred = doctors.find((doctor) => doctor._id.toString() === preferredDoctorId.toString())
    if (preferred) {
      const stats = await getDoctorQueueStats(preferred._id)
      if (stats.activeQueueCount < preferred.maxQueueThreshold) {
        return { doctor: preferred, stats }
      }
      // preferred doctor is over threshold — fall through to best-available
    }
  }

  // Score all doctors: fetch stats in parallel
  const scoredDoctors = await Promise.all(
    doctors.map(async (doctor) => ({
      doctor,
      stats: await getDoctorQueueStats(doctor._id),
    })),
  )

  // Filter out doctors that have reached their max queue threshold
  const available = scoredDoctors.filter(
    ({ doctor, stats }) => stats.activeQueueCount < doctor.maxQueueThreshold,
  )

  // If every doctor is over threshold, allow the least loaded anyway (graceful degradation)
  const candidates = available.length > 0 ? available : scoredDoctors

  candidates.sort((left, right) => {
    if (left.stats.estimatedWaitMinutes !== right.stats.estimatedWaitMinutes) {
      return left.stats.estimatedWaitMinutes - right.stats.estimatedWaitMinutes
    }
    return left.stats.activeQueueCount - right.stats.activeQueueCount
  })

  return candidates[0] ?? null
}

export async function logAssignment({
  queueTokenId,
  patientId,
  appointmentId,
  departmentId,
  specialization,
  assignedDoctorId,
  previousDoctorId = null,
  assignedByType = 'system',
  assignedBy = null,
  decisionReason = '',
  estimatedWaitBefore = null,
  estimatedWaitAfter = null,
  assignmentType = 'initial',
}) {
  const assignment = await DoctorAssignment.create({
    queueTokenId,
    patientId,
    appointmentId,
    departmentId,
    specialization,
    assignedDoctorId,
    previousDoctorId,
    assignedByType,
    assignedBy,
    decisionReason,
    estimatedWaitBefore,
    estimatedWaitAfter,
    assignmentType,
  })

  await recalculateDoctorQueue(assignedDoctorId)
  return assignment
}

export async function assignQueueTokenToDoctor({
  queueTokenId,
  doctorId,
  assignedByType = 'system',
  assignedBy = null,
  decisionReason = 'manual assignment',
  assignmentType = 'reassignment',
}) {
  const queueToken = await QueueToken.findById(queueTokenId)
  if (!queueToken) return null

  // Prevent reassignment of tokens in terminal or active consultation states
  if (['completed', 'missed', 'in_consultation'].includes(queueToken.queueStatus)) {
    throw new ApiError(400, `Cannot reassign token in status: ${queueToken.queueStatus}`)
  }

  const previousDoctorId = queueToken.assignedDoctorId
  const previousStats = previousDoctorId ? await getDoctorQueueStats(previousDoctorId) : null
  const nextStats = await getDoctorQueueStats(doctorId)

  queueToken.assignedDoctorId = doctorId
  queueToken.queueStatus = 'assigned'
  await queueToken.save()

  await logAssignment({
    queueTokenId: queueToken._id,
    patientId: queueToken.patientId,
    appointmentId: queueToken.appointmentId,
    departmentId: queueToken.departmentId,
    specialization: queueToken.specialization,
    assignedDoctorId: doctorId,
    previousDoctorId,
    assignedByType,
    assignedBy,
    decisionReason,
    estimatedWaitBefore: previousStats?.estimatedWaitMinutes ?? null,
    estimatedWaitAfter: nextStats.estimatedWaitMinutes,
    assignmentType,
  })

  if (previousDoctorId) {
    await recalculateDoctorQueue(previousDoctorId)
  }

  return queueToken
}
