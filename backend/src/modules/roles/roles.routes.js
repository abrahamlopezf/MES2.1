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
  const roleCode = String(req.user?.role?.code || '').toUpperCase();
  const isExtrusionRoleSelector = roleCode === 'SUPERVISOR_EXTRUSION'
    && req.method === 'GET'
    && req.path === '/';
  if (isSupervisor(req.user) && !isExtrusionRoleSelector) {
    return res.status(403).json({
      success: false,
      message: 'Los supervisores no tienen acceso a la gestión de roles.',
    });
  }
  if (['ADMIN_EXT', 'ADMIN_EXTRUSION'].includes(roleCode)
    && !(req.method === 'GET' && req.path === '/')) {
    return res.status(403).json({
      success: false,
      message: 'Admin de Extrusión no tiene acceso a la gestión de roles.',
    });
  }
  next();
});

const authorizeRoleSelectorRead = (req, res, next) => {
  if (String(req.user?.role?.code || '').toUpperCase() === 'SUPERVISOR_EXTRUSION'
    && req.method === 'GET' && req.path === '/') return next();
  return permissionMiddleware('roles.read', 'users.read', 'users.create')(req, res, next);
};

router.get(
  '/',
  authorizeRoleSelectorRead,
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
