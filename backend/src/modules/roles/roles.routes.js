const express = require('express');

const rolesController = require('./roles.controller');
const { createRoleSchema, updateRoleSchema } = require('./roles.validator');

const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');
const validate = require('../../middlewares/validation.middleware');

const { isSupervisor } = require('../../shared/security/accessRules');
const AuthorizationService = require('../../shared/security/authorization.service');

const router = express.Router();

router.use(authMiddleware);

router.use((req, res, next) => {
  const roleCode = String(req.user?.role?.code || '').toUpperCase();
  const isAreaRoleSelector = ['SUPERVISOR_EXTRUSION', 'SUPERVISOR_TELARES'].includes(roleCode)
    && req.method === 'GET'
    && req.path === '/';
  if (isSupervisor(req.user) && !isAreaRoleSelector) {
    return res.status(403).json({
      success: false,
      message: 'Los supervisores no tienen acceso a la gestión de roles.',
    });
  }
  const isAreaRoleSelectorRead = req.method === 'GET' && req.path === '/';
  if (AuthorizationService.isAreaAdminRole(req.user?.role) && !isAreaRoleSelectorRead) {
    return res.status(403).json({
      success: false,
      message: 'Los administradores de área solo pueden consultar los roles operativos de su área.',
    });
  }
  next();
});

const authorizeRoleSelectorRead = (req, res, next) => {
  if (['SUPERVISOR_EXTRUSION', 'SUPERVISOR_TELARES'].includes(String(req.user?.role?.code || '').toUpperCase())
    && req.method === 'GET' && req.path === '/') return next();
  if (AuthorizationService.isAreaAdminRole(req.user?.role)) {
    return permissionMiddleware('users.read', 'users.create')(req, res, next);
  }
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
