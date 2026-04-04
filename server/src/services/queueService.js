import { Doctor } from '../models/Doctor.js'
import { QueueToken } from '../models/QueueToken.js'

export async function recalculateDoctorQueue(doctorId) {
  if (!doctorId) return []

  const doctor = await Doctor.findById(doctorId)
  if (!doctor) return []

  const queueTokens = await QueueToken.find({
    assignedDoctorId: doctorId,
    queueStatus: { $in: ['waiting', 'assigned', 'called'] },
    isActive: true,
  }).sort({ priorityLevel: -1, createdAt: 1 })

  if (queueTokens.length === 0) return []

  const averageMinutes = doctor.averageConsultationMinutes || 15

  // Build bulk operations to update all tokens in a single database call
  const bulkOps = queueTokens.map((token, index) => ({
    updateOne: {
      filter: { _id: token._id },
      update: {
        $set: {
          queuePosition: index + 1,
          estimatedWaitMinutes: index * averageMinutes,
          predictedConsultationStart: new Date(Date.now() + index * averageMinutes * 60 * 1000),
        },
      },
    },
  }))

  await QueueToken.bulkWrite(bulkOps)

  // Update local objects for return value
  queueTokens.forEach((token, index) => {
    token.queuePosition = index + 1
    token.estimatedWaitMinutes = index * averageMinutes
    token.predictedConsultationStart = new Date(Date.now() + index * averageMinutes * 60 * 1000)
  })

  return queueTokens
}

export async function getDoctorQueueStats(doctorId) {
  const doctor = await Doctor.findById(doctorId)
  if (!doctor) {
    return { activeQueueCount: Number.MAX_SAFE_INTEGER, estimatedWaitMinutes: Number.MAX_SAFE_INTEGER }
  }

  // Count only tokens that are waiting (not yet in consultation)
  // This is consistent with recalculateDoctorQueue which also excludes 'in_consultation'
  const activeQueueCount = await QueueToken.countDocuments({
    assignedDoctorId: doctorId,
    queueStatus: { $in: ['waiting', 'assigned', 'called'] },
    isActive: true,
  })

  return {
    activeQueueCount,
    estimatedWaitMinutes: activeQueueCount * (doctor.averageConsultationMinutes || 15),
  }
}
