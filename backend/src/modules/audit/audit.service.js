const db = require('../../database/models');

const createAuditLog = async ({
  user,
  action,
  entityType,
  entityId = null,
  module,
  description,
  beforeData = null,
  afterData = null,
  metadata = null,
  req = null,
  transaction = null,
}) => {
  try {
    return await db.AuditLog.create(
      {
        user_id: user?.id || null,
        action,
        entity_type: entityType,
        entity_id: entityId ? String(entityId) : null,
        module,
        description,
        before_data: beforeData,
        after_data: afterData,
        metadata,
        ip_address:
          req?.ip ||
          req?.headers?.['x-forwarded-for'] ||
          req?.socket?.remoteAddress ||
          null,
        user_agent: req?.headers?.['user-agent'] || null,
      },
      { transaction }
    );
  } catch (error) {
    // La auditoría no debe romper la operación principal.
    console.error('[AUDIT_LOG_ERROR]', error.message);
    return null;
  }
};

module.exports = {
  createAuditLog,
};