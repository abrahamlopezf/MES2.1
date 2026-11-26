const express = require('express');

const usersController = require('./users.controller');
const { createUserSchema, updateUserSchema } = require('./users.validator');

const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');
const validate = require('../../middlewares/validation.middleware');

const { isSupervisor } = require('../../shared/security/accessRules');
const AuthorizationService = require('../../shared/security/authorization.service');

const router = express.Router();

router.use(authMiddleware);

router.use((req, res, next) => {
  if (isSupervisor(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Los supervisores no tienen acceso a la administración de usuarios.',
    });
  }
  if (!AuthorizationService.canAdministerUsers(req.user)) {
    return res.status(403).json({ success: false, message: 'Solo los administradores globales o de área pueden administrar usuarios.' });
  }
  next();
});

const permissionAuthorizer = permissionMiddleware.authorizePermission || permissionMiddleware.requirePermission || permissionMiddleware;
const authorizeUserPermission = (permission) => (req, res, next) => {
  if (AuthorizationService.isAreaAdminRole(req.user?.role)
    && ['users.read', 'users.create', 'users.update'].includes(permission)) return next();
  return permissionAuthorizer(permission)(req, res, next);
};

const authorizeUserDeactivation = (req, res, next) => {
  if (AuthorizationService.isAreaAdminRole(req.user?.role)) {
    return authorizeUserPermission('users.update')(req, res, next);
  }
  return permissionMiddleware('users.delete')(req, res, next);
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
  authorizeUserDeactivation,
  usersController.deleteUser
);

router.post(
  '/:id/request-deactivation',
  permissionMiddleware('users.update'),
  usersController.requestDeactivation
);

module.exports = router;
