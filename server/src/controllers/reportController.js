import { Checkin } from '../models/Checkin.js'
import { Consultation } from '../models/Consultation.js'
import { Doctor } from '../models/Doctor.js'
import { QueueToken } from '../models/QueueToken.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { $gte: start, $lt: end }
}

async function buildOverview() {
  const today = todayRange()

  const [activeQueueLength, checkedInToday, doctorsActive, urgentCases, completedConsultationsToday] =
    await Promise.all([
      QueueToken.countDocuments({
        queueStatus: { $in: ['waiting', 'assigned', 'called', 'in_consultation'] },
        isActive: true,
      }),
      Checkin.countDocuments({ createdAt: today }),
      Doctor.countDocuments({
        isActive: true,
        availabilityStatus: { $in: ['available', 'busy', 'overrun'] },
      }),
      QueueToken.countDocuments({
        priorityLevel: 'urgent',
        queueStatus: { $in: ['waiting', 'assigned', 'called', 'in_consultation'] },
        isActive: true,
      }),
      Consultation.countDocuments({ status: 'completed', completedAt: today }),
    ])

  return {
    activeQueueLength,
    checkedInToday,
    doctorsActive,
    urgentCases,
    completedConsultations: completedConsultationsToday,
    averageWaitMinutes: activeQueueLength
      ? Math.max(8, Math.round((activeQueueLength * 12) / Math.max(doctorsActive, 1)))
      : 0,
  }
}

export const getOverview = asyncHandler(async (req, res) => {
  const overview = await buildOverview()
  return sendSuccess(res, 'Overview fetched successfully', { overview })
})

export const getDashboardReport = asyncHandler(async (req, res) => {
  const overview = await buildOverview()
  const doctorsByAvailability = await Doctor.aggregate([
    { $group: { _id: '$availabilityStatus', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ])

  return sendSuccess(res, 'Dashboard report fetched successfully', {
    overview,
    doctorsByAvailability,
  })
})
