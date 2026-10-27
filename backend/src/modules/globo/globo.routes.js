const express = require('express');
const globoController = require('./globo.controller');
const authMiddleware = require('../../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

// Catálogo de Especificaciones
// This area guard deliberately does not inherit the global-admin bypass in roleMiddleware.
const areaRoles = (...allowedRoles) => (req, res, next) => {
  const roleCode = (req.user?.role?.code || (typeof req.user?.role === 'string' ? req.user.role : '')).toUpperCase();
  if (['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN'].includes(roleCode) || allowedRoles.includes(roleCode)) return next();
  return res.status(403).json({ success: false, message: 'Acceso restringido al personal autorizado de Globo.' });
};
const areaView = areaRoles('ADMIN_GLOBO', 'SUPERVISOR_GLOBO', 'OPERADOR_GLOBO');
const areaAdmin = areaRoles('ADMIN_GLOBO');
const areaProcess = areaRoles('ADMIN_GLOBO', 'SUPERVISOR_GLOBO', 'OPERADOR_GLOBO');
const supervisorOrAdmin = areaRoles('ADMIN_GLOBO', 'SUPERVISOR_GLOBO');

router.get('/specifications', areaView, (req, res, next) => globoController.getSpecifications(req, res, next));
router.get('/specifications/:id', areaView, (req, res, next) => globoController.getSpecificationById(req, res, next));
router.post('/specifications', areaAdmin, (req, res, next) => globoController.createSpecification(req, res, next));
router.put('/specifications/:id', areaAdmin, (req, res, next) => globoController.updateSpecification(req, res, next));
router.patch('/specifications/:id/toggle', areaAdmin, (req, res, next) => globoController.toggleSpecification(req, res, next));

// WIP Interno y Trazabilidad Operativa
router.get('/wip-summary', areaView, (req, res, next) => globoController.getWipSummary(req, res, next));
router.post('/wip/assess-roll', supervisorOrAdmin, (req, res, next) => globoController.assessRollMaterials(req, res, next));
router.post('/wip/create-odc', supervisorOrAdmin, (req, res, next) => globoController.createOdcForRoll(req, res, next));
router.post('/wip/verify-scan', areaProcess, (req, res, next) => globoController.verifyScan(req, res, next));
router.post('/wip/transform-roll', areaProcess, (req, res, next) => globoController.transformRoll(req, res, next));

module.exports = router;
