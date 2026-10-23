const express = require('express');
const extrusionController = require('./extrusion.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');

const router = express.Router();

const authenticate = authMiddleware.authenticate || authMiddleware.authMiddleware || authMiddleware;
const authorizePermission = permissionMiddleware.authorizePermission || permissionMiddleware.requirePermission || permissionMiddleware;

// Control de acceso: Superadmin, Admin General o roles operativos de extrusión
const requireExtrusionAccess = (req, res, next) => {
  const roleCode = req.user?.role?.code || (typeof req.user?.role === 'string' ? req.user.role : '');
  const areaId = req.user?.areaId || req.user?.area_id || req.user?.role?.area_id || req.user?.role?.area?.id;
  const allowedRoles = ['SUPERADMIN', 'ADMIN_GRAL', 'ADMIN_GENERAL', 'ADMIN', 'SUPERVISOR_EXTRUSION', 'SUPERVISOR'];
  if (allowedRoles.includes(roleCode) || areaId === 2) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Acceso restringido: El módulo de extrusión requiere permisos de SUPERADMIN, ADMIN_GRAL o SUPERVISOR_EXTRUSION.'
  });
};

router.use(authenticate);
router.use(requireExtrusionAccess);

// Formulas
router.get('/formulas', authorizePermission('extrusion.formulas.view', 'extrusion.formulas.read'), extrusionController.getFormulas);
router.get('/formulas/:id', authorizePermission('extrusion.formulas.view', 'extrusion.formulas.read'), extrusionController.getFormulaDetails);
router.get('/wip-child-qr/:qrCode', authorizePermission('extrusion.formulas.view', 'extrusion.formulas.read'), extrusionController.getWipChildQr);

router.post('/mix', authorizePermission('extrusion.formulas.manage'), extrusionController.mixFormula);
router.get('/mix-history', authorizePermission('extrusion.formulas.view', 'extrusion.formulas.read'), extrusionController.getPreparedMixHistory);
router.get('/mix/containers/:identifier', authorizePermission('extrusion.formulas.view', 'extrusion.formulas.read'), extrusionController.getMixContainersByQrOrFolio);
router.post('/mix-requests', authorizePermission('extrusion.formulas.manage'), extrusionController.createMixRequest);
router.get('/mix-requests', authorizePermission('extrusion.formulas.view', 'extrusion.formulas.read'), extrusionController.getMixRequests);

// ==========================================
// PISO DE EXTRUSIÓN & CONTROL DE COLAS & SCRAP
// ==========================================
router.post('/queue/switch', extrusionController.switchQueue);
router.post('/rack/scan', extrusionController.scanRack);
router.get('/queue', extrusionController.getQueues);
router.post('/queue/enqueue', extrusionController.enqueueMix);
router.get('/racks', extrusionController.getRacks);
router.post('/racks', extrusionController.createRack);
// Piso de formulas y edicion de indice de multiplicacion
router.get('/floor-formulas', extrusionController.getExtrusionFormulas);
router.get('/floor-formulas/:id', extrusionController.getFormulaById);
router.put('/floor-formulas/:id', extrusionController.updateFormula);
router.put('/formulas/:id', extrusionController.updateFormula);

// Catalogo de PTI (Carretes / Bobinas Salientes)
router.get('/pti-products', extrusionController.getPtiProducts);
router.get('/pti-products/:id', extrusionController.getPtiProductById);
router.post('/pti-products', extrusionController.createPtiProduct);
router.put('/pti-products/:id', extrusionController.updatePtiProduct);
router.delete('/pti-products/:id', extrusionController.deletePtiProduct);

// Merma / Scrap y Balance de Masa
router.post('/scrap', extrusionController.registerScrap);
router.get('/scrap-logs', extrusionController.getScrapLogs);
router.get('/mass-balance/:mixQr', extrusionController.getMassBalance);

// Precios de Rack / PTI y Valorización (Puntos 3, 5, 6, 7)
router.put('/racks/:id/price', extrusionController.updatePtiRackPrice);
router.get('/valuation', extrusionController.getExtrusionValuation);

// División de contenedores y transiciones espontáneas (Puntos 2, 4)
router.post('/mix/split-containers', extrusionController.splitMixtureContainers);
router.post('/mixture-transition', extrusionController.recordMixtureTransition);

// ==========================================
// CATÁLOGO DE MÁQUINAS (EXTRUSORAS) & SILOS (FASE 2)
// ==========================================
router.get('/machines', extrusionController.getMachines);
router.put('/machines/:id/modo-silo', extrusionController.toggleModoSilo);
router.put('/machines/:id/silo', extrusionController.assignExtruderSilo);
router.get('/silos', extrusionController.getSilos);
router.post('/silos/invoice-entry', extrusionController.receiveSiloInvoiceEntry);

module.exports = router;

