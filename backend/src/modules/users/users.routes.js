const express = require('express');

const usersController = require('./users.controller');
const { createUserSchema, updateUserSchema } = require('./users.validator');

const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');
const validate = require('../../middlewares/validation.middleware');

const { isSupervisor } = require('../../shared/security/accessRules');

const router = express.Router();

router.use(authMiddleware);

router.use((req, res, next) => {
  const roleCode = String(req.user?.role?.code || '').toUpperCase();
  const isExtrusionSupervisor = roleCode === 'SUPERVISOR_EXTRUSION';
  const allowedSupervisorRequest = isExtrusionSupervisor && (
    (req.method === 'GET' && (req.path === '/' || /^\/\d+$/.test(req.path)))
    || (req.method === 'POST' && req.path === '/')
    || (req.method === 'PUT' && /^\/\d+$/.test(req.path))
  );
  if (isSupervisor(req.user) && !allowedSupervisorRequest) {
    return res.status(403).json({
      success: false,
      message: isExtrusionSupervisor
        ? 'El supervisor de Extrusión puede consultar, crear y editar usuarios de su área; no puede gestionar bajas.'
        : 'Los supervisores no tienen acceso a la gestión de usuarios.',
    });
  }
  next();
});

const permissionAuthorizer = permissionMiddleware.authorizePermission || permissionMiddleware.requirePermission || permissionMiddleware;
const authorizeUserPermission = (permission) => (req, res, next) => {
  if (String(req.user?.role?.code || '').toUpperCase() === 'SUPERVISOR_EXTRUSION') return next();
  return permissionAuthorizer(permission)(req, res, next);
};

router.get(
  '/',
  authorizeUserPermission('users.read'),
  usersController.getUsers
);

router.get(
  '/:id',
  authorizeUserPermission('users.read'),
  usersController.getUserById
);

router.post(
  '/',
  authorizeUserPermission('users.create'),
  validate(createUserSchema),
  usersController.createUser
);

router.put(
  '/:id',
  authorizeUserPermission('users.update'),
  validate(updateUserSchema),
  usersController.updateUser
);

router.delete(
  '/:id',
  permissionMiddleware('users.delete'),
  usersController.deleteUser
);

router.post(
  '/:id/request-deactivation',
  permissionMiddleware('users.update'),
  usersController.requestDeactivation
);

module.exports = router;
