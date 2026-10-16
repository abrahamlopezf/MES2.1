const express = require('express');
const extrusionController = require('./extrusion.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');

const router = express.Router();

const authenticate = authMiddleware.authenticate || authMiddleware.authMiddleware || authMiddleware;
const authorizePermission = permissionMiddleware.authorizePermission || permissionMiddleware.requirePermission || permissionMiddleware;

// Middleware temporal: Acceso exclusivo a Superadmin para módulo de extrusión
const requireSuperAdmin = (req, res, next) => {
  const roleCode = req.user?.role?.code || (typeof req.user?.role === 'string' ? req.user.role : '');
  if (roleCode !== 'SUPERADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Acceso restringido: El módulo de extrusión está disponible únicamente para SUPERADMIN por el momento.'
    });
  }
  return next();
};

router.use(authenticate);
router.use(requireSuperAdmin);

// Formulas
router.get('/formulas', authorizePermission('extrusion.formulas.read'), extrusionController.getFormulas);
router.get('/formulas/:id', authorizePermission('extrusion.formulas.read'), extrusionController.getFormulaDetails);

router.post('/mix', authorizePermission('extrusion.formulas.manage'), extrusionController.mixFormula);
router.post('/mix-requests', authorizePermission('extrusion.formulas.manage'), extrusionController.createMixRequest);
router.get('/mix-requests', authorizePermission('extrusion.formulas.read'), extrusionController.getMixRequests);

// ==========================================
// PISO DE EXTRUSIÓN & CONTROL DE COLAS (FASE 2) - EXCLUSIVO SUPERADMIN
// ==========================================
router.post('/queue/switch', extrusionController.switchQueue);
router.post('/rack/scan', extrusionController.scanRack);
router.get('/queue', extrusionController.getQueues);
router.post('/queue/enqueue', extrusionController.enqueueMix);
router.get('/racks', extrusionController.getRacks);
router.get('/floor-formulas', extrusionController.getExtrusionFormulas);

module.exports = router;

