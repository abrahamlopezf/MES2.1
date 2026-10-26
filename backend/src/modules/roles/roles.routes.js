const express = require('express');

const rolesController = require('./roles.controller');
const { createRoleSchema, updateRoleSchema } = require('./roles.validator');

const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');
const validate = require('../../middlewares/validation.middleware');

const { isSupervisor } = require('../../shared/security/accessRules');

const router = express.Router();

router.use(authMiddleware);

router.use((req, res, next) => {
  if (isSupervisor(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Los supervisores no tienen acceso a la gestión de roles.',
    });
  }
  next();
});

router.get(
  '/',
  permissionMiddleware('roles.read', 'users.read', 'users.create'),
  rolesController.getRoles
);

router.get(
  '/:id',
  permissionMiddleware('roles.read', 'users.read', 'users.create'),
  rolesController.getRoleById
);

router.post(
  '/',
  permissionMiddleware('roles.create'),
  validate(createRoleSchema),
  rolesController.createRole
);

router.put(
  '/:id',
  permissionMiddleware('roles.update'),
  validate(updateRoleSchema),
  rolesController.updateRole
);

router.delete(
  '/:id',
  permissionMiddleware('roles.delete'),
  rolesController.deleteRole
);

module.exports = router;