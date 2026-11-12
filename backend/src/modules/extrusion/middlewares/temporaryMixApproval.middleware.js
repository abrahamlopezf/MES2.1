const jwt = require('jsonwebtoken');
const env = require('../../../config/env');

const consumedApprovals = new Map();
const allowedRoles = new Set(['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN']);

const requireTemporaryMixApproval = (req, res, next) => {
  // This is a temporary local-test gate. Production behavior remains unchanged.
  if (env.nodeEnv === 'production') return next();

  const token = req.get('x-extrusion-mix-approval');
  if (!token) {
    return res.status(403).json({
      success: false,
      code: 'EXTRUSION_MIX_ADMIN_APPROVAL_REQUIRED',
      message: 'Se requiere autorización temporal de Admin o Superadmin para preparar la mezcla.',
    });
  }

  try {
    const approval = jwt.verify(token, env.jwt.secret);
    const roleCode = String(approval.approverRoleCode || '').toUpperCase();
    if (approval.purpose !== 'TEMP_OPERATION_APPROVAL'
      || approval.operation !== 'EXTRUSION_MIX_PREPARATION'
      || Number(approval.actorUserId) !== Number(req.user?.id)
      || !allowedRoles.has(roleCode)
      || !approval.jti) {
      throw new Error('Approval claim mismatch');
    }

    const now = Date.now();
    for (const [jti, expiresAt] of consumedApprovals) {
      if (expiresAt <= now) consumedApprovals.delete(jti);
    }
    if (consumedApprovals.has(approval.jti)) {
      return res.status(403).json({ success: false, code: 'EXTRUSION_MIX_ADMIN_APPROVAL_USED', message: 'La autorización ya fue utilizada. Solicita una nueva confirmación.' });
    }
    consumedApprovals.set(approval.jti, Number(approval.exp) * 1000);
    req.mixApproval = {
      approver_user_id: Number(approval.approverUserId),
      approver_username: approval.approverUsername,
      approver_role_code: roleCode,
      approved_at: new Date().toISOString(),
      approval_id: approval.jti,
      operation: approval.operation,
      temporary: true,
    };
    return next();
  } catch (_error) {
    return res.status(403).json({ success: false, code: 'EXTRUSION_MIX_ADMIN_APPROVAL_INVALID', message: 'La autorización expiró o no es válida. Confirma nuevamente con Admin o Superadmin.' });
  }
};

module.exports = requireTemporaryMixApproval;
