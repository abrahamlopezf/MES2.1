const express = require('express');

const healthRoutes = require('../modules/health/health.routes');
const authRoutes = require('../modules/auth/auth.routes');

const usersRoutes = require('../modules/users/users.routes');
const rolesRoutes = require('../modules/roles/roles.routes');
const permissionsRoutes = require('../modules/permissions/permissions.routes');

const areasRoutes = require('../modules/areas/areas.routes');

const qrcodesRoutes = require('../modules/qrcodes/qrcodes.routes');
const materialRoutes = require('../modules/materials/material/material.routes');
const warehouseRoutes = require('../modules/warehouse/warehouse.routes');

const materialFamilyRoutes = require('../modules/materials/materialFamily/materialFamily.routes');
const materialCodeRoutes = require('../modules/materials/materialCode/materialCode.routes');
const materialBrandRoutes = require('../modules/materials/materialBrand/materialBrand.routes');
const materialTypeRoutes = require('../modules/materials/materialType/materialType.routes');
const operationalAreaRoutes = require('../modules/materials/operationalArea/operationalArea.routes');

const traceabilityRoutes = require('../modules/traceability/traceability.routes');

const reportsRoutes = require('../modules/reports/reports.routes');
const dashboardRoutes = require('../modules/dashboard/dashboard.routes');
const receptionRoutes = require('../modules/reception/reception.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/roles', rolesRoutes);
router.use('/permissions', permissionsRoutes);
router.use('/areas', areasRoutes);
router.use('/qr', qrcodesRoutes);
router.use('/materials', materialRoutes);
router.use('/warehouse', warehouseRoutes);

// Nuevos Catálogos Fase 3
router.use('/material-families', materialFamilyRoutes);
router.use('/material-codes', materialCodeRoutes);
router.use('/material-brands', materialBrandRoutes);
router.use('/material-types', materialTypeRoutes);
router.use('/operational-areas', operationalAreaRoutes);
router.use('/traceability', traceabilityRoutes);

router.use('/reports', reportsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reception', receptionRoutes);

module.exports = router;