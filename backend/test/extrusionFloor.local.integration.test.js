'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const enabled = process.env.RUN_EXTRUSION_LOCAL_INTEGRATION === '1';

test('cola, ingreso compatible/incompatible a rack y cambio de mezcla (fixtures revertidos)', { skip: !enabled, timeout: 30000 }, async () => {
  require('dotenv').config({ quiet: true });
  const models = require('../src/database/models');
  const service = require('../src/modules/extrusion/extrusion.service');
  const { fetchQueueOutputSnapshots, persistQueueOutputSnapshot } = require('../src/modules/extrusion/services/queueOutputSnapshot.service');
  const { sequelize } = models;
  const previousTransaction = sequelize.transaction;

  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(sequelize.config.host), 'La prueba solo puede usar PostgreSQL local.');
  sequelize.options.logging = false;

  try {
    // Reproduce la consulta que devolvía HTTP 500 y verifica el contrato de respuesta.
    const queueBoard = await service.getExtruderQueues();
    assert.ok(Array.isArray(queueBoard) && queueBoard.length > 0);
    assert.ok(queueBoard.every((machine) => Array.isArray(machine.waiting) && Array.isArray(machine.paused)));

    const user = await models.User.findOne({ where: { is_active: true }, attributes: ['id'] });
    const batch = await models.QrBatch.findOne({ attributes: ['id'] });
    const extrusionArea = await models.Area.findOne({ where: { code: 'EXTRUSION' }, attributes: ['id'] });
    const machine = await models.Extruder.findOne({ where: { id: 4, is_active: true, status: 'ACTIVE', is_dynamic_member: true } });
    const formula = await models.Formula.findOne({
      where: { id: 16, is_active: true },
      include: [{ model: models.PtiProduct, as: 'ptiProducts', where: { id: 20, is_active: true }, required: true }],
    });
    const nextPti = await models.PtiProduct.findByPk(12, { attributes: ['id', 'code', 'color', 'formula_id', 'is_active'] });

    assert.ok(user && batch && extrusionArea && machine && formula?.ptiProducts?.length && nextPti?.is_active, 'Faltan catálogos locales para construir la prueba aislada.');
    assert.equal(await models.ExtruderQueue.count({ where: { extruder_id: machine.id, status: 'ACTIVA' } }), 0, 'La extrusora de prueba debe estar libre.');

    const rollbackMarker = new Error('QA_ROLLBACK_FIXTURES');
    try {
      await previousTransaction.call(sequelize, async (transaction) => {
        // Los servicios bajo prueba abren transacciones propias; redirigirlas a
        // esta transacción padre permite revertir todos los fixtures juntos.
        sequelize.transaction = async (...args) => {
          const callback = typeof args[0] === 'function' ? args[0] : args[1];
          if (callback) return callback(transaction);
          return previousTransaction.apply(sequelize, args);
        };

        try {
          const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
          let serial = Date.now() * 1000;
          const createQr = (tag, purpose) => models.QrCode.create({
            serial: serial++,
            qr_code: `QA-ROLLBACK-${suffix}-${tag}`,
            batch_id: batch.id,
            purpose,
            assigned_area_id: extrusionArea.id,
            status: 'IN_USE',
            created_by: user.id,
          }, { transaction });

          const mixQr = await createQr('MIX-A', 'PREPARED_MIX');
          const nextMixQr = await createQr('MIX-B', 'PREPARED_MIX');
          const rackQr = await createQr('RACK-OK', 'PTI_RACK');
          const wrongRackQr = await createQr('RACK-WRONG', 'PTI_RACK');
          const fullRackQr = await createQr('RACK-FULL', 'PTI_RACK');
          const mixItem = await models.TraceableItem.create({
            qr_code_id: mixQr.id,
            item_type: 'PREPARED_MIX',
            product_name: formula.name,
            origin_area_id: extrusionArea.id,
            current_area_id: extrusionArea.id,
            quantity_initial: 20,
            quantity_current: 20,
            unit: 'KG',
            reference_folio: `QA-${suffix}`,
            metadata: { qa_rollback: true },
            created_by: user.id,
          }, { transaction });
          const activeQueue = await models.ExtruderQueue.create({
            extruder_id: machine.id,
            consumption_order_qr_id: mixQr.qr_code,
            formula_id: formula.id,
            status: 'ACTIVA',
            priority: 2,
            is_silo_kit: false,
            notes: 'Fixture QA revertido',
          }, { transaction });
          const originalPti = await models.PtiProduct.findByPk(formula.ptiProducts[0].id, { transaction });
          const changedPti = await models.PtiProduct.findByPk(nextPti.id, { transaction });
          const originalColor = String(originalPti.color || '').trim();
          const changedColor = String(changedPti.color || '').trim();
          assert.ok(originalColor && changedColor && originalColor.toLowerCase() !== changedColor.toLowerCase(), 'La fórmula debe tener dos PTI de color distinto para comprobar el cambio.');
          await persistQueueOutputSnapshot(sequelize, activeQueue.id, originalPti, transaction);

          const createRack = (qr, tag, overrides = {}) => models.PtiRack.create({
            rack_code: `QA-${tag}-${suffix}`,
            qr_code: qr.qr_code,
            current_quantity: 0,
            max_capacity: 10,
            status: 'VACIO',
            unit_weight_kg: 5,
            location_name: 'QA transaccional',
            ...overrides,
          }, { transaction });
          const compatibleRack = await createRack(rackQr, 'OK');
          const wrongRack = await createRack(wrongRackQr, 'WRONG', {
            current_quantity: 1,
            current_pti_product_id: 12,
            status: 'DISPONIBLE',
          });
          const fullRack = await createRack(fullRackQr, 'FULL', { max_capacity: 1 });

          const beforeProductionEntries = await models.ExtrusionProductionEntry.count({ transaction });
          const ingress = await service.scanRackPti({
            rack_qr: compatibleRack.qr_code,
            pti_material_id: formula.ptiProducts[0].id,
            quantity: 1,
            unit_weight_kg: 5,
            mixture_qr: mixQr.qr_code,
            userId: user.id,
          });
          const compatibleAfter = await models.PtiRack.findByPk(compatibleRack.id, { transaction });
          const mixAfter = await models.TraceableItem.findByPk(mixItem.id, { transaction });
          assert.equal(Number(ingress.rack.current_quantity), 1, 'El ingreso debe devolver la cantidad nueva del rack.');
          assert.equal(Number(compatibleAfter.current_quantity), 1, 'El saldo del rack debe persistirse automáticamente.');
          assert.equal(compatibleAfter.status, 'DISPONIBLE', 'El rack ocupado parcialmente debe quedar disponible.');
          assert.equal(Number(mixAfter.quantity_current), 15, 'El contenedor de mezcla debe descontar los 5 kg transferidos.');
          assert.equal(await models.ExtrusionProductionEntry.count({ transaction }), beforeProductionEntries + 1, 'Debe quedar una entrada de producción enlazada al rack.');

          await assert.rejects(
            service.scanRackPti({
              rack_qr: wrongRack.qr_code,
              pti_material_id: formula.ptiProducts[0].id,
              quantity: 1,
              unit_weight_kg: 5,
              mixture_qr: mixQr.qr_code,
              userId: user.id,
            }),
            (error) => error.statusCode === 409 && /PTI|producto|color/i.test(error.message),
            'Un rack condicionado a otro PTI/color debe bloquear el ingreso.',
          );
          assert.equal(Number((await models.PtiRack.findByPk(wrongRack.id, { transaction })).current_quantity), 1, 'El rechazo no debe alterar la cantidad.');

          await assert.rejects(
            service.scanRackPti({
              rack_qr: fullRack.qr_code,
              pti_material_id: formula.ptiProducts[0].id,
              quantity: 2,
              unit_weight_kg: 5,
              mixture_qr: mixQr.qr_code,
              userId: user.id,
            }),
            (error) => error.statusCode === 400 && /Capacidad/i.test(error.message),
            'El ingreso que excede capacidad debe bloquearse.',
          );
          assert.equal(Number((await models.PtiRack.findByPk(fullRack.id, { transaction })).current_quantity), 0, 'El rechazo por capacidad no debe alterar el rack.');

          // Simular que el supervisor cambia el PTI/color de salida de la
          // misma fórmula antes de preparar el siguiente contenedor.
          originalPti.formula_id = null;
          await originalPti.save({ transaction });
          changedPti.formula_id = formula.id;
          await changedPti.save({ transaction });
          const nextQueue = await service.enqueueMix({
            extruder_id: machine.id,
            consumption_order_qr_id: nextMixQr.qr_code,
            formula_id: formula.id,
            priority: 1,
            notes: 'Fixture QA revertido; misma fórmula y nuevo color.',
            transaction,
          });
          const outputSnapshots = await fetchQueueOutputSnapshots(sequelize, [activeQueue.id, nextQueue.id], transaction);
          assert.equal(Number(outputSnapshots.get(activeQueue.id)?.output_pti_product_id), Number(originalPti.id));
          assert.equal(outputSnapshots.get(activeQueue.id)?.output_pti_color, originalColor);
          assert.equal(Number(outputSnapshots.get(nextQueue.id)?.output_pti_product_id), Number(changedPti.id));
          assert.equal(outputSnapshots.get(nextQueue.id)?.output_pti_color, changedColor);

          const transition = await service.switchQueuePriority({
            extruder_id: machine.id,
            target_queue_id: nextQueue.id,
            scrap_items: [
              { category: 'MEZCLA_ANTERIOR', estimated_weight_kg: 0.25, color: originalColor },
              { category: 'MEZCLA_NUEVA', estimated_weight_kg: 0.25, color: changedColor },
            ],
            shift_code: 'QA',
            notes: 'Cambio de mezcla QA; reversible.',
            userId: user.id,
          });
          assert.equal(transition.active_queue.id, nextQueue.id, 'La mezcla entrante debe quedar activa.');
          assert.equal(transition.paused_queue.status, 'PAUSADA', 'La mezcla anterior debe quedar pausada.');
          assert.equal(Number(transition.paused_queue.formula_id), Number(transition.active_queue.formula_id), 'El cambio de color debe conservar la misma fórmula base.');
          assert.ok(transition.transition?.id, 'El cambio debe crear una transición auditable.');
          assert.equal(transition.scrap_logged.length, 2, 'La transición debe clasificar merma de mezcla anterior y nueva.');
          assert.deepEqual(transition.scrap_logged.map((log) => log.color), [originalColor, changedColor], 'La auditoría debe conservar ambos colores aunque la fórmula sea la misma.');

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
