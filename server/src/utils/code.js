import crypto from 'crypto'

// Counter to ensure uniqueness within the same millisecond
let counter = 0
let lastTimestamp = 0

/**
 * Generate a unique code with format: PREFIX-TIMESTAMP-RANDOM
 * Uses crypto for better randomness and counter for same-ms collisions
 */
export function generateCode(prefix) {
  const now = Date.now()
  
  // Reset counter if we're in a new millisecond
  if (now !== lastTimestamp) {
    counter = 0
    lastTimestamp = now
  } else {
    counter++
  }
  
  // Use crypto for better randomness
  const randomBytes = crypto.randomBytes(4).toString('hex').toUpperCase()
  const stamp = now.toString(36).toUpperCase()
  
  // Include counter if multiple codes generated in same ms
  const suffix = counter > 0 ? `-${counter}` : ''
  
  return `${prefix}-${stamp}${randomBytes}${suffix}`
}

/**
 * Generate a unique patient code
 */
export function generatePatientCode() {
  return generateCode('PAT')
}

/**
 * Generate a unique doctor code with initials
 */
export function generateDoctorCode(fullName) {
  const parts = (fullName || '').trim().split(/\s+/)
  const initials = parts.map(p => (p[0] || '').toUpperCase()).join('')
  const randomBytes = crypto.randomBytes(3).toString('hex').toUpperCase()
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase()
  return `DOC-${initials || 'XX'}-${timestamp}${randomBytes}`
}
