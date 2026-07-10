const express = require('express');

const formulasController = require('./formulas.controller');

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
  authorizePermission('formulas.read'),
  formulasController.listFormulas
);

router.get(
  '/:id',
  authenticate,
  authorizePermission('formulas.read'),
  formulasController.getFormulaById
);

router.post(
  '/',
  authenticate,
  authorizePermission('formulas.manage'),
  formulasController.createFormula
);

router.put(
  '/:id',
  authenticate,
  authorizePermission('formulas.manage'),
  formulasController.updateFormula
);

router.patch(
  '/:id/deactivate',
  authenticate,
  authorizePermission('formulas.manage'),
  formulasController.deactivateFormula
);

module.exports = router;