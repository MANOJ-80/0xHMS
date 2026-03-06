import { SystemConfig } from '../models/SystemConfig.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'

export const listSystemConfigs = asyncHandler(async (req, res) => {
  const configs = await SystemConfig.find({}).sort({ key: 1 })
  return sendSuccess(res, 'System configs fetched successfully', { configs })
})

export const updateSystemConfig = asyncHandler(async (req, res) => {
  const config = await SystemConfig.findOneAndUpdate(
    { key: req.params.key },
    {
      value: req.body.value,
      description: req.body.description,
      updatedBy: req.user?.sub || null,
    },
    { new: true, upsert: true },
  )

  return sendSuccess(res, 'System config updated successfully', { config })
})
