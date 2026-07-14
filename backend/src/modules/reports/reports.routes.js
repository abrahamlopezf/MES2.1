const express = require('express');
const router = express.Router();
const reportsController = require('./reports.controller');
const { requireAuth, requireRoles } = require('../../shared/middlewares/auth.middleware');
const { SUPERADMIN_ROLE_CODE } = require('../../shared/security/accessRules');

// Todos los reportes requieren autenticación y rol (SUPERADMIN, ADMIN o FINANZAS)
// Por ahora usamos SUPERADMIN y ADMIN. Si FINANZAS tiene su propio rol_code, agregarlo aquí (ej. 'FINANZAS')
router.use(requireAuth);
router.use(requireRoles([SUPERADMIN_ROLE_CODE, 'ADMIN', 'FINANZAS']));

// Rutas de Reportes
router.get('/inventory', reportsController.getInventory);
router.get('/purchases', reportsController.getPurchases);
router.get('/production/yield', reportsController.getYield);
router.get('/scrap', reportsController.getScrap);
router.get('/traceability/:qrCodeId', reportsController.getTraceability);

module.exports = router;
