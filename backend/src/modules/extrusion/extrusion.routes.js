const express = require('express');
const extrusionController = require('./extrusion.controller');
const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');

const router = express.Router();

const authenticate = authMiddleware.authenticate || authMiddleware.authMiddleware || authMiddleware;
const authorizePermission = permissionMiddleware.authorizePermission || permissionMiddleware.requirePermission || permissionMiddleware;

router.use(authenticate);

// Formulas
router.get('/formulas', authorizePermission('extrusion.formulas.read'), extrusionController.getFormulas);
router.get('/formulas/:id', authorizePermission('extrusion.formulas.read'), extrusionController.getFormulaDetails);

router.post('/mix', authorizePermission('extrusion.formulas.manage'), extrusionController.mixFormula);
router.post('/mix-requests', authorizePermission('extrusion.formulas.manage'), extrusionController.createMixRequest);
router.get('/mix-requests', authorizePermission('extrusion.formulas.read'), extrusionController.getMixRequests);

// Middleware temporal: Acceso exclusivo a Superadmin para piso de extrusión
const requireSuperAdmin = (req, res, next) => {
  const roleCode = req.user?.role?.code;
  if (roleCode !== 'SUPERADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Acceso restringido: Esta funcionalidad de piso de extrusión está disponible únicamente para SUPERADMIN por el momento.'
    });
  }
  return next();
};

// ==========================================
// PISO DE EXTRUSIÓN & CONTROL DE COLAS (FASE 2) - EXCLUSIVO SUPERADMIN
// ==========================================
router.post('/queue/switch', requireSuperAdmin, extrusionController.switchQueue);
router.post('/rack/scan', requireSuperAdmin, extrusionController.scanRack);
router.get('/queue', requireSuperAdmin, extrusionController.getQueues);
router.post('/queue/enqueue', requireSuperAdmin, extrusionController.enqueueMix);
router.get('/racks', requireSuperAdmin, extrusionController.getRacks);
router.get('/floor-formulas', requireSuperAdmin, extrusionController.getExtrusionFormulas);

module.exports = router;
