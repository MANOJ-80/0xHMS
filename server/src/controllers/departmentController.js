import { Department } from '../models/Department.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/response.js'

export const listDepartments = asyncHandler(async (req, res) => {
  const query = {}
  if (req.query.isActive !== undefined) {
    query.isActive = req.query.isActive === 'true'
  } else {
    query.isActive = true
  }

  const departments = await Department.find(query).sort({ name: 1 })
  return sendSuccess(res, 'Departments fetched successfully', { departments })
})

export const getDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id)

  if (!department) {
    throw new ApiError(404, 'Department not found')
  }

  return sendSuccess(res, 'Department fetched successfully', { department })
})

export const createDepartment = asyncHandler(async (req, res) => {
  const { name, code } = req.body

  if (!name || !code) {
    throw new ApiError(400, 'name and code are required')
  }

  const department = await Department.create({
    name,
    code,
    description: req.body.description || '',
  })

  return sendSuccess(res, 'Department created successfully', { department }, 201)
})

export const updateDepartment = asyncHandler(async (req, res) => {
  const allowedFields = ['name', 'code', 'description', 'isActive']
  const updates = {}
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field]
    }
  }

  const department = await Department.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  })

  if (!department) {
    throw new ApiError(404, 'Department not found')
  }

  return sendSuccess(res, 'Department updated successfully', { department })
})
