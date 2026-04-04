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

/**
 * BIZ-5: Calculate actual average wait time from QueueToken data
 * Wait time = actualConsultationStartAt - createdAt (when patient was checked in)
 */
async function calculateAverageWaitMinutes() {
  const today = todayRange()
  
  // Get tokens that have started consultation today (have actual wait time data)
  const tokensWithWaitTime = await QueueToken.find({
    actualConsultationStartAt: today,
    createdAt: { $exists: true },
  }).select('createdAt actualConsultationStartAt')

  if (tokensWithWaitTime.length === 0) {
    // Fallback: estimate based on current queue if no completed data
    const [activeQueueLength, doctorsActive] = await Promise.all([
      QueueToken.countDocuments({
        queueStatus: { $in: ['waiting', 'assigned', 'called'] },
        isActive: true,
      }),
      Doctor.countDocuments({
        isActive: true,
        availabilityStatus: { $in: ['available', 'busy', 'overrun'] },
      }),
    ])
    // Estimate: average 10 min per patient, distributed across active doctors
    return activeQueueLength > 0 && doctorsActive > 0
      ? Math.round((activeQueueLength * 10) / doctorsActive)
      : 0
  }

  // Calculate actual average wait time
  const totalWaitMs = tokensWithWaitTime.reduce((sum, token) => {
    const waitMs = new Date(token.actualConsultationStartAt) - new Date(token.createdAt)
    return sum + Math.max(0, waitMs)
  }, 0)

  const averageWaitMs = totalWaitMs / tokensWithWaitTime.length
  return Math.round(averageWaitMs / (1000 * 60)) // Convert to minutes
}

async function buildOverview() {
  const today = todayRange()

  const [activeQueueLength, checkedInToday, doctorsActive, urgentCases, completedConsultationsToday, averageWaitMinutes] =
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
      calculateAverageWaitMinutes(),
    ])

  return {
    activeQueueLength,
    checkedInToday,
    doctorsActive,
    urgentCases,
    completedConsultations: completedConsultationsToday,
    averageWaitMinutes,
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
