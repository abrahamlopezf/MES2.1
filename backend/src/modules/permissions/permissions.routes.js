const express = require('express');

const permissionsController = require('./permissions.controller');

const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get(
  '/',
  permissionMiddleware('roles.read'),
  permissionsController.getPermissions
);

module.exports = router;