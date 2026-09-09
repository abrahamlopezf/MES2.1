const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');
const DashboardController = require('./dashboard.controller');

const authenticate = authMiddleware.authenticate || authMiddleware.authMiddleware || authMiddleware;
const authorizePermission = permissionMiddleware.authorizePermission || permissionMiddleware.requirePermission || permissionMiddleware;

// Require authentication and 'dashboard.read' permission strictly
router.get('/operations', authenticate, authorizePermission('dashboard.read'), DashboardController.getOperationsDashboard);

// Require 'dashboard.financial' (which only SUPERADMIN/ADMIN_GENERAL have via bypass or explicit grant)
router.get('/financial', authenticate, authorizePermission('dashboard.financial'), DashboardController.getFinancialDashboard);

module.exports = router;
