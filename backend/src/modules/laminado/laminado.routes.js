const express = require('express');
const laminadoController = require('./laminado.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

// Catálogo de Especificaciones
// This area guard deliberately does not inherit the global-admin bypass in roleMiddleware.
const areaRoles = (...allowedRoles) => (req, res, next) => {
  const roleCode = (req.user?.role?.code || (typeof req.user?.role === 'string' ? req.user.role : '')).toUpperCase();
  if (['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN'].includes(roleCode) || allowedRoles.includes(roleCode)) return next();
  return res.status(403).json({ success: false, message: 'Acceso restringido al personal autorizado de Laminado.' });
};
const areaView = areaRoles('ADMIN_LAMINADO', 'SUPERVISOR_LAMINADO', 'OPERADOR_LAMINADO');
const areaAdmin = areaRoles('ADMIN_LAMINADO');
const areaProcess = areaRoles('ADMIN_LAMINADO', 'SUPERVISOR_LAMINADO', 'OPERADOR_LAMINADO');
const supervisorOrAdmin = areaRoles('ADMIN_LAMINADO', 'SUPERVISOR_LAMINADO');

router.get('/specifications', areaView, (req, res, next) => laminadoController.getSpecifications(req, res, next));
router.get('/specifications/:id', areaView, (req, res, next) => laminadoController.getSpecificationById(req, res, next));
router.post('/specifications', areaAdmin, (req, res, next) => laminadoController.createSpecification(req, res, next));
router.put('/specifications/:id', areaAdmin, (req, res, next) => laminadoController.updateSpecification(req, res, next));
router.patch('/specifications/:id/toggle', areaAdmin, (req, res, next) => laminadoController.toggleSpecification(req, res, next));

// WIP Interno y Trazabilidad Operativa
router.get('/wip-summary', areaView, (req, res, next) => laminadoController.getWipSummary(req, res, next));
router.post('/wip/assess-roll', supervisorOrAdmin, (req, res, next) => laminadoController.assessRollMaterials(req, res, next));
router.post('/wip/create-odc', supervisorOrAdmin, (req, res, next) => laminadoController.createOdcForRoll(req, res, next));
router.post('/wip/verify-scan', areaProcess, (req, res, next) => laminadoController.verifyScan(req, res, next));
router.post('/wip/transform-roll', areaProcess, (req, res, next) => laminadoController.transformRoll(req, res, next));

module.exports = router;
