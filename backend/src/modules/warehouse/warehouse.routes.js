const express = require('express');

const warehouseController = require('./warehouse.controller');
const consumptionOrderController = require('./consumptionOrder.controller');
const { receiveMaterialSchema } = require('./warehouse.validator');

const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');
const validationMiddleware = require('../../middlewares/validation.middleware');
const roleMiddleware = require('../../middlewares/role.middleware');

const router = express.Router();

const authenticate = authMiddleware.authenticate || authMiddleware.authMiddleware || authMiddleware;
const authorizePermission = permissionMiddleware.authorizePermission || permissionMiddleware.requirePermission || permissionMiddleware;
const validateRequest = validationMiddleware.validateRequest || validationMiddleware;
const authorizeWarehouseReports = roleMiddleware('ADMIN_ALM', 'ADMIN_ALMACEN');

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
  '/reports/monthly',
  authorizeWarehouseReports,
  warehouseController.getMonthlyReport
);

router.get(
  '/reports/suppliers',
  authorizeWarehouseReports,
  warehouseController.getSuppliersReport
);

router.get(
  '/reports/merma-scrap-devoluciones',
  authorizeWarehouseReports,
  warehouseController.getMermaScrapDevolucionesReport
);

// Formatted PDF Endpoints
router.get(
  '/reports/monthly/pdf',
  authorizeWarehouseReports,
  warehouseController.getMonthlyReportPdf
);

router.get(
  '/reports/suppliers/pdf',
  authorizeWarehouseReports,
  warehouseController.getSuppliersReportPdf
);

router.get(
  '/reports/merma-scrap-devoluciones/pdf',
  authorizeWarehouseReports,
  warehouseController.getMermaScrapDevolucionesPdf
);

router.get(
  '/inventory',
  authorizePermission('warehouse.read', 'inventory.view'),
  warehouseController.getInventory
);

router.get(
  '/area-inventory',
  warehouseController.getAreaInventory
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
  roleMiddleware('ADMIN_ALM', 'ADMIN_ALMACEN'),
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
  roleMiddleware('ADMIN_ALM', 'ADMIN_ALMACEN'),
  warehouseController.resolveWasteRequest
);

router.get(
  '/tipo-baja',
  authorizePermission('warehouse.read', 'inventory.view', 'warehouse.waste', 'warehouse.waste.request', 'warehouse.dispose'),
  async (req, res, next) => {
    try {
      const { TipoBaja, sequelize } = require('../../database/models');
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS tipos_baja (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          description VARCHAR(255),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        SELECT setval(
          pg_get_serial_sequence('tipos_baja', 'id'),
          COALESCE((SELECT MAX(id) FROM tipos_baja), 1),
          (SELECT COUNT(*) > 0 FROM tipos_baja)
        );
        INSERT INTO tipos_baja (name, description, is_active, created_at, updated_at)
        VALUES
          ('Material dañado', 'Daño físico al material', TRUE, NOW(), NOW()),
          ('Merma', 'Pérdida en proceso', TRUE, NOW(), NOW()),
          ('Caducidad', 'Material expirado', TRUE, NOW(), NOW()),
          ('Contaminación', 'Material contaminado', TRUE, NOW(), NOW()),
          ('Error de recepción', 'Ajuste por error al recibir', TRUE, NOW(), NOW()),
          ('Otro', 'Motivo no clasificado', TRUE, NOW(), NOW()),
          ('Devolución', 'Devolución a proveedor o salida por rechazo tras ingreso', TRUE, NOW(), NOW())
        ON CONFLICT (name) DO UPDATE
          SET is_active = TRUE,
              description = COALESCE(tipos_baja.description, EXCLUDED.description);
      `);
      const tipos = await TipoBaja.findAll({ where: { is_active: true }, order: [['id', 'ASC']] });
      res.status(200).json({ success: true, data: tipos });
    } catch (e) {
      next(e);
    }
  }
);

router.get(
  '/inventory/next-consumption-order-number',
  authorizePermission('warehouse.consume', 'warehouse.read', 'inventory.view'),
  warehouseController.getNextConsumptionOrderNumber
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
  roleMiddleware('ADMIN_ALM', 'ADMIN_ALMACEN'),
  warehouseController.manualEntry
);

// Consumption Orders
router.post(
  '/consumption-orders',
  consumptionOrderController.createOrder
);

router.get(
  '/consumption-orders',
  consumptionOrderController.getOrders
);

router.get(
  '/consumption-orders/:uuid',
  consumptionOrderController.getOrderDetails
);

router.get(
  '/consumption-orders/:uuid/print',
  consumptionOrderController.printOrder
);

router.post(
  '/consumption-orders/:uuid/scan-item',
  roleMiddleware('WAREHOUSEMAN', 'ADMIN_ALM'),
  consumptionOrderController.scanItem
);

router.put(
  '/consumption-orders/:uuid/status',
  roleMiddleware('WAREHOUSEMAN', 'ADMIN_ALM'),
  consumptionOrderController.updateOrderStatus
);

router.put(
  '/consumption-orders/:uuid/cancel',
  roleMiddleware('WAREHOUSEMAN', 'ADMIN_ALM'),
  consumptionOrderController.cancelOrder
);

// ==========================================
// CONTROL Y GESTIÓN DE SILOS EN ALMACÉN
// ==========================================
const extrusionController = require('../extrusion/extrusion.controller');
router.get('/silos/exchange-rate', roleMiddleware('ADMIN_ALM', 'ADMIN_ALMACEN', 'SUPERADMIN', 'ADMIN_GENERAL', 'ADMIN_GRAL', 'ADMIN'), warehouseController.getExchangeRate);
router.get('/silos', extrusionController.getSilos);
router.post('/silos', extrusionController.createSilo);
router.put('/silos/:id', extrusionController.updateSilo);
router.delete('/silos/:id', extrusionController.deleteSilo);
router.post('/silos/invoice-entry', roleMiddleware('ADMIN_ALM', 'ADMIN_ALMACEN', 'SUPERADMIN', 'ADMIN_GENERAL', 'ADMIN_GRAL', 'ADMIN'), extrusionController.receiveSiloInvoiceEntry);

module.exports = router;
