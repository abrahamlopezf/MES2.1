const express = require('express');

const formulasController = require('./formulas.controller');
const processPreparationRoutes = require('./processPreparation.routes');

const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');

const authenticate =
  authMiddleware.authenticate ||
  authMiddleware.protect ||
  authMiddleware.verifyToken ||
  authMiddleware;

const authorizePermission =
  permissionMiddleware.authorizePermission ||
  permissionMiddleware.requirePermission ||
  permissionMiddleware;
const denySupervisorFormulaCatalogAccess = (req, res, next) => {
  const roleCode = String(req.user?.role?.code || req.user?.role?.name || '').toUpperCase();
  if (roleCode.startsWith('SUPERVISOR')) {
    return res.status(403).json({ success: false, message: 'El catálogo general de fórmulas no está habilitado para supervisores. Consulta el catálogo de tu área.' });
  }
  return next();
};

if (typeof authenticate !== 'function') {
  throw new Error(
    'No se pudo resolver el middleware de autenticación en formulas.routes.js'
  );
}

if (typeof authorizePermission !== 'function') {
  throw new Error(
    'No se pudo resolver el middleware de permisos en formulas.routes.js'
  );
}

const router = express.Router();

router.get(
  '/',
  authenticate,
  denySupervisorFormulaCatalogAccess,
  authorizePermission('formulas.read'),
  formulasController.listFormulas
);

router.get(
  '/:id',
  authenticate,
  denySupervisorFormulaCatalogAccess,
  authorizePermission('formulas.read'),
  formulasController.getFormulaById
);

router.post(
  '/',
  authenticate,
  denySupervisorFormulaCatalogAccess,
  authorizePermission('formulas.manage'),
  formulasController.createFormula
);

router.put(
  '/:id',
  authenticate,
  denySupervisorFormulaCatalogAccess,
  authorizePermission('formulas.manage'),
  formulasController.updateFormula
);

router.patch(
  '/:id/deactivate',
  authenticate,
  denySupervisorFormulaCatalogAccess,
  authorizePermission('formulas.manage'),
  formulasController.deactivateFormula
);

router.use('/preparations', processPreparationRoutes);

module.exports = router;
