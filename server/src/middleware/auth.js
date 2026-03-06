import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export function requireAuth(req, res, next) {
  const authorization = req.headers.authorization

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      errors: [],
    })
  }

  const token = authorization.split(' ')[1]

  try {
    const decoded = jwt.verify(token, env.jwtAccessSecret)
    req.user = decoded
    next()
  } catch {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      errors: [],
    })
  }
}

export function requireRole(...allowedRoles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
        errors: [],
      })
    }

    next()
  }
}
