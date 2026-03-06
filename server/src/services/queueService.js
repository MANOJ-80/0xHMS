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

  const averageMinutes = doctor.averageConsultationMinutes || 15

  for (let index = 0; index < queueTokens.length; index += 1) {
    const token = queueTokens[index]
    token.queuePosition = index + 1
    token.estimatedWaitMinutes = index * averageMinutes
    token.predictedConsultationStart = new Date(Date.now() + token.estimatedWaitMinutes * 60 * 1000)
    await token.save()
  }

  return queueTokens
}

export async function getDoctorQueueStats(doctorId) {
  const doctor = await Doctor.findById(doctorId)
  if (!doctor) {
    return { activeQueueCount: Number.MAX_SAFE_INTEGER, estimatedWaitMinutes: Number.MAX_SAFE_INTEGER }
  }

  const activeQueueCount = await QueueToken.countDocuments({
    assignedDoctorId: doctorId,
    queueStatus: { $in: ['waiting', 'assigned', 'called', 'in_consultation'] },
    isActive: true,
  })

  return {
    activeQueueCount,
    estimatedWaitMinutes: activeQueueCount * (doctor.averageConsultationMinutes || 15),
  }
}
