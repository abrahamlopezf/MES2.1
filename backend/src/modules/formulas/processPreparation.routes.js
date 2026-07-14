const express = require('express');

const processPreparationController = require('./processPreparation.controller');
const { createPreparationSchema } = require('./processPreparation.validator');

const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');
const validationMiddleware = require('../../middlewares/validation.middleware');

const router = express.Router();

const authenticate = authMiddleware.authenticate || authMiddleware.authMiddleware || authMiddleware;
const authorizePermission = permissionMiddleware.authorizePermission || permissionMiddleware.requirePermission || permissionMiddleware;
const validateRequest = validationMiddleware.validateRequest || validationMiddleware;

if (typeof authenticate !== 'function') {
  throw new Error('El middleware de autenticación no es una función. Revisa src/middlewares/auth.middleware.js');
}

if (typeof authorizePermission !== 'function') {
  throw new Error('El middleware de permisos no es una función. Revisa src/middlewares/permission.middleware.js');
}

if (typeof validateRequest !== 'function') {
  throw new Error('El middleware de validación no es una función. Revisa src/middlewares/validation.middleware.js');
}

router.use(authenticate);

router.post(
  '/',
  authorizePermission('formulas.prepare'),
  validateRequest(createPreparationSchema),
  processPreparationController.createPreparation
);

module.exports = router;
