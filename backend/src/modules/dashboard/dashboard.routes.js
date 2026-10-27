const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');
const requireFinancialAccess = require('../../middlewares/financialAccess.middleware');
const DashboardController = require('./dashboard.controller');

const authenticate = authMiddleware.authenticate || authMiddleware.authMiddleware || authMiddleware;
const authorizePermission = permissionMiddleware.authorizePermission || permissionMiddleware.requirePermission || permissionMiddleware;
const executiveOnly = (req, res, next) => {
  const roleCode = (req.user?.role?.code || (typeof req.user?.role === 'string' ? req.user.role : '')).toUpperCase();
  if (['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN'].includes(roleCode)) return next();
  return res.status(403).json({ success: false, message: 'El resumen consolidado requiere rol ADMIN o SUPERADMIN.' });
};

// Require authentication and 'dashboard.read' permission strictly
router.get('/operations', authenticate, authorizePermission('dashboard.read'), DashboardController.getOperationsDashboard);
router.get('/area-overview', authenticate, executiveOnly, DashboardController.getAreaOperationsOverview);

router.get('/financial', authenticate, requireFinancialAccess, DashboardController.getFinancialDashboard);

module.exports = router;
