'use strict';

// Mutating regression test. Run only against a disposable local database:
// DB_NAME=sistema_enterprise_test... ODC_TEST_DATABASE=sistema_enterprise_test... node src/scripts/test-odc-fifo-fulfillment.js
const env = require('../config/env');
const db = require('../database/models');
const consumptionOrderService = require('../modules/warehouse/consumptionOrder.service');

function assert(condition, message) {
  if (!condition) throw new Error(`ODC FIFO REGRESSION FAILED: ${message}`);
}

async function run() {
  assert(env.nodeEnv !== 'production', 'production is not allowed');
  assert(env.db.host === '127.0.0.1' || env.db.host === 'localhost', 'database must be local');
  assert(process.env.ODC_TEST_DATABASE, 'set ODC_TEST_DATABASE to the exact disposable database name');
  assert(env.db.name === process.env.ODC_TEST_DATABASE, 'DB_NAME and ODC_TEST_DATABASE must match');
  assert(/test/i.test(env.db.name), 'database name must include test');

  const materialId = Number(process.env.ODC_TEST_MATERIAL_ID || 1227);
  const [area, warehouseman, lots] = await Promise.all([
    db.Area.findOne({ where: { code: 'EXTRUSION' } }),
    db.User.findOne({
      where: { is_active: true },
      include: [{ model: db.Role, as: 'role', where: { code: 'WAREHOUSEMAN' }, required: true }],
      order: [['id', 'ASC']],
    }),
    db.Lote.findAll({
      where: { material_id: materialId, is_active: true, available_amount: { [require('sequelize').Op.gt]: 0 } },
      include: [{ model: db.QrCode, as: 'qr_code', attributes: ['qr_code'] }],
      order: [['created_at', 'ASC']],
    }),
  ]);
  assert(area && warehouseman, 'active Extrusion area and Warehouse user are required');
  assert(lots.length >= 2, `material ${materialId} needs at least two available FIFO lots`);

  const firstAvailable = Number(lots[0].available_amount);
  const secondAvailable = Number(lots[1].available_amount);
  // ConsumptionOrderItem persists requested_quantity at two decimal places.
  const requestedQuantity = Number((firstAvailable + Math.min(secondAvailable, Math.max(0.01, firstAvailable * 0.1))).toFixed(2));
  assert(firstAvailable > 0 && secondAvailable > 0, 'selected FIFO lots must have positive balances');

  const order = await consumptionOrderService.createOrder({
    requested_by: warehouseman.id,
    requesting_area_id: area.id,
    items: [{ material_id: materialId, quantity: requestedQuantity }],
    notes: `QA regression FIFO multi-lot (${env.db.name})`,
  });
  await consumptionOrderService.updateOrderStatus(order.uuid, 'PREPARANDO', warehouseman.id);

  const plannedItems = await db.ConsumptionOrderItem.findAll({
    where: { order_id: order.id },
    include: [
      { model: db.Lote, as: 'lote', include: [{ model: db.QrCode, as: 'qr_code' }] },
      { model: db.QrCode, as: 'child_qr' },
    ],
    order: [['id', 'ASC']],
  });
  assert(plannedItems.length >= 2, 'ODC must allocate the request across multiple FIFO lots');
  assert(plannedItems.every((item) => item.child_qr?.status === 'RESERVED_ORDER' && !item.child_qr?.is_active),
    'child QRs must remain reserved and inactive until warehouse confirms fulfillment');
  await consumptionOrderService.getOrderDetails(order.uuid);
  await Promise.all(plannedItems.map((item) => item.child_qr.reload()));
  assert(plannedItems.every((item) => item.child_qr.status === 'RESERVED_ORDER' && !item.child_qr.is_active),
    'reading ODC details must not activate or replace reserved child QRs');

  // Match the controller transaction boundary for each scanned lot.
  for (const item of plannedItems) {
    const qr = item.lote?.qr_code?.qr_code || item.lote?.folio;
    assert(qr, `lot ${item.lote_id} needs a scannable QR or folio`);
    const transaction = await db.sequelize.transaction();
    try {
      await consumptionOrderService.scanFulfillmentItem(order.uuid, qr, warehouseman.id, transaction);
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  const [updatedOrder, fulfilledItems, movements] = await Promise.all([
    db.ConsumptionOrder.findByPk(order.id),
    db.ConsumptionOrderItem.findAll({
      where: { order_id: order.id },
      include: [{ model: db.QrCode, as: 'child_qr' }],
      order: [['id', 'ASC']],
    }),
    db.InventoryMovement.findAll({ where: { consumption_order_id: order.id } }),
  ]);
  assert(updatedOrder.status === 'SURTIDA', `expected SURTIDA, got ${updatedOrder.status}`);
  assert(fulfilledItems.every((item) =>
    Number(item.fulfilled_quantity) + 0.0005 >= Number(item.requested_quantity) &&
    item.child_qr_id && item.child_qr?.status === 'IN_WIP'
  ), 'every line must be fulfilled and retain its active WIP child QR');
  assert(movements.length === fulfilledItems.length, 'one inventory movement must be recorded per fulfilled line');
  const fulfilledQuantity = fulfilledItems.reduce((sum, item) => sum + Number(item.fulfilled_quantity), 0);
  assert(Math.abs(fulfilledQuantity - requestedQuantity) <= 0.005, 'fulfilled amount must reconcile with the ODC request');

  console.log(JSON.stringify({
    result: 'PASS',
    database: env.db.name,
    order: updatedOrder.order_number,
    status: updatedOrder.status,
    material_id: materialId,
    requested_kg: requestedQuantity,
    fifo_lots: plannedItems.length,
    fulfilled_lines: fulfilledItems.length,
    inventory_movements: movements.length,
    child_wip_qrs: fulfilledItems.map((item) => item.child_qr.qr_code),
  }, null, 2));
}

run()
  .catch((error) => {
    console.error(error.stack || error);
    process.exitCode = 1;
  })
  .finally(() => db.sequelize.close());
