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
  '/dashboard-metrics',
  authorizePermission('warehouse.dashboard.view', 'inventory.view'),
  warehouseController.getDashboardMetrics
);

router.get(
  '/low-stock-report',
  authorizePermission('warehouse.dashboard.view', 'inventory.view'),
  warehouseController.getLowStockReport
);

router.get(
  '/reports/merma-scrap',
  authorizePermission('warehouse.read', 'inventory.view'),
  warehouseController.getMermaScrapReport
);

router.get(
  '/reports/merma-scrap/:material_id',
  authorizePermission('warehouse.read', 'inventory.view'),
  warehouseController.getMermaScrapDetails
);

router.get(
  '/inventory',
  authorizePermission('warehouse.read', 'inventory.view'),
  warehouseController.getInventory
);

router.get(
  '/inventory/:material_id/lotes',
  authorizePermission('warehouse.read', 'inventory.view', 'lotes.view'),
  warehouseController.getMaterialLotes
);

router.get(
  '/lotes/:id',
  authorizePermission('warehouse.read', 'inventory.view', 'lotes.view', 'lotes.detail'),
  warehouseController.getLoteDetails
);

router.post(
  '/inventory/dispose',
  authorizePermission('warehouse.dispose', 'warehouse.waste', 'inventory.dispose'),
  warehouseController.disposeLotes
);

router.post(
  '/inventory/dispose-request',
  authorizePermission('warehouse.read', 'warehouse.waste.request', 'inventory.view'),
  warehouseController.requestDisposeLotes
);

router.get(
  '/inventory/dispose-request/:id',
  authorizePermission('warehouse.read', 'warehouse.waste', 'inventory.view'),
  warehouseController.getWasteRequest
);

router.post(
  '/inventory/dispose-resolve/:id',
  authorizePermission('warehouse.dispose', 'warehouse.waste', 'inventory.dispose'),
  warehouseController.resolveWasteRequest
);

router.get(
  '/tipo-baja',
  authorizePermission('warehouse.read', 'inventory.view'),
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
  authorizePermission('warehouse.read', 'inventory.view', 'warehouse.consume'), 
  warehouseController.changeLocation
);

router.post(
  '/inventory/manual-entry',
  authorizePermission('warehouse.manual_entry'),
  warehouseController.manualEntry
);

module.exports = router;
