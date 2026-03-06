export function generateCode(prefix) {
  const stamp = Date.now().toString().slice(-8)
  const random = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}-${stamp}${random}`
}
