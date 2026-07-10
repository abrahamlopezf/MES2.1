const express = require('express');

const rolesController = require('./roles.controller');
const { createRoleSchema, updateRoleSchema } = require('./roles.validator');

const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');
const validate = require('../../middlewares/validation.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get(
  '/',
  permissionMiddleware('roles.read'),
  rolesController.getRoles
);

router.get(
  '/:id',
  permissionMiddleware('roles.read'),
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