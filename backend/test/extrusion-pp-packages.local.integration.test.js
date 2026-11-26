'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { planFifoPackageAllocations } = require('../src/modules/warehouse/consumptionPackageAllocator');

test('las ODC respetan empaques FIFO y Extrusión consume primero PP de WIP (fixtures revertidos)', {
  skip: process.env.RUN_EXTRUSION_PP_PACKAGE_INTEGRATION !== '1',
  timeout: 60000,
}, async () => {
  require('dotenv').config({ quiet: true });
  const models = require('../src/database/models');
  const warehouseService = require('../src/modules/warehouse/consumptionOrder.service');
  const extrusionService = require('../src/modules/extrusion/extrusion.service');
  const { Op } = require('sequelize');
  const { sequelize } = models;

  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(sequelize.config.host), 'La prueba solo puede usar PostgreSQL local.');
  sequelize.options.logging = false;

  const genericPlan = planFifoPackageAllocations([
    { available_amount: 10, presentation_quantity: 5, presentation_unit: 'KG' },
  ], 3);
  assert.equal(genericPlan.allocated_quantity, 5, 'La planificación debe respetar cualquier presentación, no solo costales de PP.');

  const user = await models.User.findOne({ where: { is_active: true }, attributes: ['id'] });
  const warehouse = await models.Area.findOne({ where: { code: 'ALMACEN' }, attributes: ['id'] });
  const extrusion = await models.Area.findOne({ where: { code: 'EXTRUSION', is_active: true }, attributes: ['id'] });
  const formula = await models.Formula.findByPk(16, {
    include: [{ model: models.FormulaIngredient, as: 'ingredients', include: [{ model: models.Material, as: 'material' }] }],
  });
  const batch = await models.QrBatch.findOne({ attributes: ['id'] });
  assert.ok(user && warehouse && extrusion && formula && batch, 'Faltan usuario, áreas, fórmula 16 o lote de QR local.');
  assert.ok(formula.is_active, 'La fórmula de prueba debe estar activa.');

  const ppIngredient = formula.ingredients.find((ingredient) => {
    const name = String(ingredient.material?.name || '').trim().toUpperCase();
    return name.startsWith('POLIPROPILENO') || name === 'PP' || name.startsWith('PP ');
  });
  assert.ok(ppIngredient, 'La fórmula necesita un ingrediente PP.');
  const ppMaterialId = Number(ppIngredient.material_id);
  const expectedPpKg = Number(ppIngredient.quantity);
  const expectedPpFromSiloKg = Number(Math.max(0, expectedPpKg - 50).toFixed(3));
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const previousTransaction = sequelize.transaction;
  const rollbackMarker = new Error('QA_ROLLBACK_FIXTURES');

  try {
    try {
      await previousTransaction.call(sequelize, async (transaction) => {
        // Servicios de aplicación abren transacciones propias: compartir la
        // transacción externa mantiene toda la corrida reversible.
        sequelize.transaction = async (...args) => {
          const callback = typeof args[0] === 'function' ? args[0] : args[1];
          if (callback) return callback(transaction);
          return previousTransaction.apply(sequelize, args);
        };

        try {
          const inventory = await models.Inventory.findOne({ where: { material_id: ppMaterialId }, transaction });
          assert.ok(inventory, 'El PP de la fórmula necesita su registro de inventario.');

          // Aislar el saldo de este material dentro de la transacción de QA.
          await models.Lote.update(
            { is_active: false, available_amount: 0 },
            { where: { material_id: ppMaterialId, is_active: true }, transaction },
          );
          // Excluir saldos preexistentes de este material de la simulación;
          // el rollback restituye sus cantidades originales al finalizar.
          await models.WipInventory.update(
            { amount: 0 },
            { where: { material_id: ppMaterialId, area_id: extrusion.id }, transaction },
          );
          inventory.amount = 0;
          await inventory.save({ transaction });

          const createWarehousePackage = async (index, receivedAt, unitCost) => {
            const parentQr = await models.QrCode.create({
              serial: Date.now() + index,
              qr_code: `QA-PACK-${suffix}-${index}`,
              batch_id: batch.id,
              purpose: 'RAW_MATERIAL_LOT',
              assigned_area_id: warehouse.id,
              status: 'ACTIVE',
              created_by: user.id,
              is_active: true,
            }, { transaction });
            return models.Lote.create({
              material_id: ppMaterialId,
              folio: `QA-PP-${suffix}-${index}`,
              user_id: user.id,
              qr_id: parentQr.id,
              date_received: receivedAt,
              initial_amount: 25,
              available_amount: 25,
              presentation_quantity: 25,
              presentation_unit: 'KG',
              unit_cost: unitCost,
              total_cost: 25 * unitCost,
              invoice_currency: 'MXN',
              is_active: true,
            }, { transaction });
          };

          const earlierLot = await createWarehousePackage(1, '2026-11-01T08:00:00.000Z', 10);
          const laterLot = await createWarehousePackage(2, '2026-11-02T08:00:00.000Z', 12);
          inventory.amount = 50;
          await inventory.save({ transaction });

          const order = await warehouseService.createOrder({
            requested_by: user.id,
            requesting_area_id: extrusion.id,
            notes: `QA transaccional ${suffix}`,
            items: [{ material_id: ppMaterialId, quantity: 26 }],
          }, transaction);
          const orderItems = await models.ConsumptionOrderItem.findAll({ where: { order_id: order.id }, order: [['id', 'ASC']], transaction });
          assert.equal(orderItems.length, 2, 'El pedido de 26 kg debe planear dos líneas de 25 kg en empaques FIFO.');
          assert.deepEqual(orderItems.map((item) => Number(item.requested_quantity)), [25, 25]);
          assert.deepEqual(orderItems.map((item) => Number(item.lote_id)), [Number(earlierLot.id), Number(laterLot.id)], 'La asignación debe respetar antigüedad de factura/lote.');

          await warehouseService.updateOrderStatus(order.uuid, 'PREPARANDO', user.id, transaction);
          await warehouseService.scanFulfillmentItem(order.uuid, earlierLot.folio, user.id, transaction);
          await warehouseService.scanFulfillmentItem(order.uuid, laterLot.folio, user.id, transaction);

          const fulfilledOrder = await models.ConsumptionOrder.findByPk(order.id, { transaction });
          assert.equal(fulfilledOrder.status, 'SURTIDA', 'La ODC debe finalizar al entregar todos los empaques.');
          const fulfilledItems = await models.ConsumptionOrderItem.findAll({ where: { order_id: order.id }, order: [['id', 'ASC']], transaction });
          assert.deepEqual(fulfilledItems.map((item) => Number(item.fulfilled_quantity)), [25, 25]);
          const ppWipBeforeMix = await models.WipInventory.findAll({
            where: { material_id: ppMaterialId, area_id: extrusion.id, amount: { [Op.gt]: 0 } },
            include: [{ model: models.QrCode, as: 'qr_code', attributes: ['qr_code'] }],
            order: [['created_at', 'ASC'], ['id', 'ASC']],
            transaction,
          });
          assert.equal(ppWipBeforeMix.reduce((sum, row) => sum + Number(row.amount), 0), 50, 'Los dos empaques completos deben llegar al WIP de Extrusión.');

          const mixContainer = await models.QrCode.create({
            serial: Date.now() + 20,
            qr_code: `QA-MIX-${suffix}`,
            batch_id: batch.id,
            purpose: 'MIXTURE_CONTAINER',
            assigned_area_id: extrusion.id,
            status: 'GENERATED',
            created_by: user.id,
            is_active: true,
          }, { transaction });

          // Para los aditivos, crear saldos WIP de prueba equivalentes a la
          // receta. La transacción externa los revierte junto al flujo entero.
          const additiveInputs = [];
          for (const ingredient of formula.ingredients) {
            if (Number(ingredient.material_id) === ppMaterialId) continue;
            const quantity = Number(ingredient.quantity);
            assert.ok(quantity > 0, `El ingrediente ${ingredient.material?.name || ingredient.id} debe tener cantidad fija para la prueba.`);
            const ingredientQr = await models.QrCode.create({
              serial: Date.now() + 100 + Number(ingredient.id),
              qr_code: `QA-ADD-${suffix}-${ingredient.id}-SN1`,
              batch_id: batch.id,
              purpose: 'WIP_PROCESS_INPUT',
              assigned_area_id: extrusion.id,
              status: 'IN_WIP',
              created_by: user.id,
              is_active: true,
            }, { transaction });
            const ingredientLot = await models.Lote.create({
              material_id: ingredient.material_id,
              folio: `QA-ADD-LOT-${suffix}-${ingredient.id}`,
              user_id: user.id,
              date_received: new Date(),
              initial_amount: quantity,
              available_amount: 0,
              presentation_quantity: null,
              unit_cost: 1,
              total_cost: quantity,
              invoice_currency: 'MXN',
              is_active: false,
            }, { transaction });
            await models.WipInventory.create({
              material_id: ingredient.material_id,
              lote_id: ingredientLot.id,
              qr_code_id: ingredientQr.id,
              area_id: extrusion.id,
              amount: quantity,
            }, { transaction });
            additiveInputs.push({ qr_code: ingredientQr.qr_code, material_id: Number(ingredient.material_id), quantity });
          }

          const mixInputs = [
            ...ppWipBeforeMix.map((row) => ({ qr_code: row.qr_code.qr_code, material_id: ppMaterialId, quantity: Number(row.amount) })),
            ...additiveInputs,
          ];
          const activeSilos = await models.Silo.findAll({ where: { is_active: true, is_extrusion_feed: true }, order: [['code', 'ASC'], ['id', 'ASC']], transaction });
          assert.equal(activeSilos.length, 2, 'Deben existir exactamente dos silos activos de alimentación a Extrusión.');
          const siloBalanceBefore = activeSilos.reduce((sum, silo) => sum + Number(silo.current_stock_kg || 0), 0);
          assert.ok(siloBalanceBefore >= expectedPpFromSiloKg, 'El silo de prueba necesita saldo suficiente para cubrir el faltante de PP.');

          const mixResult = await extrusionService.mixFormula({
            formula_id: formula.id,
            output_color: 'Blanco',
            extruder_id: 4,
            container_count: 1,
            container_qr_codes: [mixContainer.qr_code],
            inputs: mixInputs,
            notes: `QA transaccional ${suffix}`,
          }, user.id);

          const preparationId = Number(mixResult.preparation?.id || mixResult.id || mixResult.preparation_id);
          assert.ok(preparationId, 'La mezcla debe devolver su preparación creada.');
          const preparationInputs = await models.ProcessPreparationInput.findAll({ where: { preparation_id: preparationId }, transaction });
          // El silo puede entregar PP consolidado bajo otro código equivalente;
          // identifica su consumo por origen de silo, no solo por el material_id.
          const ppInputs = preparationInputs.filter((input) => Number(input.material_id) === ppMaterialId || input.source_silo_id);
          const ppWipInputs = ppInputs.filter((input) => input.source_qr_code_id);
          const ppFromWip = ppWipInputs.reduce((sum, input) => sum + Number(input.quantity), 0);
          const ppFromSilos = ppInputs.filter((input) => input.source_silo_id).reduce((sum, input) => sum + Number(input.quantity), 0);
          assert.equal(Number(ppFromWip.toFixed(3)), 50, 'La mezcla debe consumir primero los 50 kg de PP en costales transferidos a WIP.');
          assert.deepEqual(ppWipInputs.map((input) => Number(input.unit_cost_snapshot)).sort((a, b) => a - b), [10, 12], 'Cada empaque debe conservar el costo de su lote de factura FIFO.');
          assert.equal(Number(ppFromSilos.toFixed(3)), expectedPpFromSiloKg, 'El silo debe cubrir únicamente el faltante de PP de la receta.');
          assert.equal(Number((ppFromWip + ppFromSilos).toFixed(3)), expectedPpKg, 'El consumo total debe coincidir con el PP formulado.');
          const issuedWipBalances = await models.WipInventory.findAll({
            where: { qr_code_id: ppWipBeforeMix.map((row) => row.qr_code_id), area_id: extrusion.id },
            transaction,
          });
          assert.equal(Number(issuedWipBalances.reduce((sum, row) => sum + Number(row.amount), 0).toFixed(3)), 0, 'Los empaques transferidos deben quedar consumidos del WIP.');
          const silosAfter = await models.Silo.findAll({ where: { id: activeSilos.map((silo) => silo.id) }, transaction });
          const siloBalanceAfter = silosAfter.reduce((sum, silo) => sum + Number(silo.current_stock_kg || 0), 0);
          assert.equal(Number((siloBalanceBefore - siloBalanceAfter).toFixed(3)), expectedPpFromSiloKg, 'El saldo combinado de los silos solo debe disminuir por el faltante.');

          throw rollbackMarker;
        } finally {
          sequelize.transaction = previousTransaction;
        }
      });
    } catch (error) {
      if (error !== rollbackMarker) throw error;
    }
  } finally {
    sequelize.transaction = previousTransaction;
    await sequelize.close();
  }
});
