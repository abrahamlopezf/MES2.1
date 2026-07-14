const express = require('express');
const router = express.Router();
const reportsController = require('./reports.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');
const { SUPERADMIN_ROLE_CODE } = require('../../shared/security/accessRules');

// Todos los reportes requieren autenticación y permisos de visualización
// Por simplicidad en esta demo, validaremos que esté autenticado (authMiddleware).
// Y validaremos si tiene algún permiso o rol requerido usando la info en req.user
router.use(authMiddleware);

// Middleware para verificar que sea SUPERADMIN, ADMIN o FINANZAS
const requireRole = (req, res, next) => {
  const userRole = req.user?.role?.code || '';
  if (['SUPERADMIN', 'ADMIN', 'FINANZAS'].includes(userRole)) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Acceso denegado. Se requiere rol gerencial.' });
};
router.use(requireRole);

// Rutas de Reportes
router.get('/inventory', reportsController.getInventory);
router.get('/purchases', reportsController.getPurchases);
router.get('/production/yield', reportsController.getYield);
router.get('/scrap', reportsController.getScrap);
router.get('/traceability/:qrCodeId', reportsController.getTraceability);

module.exports = router;
