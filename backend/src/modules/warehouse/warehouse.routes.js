const express = require('express');

const warehouseController = require('./warehouse.controller');
const { receiveMaterialSchema } = require('./warehouse.validator');

const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');
const validationMiddleware = require('../../middlewares/validation.middleware');

const router = express.Router();

const authenticate = authMiddleware.authenticate || authMiddleware.authMiddleware || authMiddleware;
const authorizePermission = permissionMiddleware.authorizePermission || permissionMiddleware.requirePermission || permissionMiddleware;
const validateRequest = validationMiddleware.validateRequest || validationMiddleware;

router.use(authenticate);

router.post(
  '/receive',
  authorizePermission('warehouse.receive'),
  validateRequest(receiveMaterialSchema),
  warehouseController.receiveMaterial
);

router.get(
  '/inventory',
  authorizePermission('warehouse.read'),
  warehouseController.getInventory
);

module.exports = router;
