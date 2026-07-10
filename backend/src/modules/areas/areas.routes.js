const express = require('express');

const areasController = require('./areas.controller');

const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get(
  '/',
  permissionMiddleware('areas.read'),
  areasController.getAreas
);

router.get(
  '/:id',
  permissionMiddleware('areas.read'),
  areasController.getAreaById
);

module.exports = router;