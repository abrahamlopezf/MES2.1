const express = require('express');

const processRunController = require('./processRun.controller');
const { startRunSchema, registerOutputSchema } = require('./processRun.validator');

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
  '/start',
  authorizePermission('processes.manage'),
  validateRequest(startRunSchema),
  processRunController.startRun
);

router.post(
  '/:id/outputs',
  authorizePermission('processes.manage'),
  validateRequest(registerOutputSchema),
  processRunController.registerOutput
);

module.exports = router;
