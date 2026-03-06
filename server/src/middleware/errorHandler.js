export function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500
  let message = err.message || 'Internal server error'
  let errors = err.errors || []

  // Mongoose ValidationError → 400
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = 'Validation failed'
    errors = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }))
  }

  // Mongoose CastError (invalid ObjectId, etc.) → 400
  if (err.name === 'CastError') {
    statusCode = 400
    message = `Invalid value for ${err.path}: ${err.value}`
  }

  // MongoDB duplicate key error → 409
  if (err.code === 11000) {
    statusCode = 409
    const field = Object.keys(err.keyPattern || {})[0] || 'field'
    message = `Duplicate value for ${field}`
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Invalid token'
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Token has expired'
  }

  // Log unexpected server errors
  if (statusCode >= 500 && process.env.NODE_ENV !== 'test') {
    console.error('[ERROR]', err.stack || err.message)
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
  })
}
