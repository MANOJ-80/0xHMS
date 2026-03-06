import { AuditLog } from '../models/AuditLog.js'

export async function createAuditLog({ req, actorId = null, actorRole = 'system', action, entityType, entityId = null, metadata = {} }) {
  return AuditLog.create({
    actorId,
    actorRole,
    action,
    entityType,
    entityId,
    metadata,
    ipAddress: req?.ip || null,
    userAgent: req?.get?.('user-agent') || null,
  })
}
