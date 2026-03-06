/**
 * Shared Socket.IO emission helper.
 * Centralises all real-time pushes so controllers don't duplicate the pattern.
 */

export function emitQueueUpdate(req, { departmentId, doctorId, patientId } = {}) {
  const io = req.app.get('io')
  if (!io) return

  if (departmentId) io.to(`department:${departmentId}`).emit('queue:updated')
  if (doctorId) io.to(`doctor:${doctorId}`).emit('queue:updated')
  if (patientId) io.to(`patient:${patientId}`).emit('queue:updated')
}
