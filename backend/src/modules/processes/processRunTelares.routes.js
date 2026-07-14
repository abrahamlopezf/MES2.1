const express = require('express');

const processRunTelaresController = require('./processRunTelares.controller');
const { startTelaresSchema, registerInputSchema, finishTelaresSchema } = require('./processRunTelares.validator');

const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');
const validationMiddleware = require('../../middlewares/validation.middleware');

const router = express.Router();

const authenticate = authMiddleware.authenticate || authMiddleware.authMiddleware || authMiddleware;
const authorizePermission = permissionMiddleware.authorizePermission || permissionMiddleware.requirePermission || permissionMiddleware;
const validateRequest = validationMiddleware.validateRequest || validationMiddleware;

if (typeof authenticate !== 'function') {
  throw new Error('El middleware de autenticación no es una función.');
}

if (typeof authorizePermission !== 'function') {
  throw new Error('El middleware de permisos no es una función.');
}

if (typeof validateRequest !== 'function') {
  throw new Error('El middleware de validación no es una función.');
}

router.use(authenticate);

router.post(
  '/telares/start',
  authorizePermission('processes.manage'),
  validateRequest(startTelaresSchema),
  processRunTelaresController.startTelares
);

router.post(
  '/telares/:id/inputs',
  authorizePermission('processes.manage'),
  validateRequest(registerInputSchema),
  processRunTelaresController.registerInput
);

router.post(
  '/telares/:id/finish',
  authorizePermission('processes.manage'),
  validateRequest(finishTelaresSchema),
  processRunTelaresController.finishTelares
);

module.exports = router;
