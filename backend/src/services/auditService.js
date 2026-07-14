import { AuditLog } from '../config/jsonDatabase.js'
import logger from '../utils/logger.js'

export async function recordAudit({ projectId, userId, action, details, ip }) {
  try {
    await AuditLog.create({ projectId, userId, action, details, ip })
    logger.info('Audit recorded', { action, projectId: projectId?.toString() })
  } catch (err) {
    logger.error('Failed to record audit', { error: err.message, action })
  }
}
