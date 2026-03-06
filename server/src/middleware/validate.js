import { ApiError } from '../utils/ApiError.js'

/**
 * Creates a middleware that validates required body fields exist and are truthy.
 * Usage: validate({ required: ['patientId', 'departmentId'] })
 */
export function validate({ required = [], bodyType = 'object' } = {}) {
  return function validateMiddleware(req, _res, next) {
    if (bodyType === 'object' && typeof req.body !== 'object') {
      return next(new ApiError(400, 'Request body must be a JSON object'))
    }

    const missing = required.filter((field) => {
      const value = req.body[field]
      return value === undefined || value === null || value === ''
    })

    if (missing.length > 0) {
      return next(
        new ApiError(
          400,
          `Missing required fields: ${missing.join(', ')}`,
          missing.map((field) => ({ field, message: `${field} is required` })),
        ),
      )
    }

    next()
  }
}
