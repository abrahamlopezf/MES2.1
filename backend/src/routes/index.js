const express = require('express');

const healthRoutes = require('../modules/health/health.routes');
const authRoutes = require('../modules/auth/auth.routes');

const usersRoutes = require('../modules/users/users.routes');
const rolesRoutes = require('../modules/roles/roles.routes');
const permissionsRoutes = require('../modules/permissions/permissions.routes');

const areasRoutes = require('../modules/areas/areas.routes');

const qrcodesRoutes = require('../modules/qrcodes/qrcodes.routes');
const materialsRoutes = require('../modules/materials/materials.routes');

const traceabilityRoutes = require('../modules/traceability/traceability.routes');
const formulasRoutes = require('../modules/formulas/formulas.routes');

const intermediateRoutes = require('../modules/intermediate/intermediate.routes');
const scrapRoutes = require('../modules/scrap/scrap.routes');
const scrapDashboardRoutes = require('../modules/scrap/scrap.dashboard.routes');
const scrapReportRoutes = require('../modules/scrap/scrap.report.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/roles', rolesRoutes);
router.use('/permissions', permissionsRoutes);
router.use('/areas', areasRoutes);
router.use('/qr', qrcodesRoutes);
router.use('/materials', materialsRoutes);
router.use('/traceability', traceabilityRoutes);
router.use('/formulas', formulasRoutes);
router.use('/intermediate', intermediateRoutes);
router.use('/scrap/dashboard', scrapDashboardRoutes);
router.use('/scrap/reports', scrapReportRoutes);
router.use('/scrap', scrapRoutes);

module.exports = router;