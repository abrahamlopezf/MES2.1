const express = require('express');
const laminadoController = require('./laminado.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

// Catálogo de Especificaciones
const areaView = roleMiddleware('ADMIN_LAMINADO', 'SUPERVISOR_LAMINADO', 'OPERADOR_LAMINADO');
const areaAdmin = roleMiddleware('ADMIN_LAMINADO');
const areaProcess = roleMiddleware('ADMIN_LAMINADO', 'SUPERVISOR_LAMINADO', 'OPERADOR_LAMINADO');
const supervisorOrAdmin = roleMiddleware('ADMIN_LAMINADO', 'SUPERVISOR_LAMINADO');

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
