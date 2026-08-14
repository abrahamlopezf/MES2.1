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

router.get(
  '/inventory',
  authorizePermission('warehouse.read'),
  warehouseController.getInventory
);

router.get(
  '/inventory/:material_id/lotes',
  authorizePermission('warehouse.read'),
  warehouseController.getMaterialLotes
);

router.get(
  '/lotes/:id',
  authorizePermission('warehouse.read'),
  warehouseController.getLoteDetails
);

router.post(
  '/inventory/dispose',
  authorizePermission('warehouse.dispose'),
  warehouseController.disposeLotes
);

router.get(
  '/tipo-baja',
  authorizePermission('warehouse.read'),
  async (req, res, next) => {
    try {
      const { TipoBaja } = require('../../database/models');
      const tipos = await TipoBaja.findAll({ where: { is_active: true } });
      res.status(200).json({ success: true, data: tipos });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/inventory/consume',
  authorizePermission('warehouse.consume'), // Assuming this new permission
  warehouseController.consumeMaterials
);

router.post(
  '/inventory/change-location',
  authorizePermission('warehouse.read'), // Can be warehouse.dispose or warehouse.consume, for now read or custom
  warehouseController.changeLocation
);

module.exports = router;
