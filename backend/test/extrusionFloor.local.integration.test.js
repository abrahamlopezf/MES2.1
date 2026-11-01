'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getShiftDateForInstant } = require('../src/modules/extrusion/services/shiftBalance');

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
          await assert.rejects(
            service.closeExtrusionShift({
              extruder_id: machine.id,
              shift_date: '1999-01-01',
              shift_code: 'TURNO_1',
              grouped_weighings: [{ category: 'MERMA_COLOR', color: 'QA', actual_weight_kg: 1 }],
              userId: user.id,
            }),
            (error) => error.statusCode === 409 && /no tiene preparaciones, producción ni registros de PTI/i.test(error.message),
            'No debe cerrarse una merma si la extrusora no trabajó en el turno seleccionado.',
          );
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
            scrap_weight_kg: 1,
            mixture_qr: mixQr.qr_code,
            userId: user.id,
          });
          const compatibleAfter = await models.PtiRack.findByPk(compatibleRack.id, { transaction });
          const mixAfter = await models.TraceableItem.findByPk(mixItem.id, { transaction });
          assert.equal(Number(ingress.rack.current_quantity), 1, 'El ingreso debe devolver la cantidad nueva del rack.');
          assert.equal(Number(compatibleAfter.current_quantity), 1, 'El saldo del rack debe persistirse automáticamente.');
          assert.equal(compatibleAfter.status, 'DISPONIBLE', 'El rack ocupado parcialmente debe quedar disponible.');
          assert.equal(Number(mixAfter.quantity_current), 14, 'El contenedor debe descontar PTI y merma inline.');
          assert.equal(await models.ExtrusionProductionEntry.count({ transaction }), beforeProductionEntries + 1, 'Debe quedar una entrada de producción enlazada al rack.');
          const entrySnapshot = await models.ExtrusionProductionEntry.findOne({ where: { mixture_qr: mixQr.qr_code }, order: [['id', 'DESC']], transaction });
          assert.equal(Number(entrySnapshot.mixture_consumed_kg), 6, 'La entrada debe guardar el consumo de mezcla del PTI y su merma asociada.');
          assert.equal(Number(entrySnapshot.mixture_balance_before_kg), 20, 'La trazabilidad debe conservar el saldo anterior del contenedor.');
          assert.equal(Number(entrySnapshot.mixture_balance_after_kg), 14, 'La trazabilidad debe conservar el saldo posterior del contenedor.');
          assert.equal(Number(ingress.scrap_logged.source_production_entry_id), Number(entrySnapshot.id), 'La merma inline debe enlazarse con el consumo que ya la incluye para evitar doble conteo en cierre.');
          if (Number(formula.expected_yield_pieces) > 0) {
            assert.equal(Number(entrySnapshot.standard_unit_weight_kg), Number((Number(entrySnapshot.net_weight_kg) / Number(entrySnapshot.pieces)).toFixed(6)), 'El registro debe congelar el peso unitario usado para ese ingreso PTI.');
          }
          const cdmxHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
          const currentShiftCode = cdmxHour < 6 || cdmxHour >= 22 ? 'TURNO_3' : cdmxHour < 14 ? 'TURNO_1' : 'TURNO_2';
          const shiftActivity = await service.getExtrusionShiftActivity({ shift_date: getShiftDateForInstant(new Date()), shift_code: currentShiftCode }, { transaction });
          const usedMachine = shiftActivity.used_extruders.find((item) => Number(item.id) === Number(machine.id));
          assert.ok(usedMachine && usedMachine.production_entries > 0, 'El filtro por turno debe detectar la extrusora que registró PTI.');

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

          const ptiStockBeforeOverflow = (await models.PtiRack.findAll({
            where: { current_pti_product_id: formula.ptiProducts[0].id },
            transaction,
          })).reduce((sum, item) => sum + Number(item.current_quantity || 0), 0);
          const overflowResult = await service.scanRackPti({
            rack_qr: fullRack.qr_code,
            pti_material_id: formula.ptiProducts[0].id,
            quantity: 2,
            unit_weight_kg: 5,
            mixture_qr: mixQr.qr_code,
            userId: user.id,
          });
          assert.equal(overflowResult.racks.reduce((sum, item) => sum + Number(item.pieces_added || 0), 0), 2, 'Las piezas deben distribuirse entre racks compatibles.');
          assert.equal(Number((await models.PtiRack.findByPk(fullRack.id, { transaction })).current_quantity), 1, 'El rack debe llenarse solo hasta su capacidad máxima.');
          const ptiStockAfterOverflow = (await models.PtiRack.findAll({
            where: { current_pti_product_id: formula.ptiProducts[0].id },
            transaction,
          })).reduce((sum, item) => sum + Number(item.current_quantity || 0), 0);
          assert.equal(ptiStockAfterOverflow, ptiStockBeforeOverflow + 2, 'El excedente debe quedar guardado en racks compatibles o nuevos.');
          for (const rackItem of await models.PtiRack.findAll({ transaction })) {
            assert.ok(Number(rackItem.current_quantity || 0) <= Number(rackItem.max_capacity || 100), `El rack ${rackItem.rack_code} no debe superar su capacidad.`);
          }

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
            purge_percentage: 0,
            remaining_mix_disposition: 'WIP',
            scrap_items: [
              { category: 'MEZCLA_ANTERIOR', estimated_weight_kg: 0.25, color: originalColor },
              { category: 'MEZCLA_NUEVA', estimated_weight_kg: 0.25, color: changedColor },
            ],
            shift_code: 'QA',
            notes: 'Cambio de mezcla QA; reversible.',
            userId: user.id,
          });
          assert.equal(transition.active_queue.id, nextQueue.id, 'La mezcla entrante debe quedar activa.');
          assert.equal(transition.paused_queue.status, 'CANCELADA', 'El saldo anterior elegido para WIP debe liberar sus QRs de la cola.');
          assert.equal(Number(transition.paused_queue.formula_id), Number(transition.active_queue.formula_id), 'El cambio de color debe conservar la misma fórmula base.');
          const releasedMix = await models.TraceableItem.findByPk(mixItem.id, { transaction });
          assert.equal(releasedMix.status, 'DISPONIBLE', 'El QR del saldo anterior debe quedar disponible para WIP/reencolado.');
          assert.ok(Number(releasedMix.quantity_current) > 0, 'La liberación a WIP debe conservar el saldo del QR.');
          const requeuedMix = await service.enqueueMix({
            extruder_id: machine.id,
            consumption_order_qr_id: mixQr.qr_code,
            formula_id: formula.id,
            priority: 1,
            notes: 'Reencolado del QR liberado a WIP para QA; reversible.',
            transaction,
          });
          assert.equal(requeuedMix.status, 'EN_ESPERA', 'El QR liberado a WIP debe poder reencolarse después.');
          assert.ok(transition.transition?.id, 'El cambio debe crear una transición auditable.');
          assert.equal(transition.scrap_logged.length, 2, 'La transición debe clasificar merma de mezcla anterior y nueva.');
          assert.deepEqual(transition.scrap_logged.map((log) => log.color), [originalColor, changedColor], 'La auditoría debe conservar ambos colores aunque la fórmula sea la misma.');
          const scrapHistory = await service.getScrapLogs({ extruder_id: machine.id, shift_code: 'QA', limit: 200 }, { transaction });
          const transitionHistory = scrapHistory.filter((log) => Number(log.transition_id) === Number(transition.transition.id));
          assert.equal(transitionHistory.length, 2, 'La vista de historial debe mantener un registro separado por mezcla/color.');
          const incomingMixHistory = await service.getScrapLogs({ mixture_qr: nextMixQr.qr_code, shift_code: 'QA' }, { transaction });
          assert.equal(incomingMixHistory.length, 2, 'El historial por QR debe encontrar por separado ambas clasificaciones de la transición.');
          assert.equal(incomingMixHistory.filter((log) => log.category === 'MEZCLA_NUEVA').length, 1, 'La mezcla entrante debe conservar su propia clasificación.');
          assert.equal(incomingMixHistory[0].transition.toQueue.output_pti_color, changedColor, 'El detalle debe usar el color congelado del PTI seleccionado, no todos los colores de la fórmula.');
          const fromBalance = transitionHistory[0].calculation.from_mix;
          assert.equal(Number(fromBalance.useful_pti_kg), 15, 'El cálculo debe sumar el PTI útil registrado por el QR anterior.');
          assert.equal(Number(fromBalance.consumed_kg), 16.25, 'El cálculo debe incluir el consumo trazable, la merma inline y la merma de transición una sola vez.');
          assert.equal(Number(fromBalance.scrap_balance_kg), 1.25, 'El balance debe calcular mezcla consumida menos PTI útil sin mezclar los QR.');
          assert.equal(Number(fromBalance.observed_pieces), 3, 'El detalle debe contar las piezas registradas de este QR.');
          assert.equal(Number(fromBalance.estimated_pieces_from_consumed_kg), 3, 'El rendimiento equivalente debe usar consumo trazado y peso estándar congelado.');
          assert.equal(Number(fromBalance.remaining_kg), 3.75, 'El detalle debe conservar el remanente medido por el balance trazable del QR.');
          assert.ok(fromBalance.first_pti_at && fromBalance.last_pti_at, 'El detalle debe indicar primera y última entrada de PTI.');

          const specialScrapQr = await createQr('MIX-C', 'PREPARED_MIX');
          const specialScrapTrace = await models.TraceableItem.create({
            qr_code_id: nextMixQr.id,
            item_type: 'PREPARED_MIX',
            product_name: formula.name,
            origin_area_id: extrusionArea.id,
            current_area_id: extrusionArea.id,
            quantity_initial: 5,
            quantity_current: 5,
            unit: 'KG',
            reference_folio: `QA-${suffix}-SPECIAL`,
            metadata: { qa_rollback: true },
            created_by: user.id,
          }, { transaction });
          const specialScrapQueue = await models.ExtruderQueue.create({
            extruder_id: machine.id,
            consumption_order_qr_id: specialScrapQr.qr_code,
            formula_id: formula.id,
            status: 'EN_ESPERA',
            priority: 1,
            is_silo_kit: false,
            notes: 'Fixture QA para disposición SCRAP_ESPECIAL; revertido.',
          }, { transaction });
          await persistQueueOutputSnapshot(sequelize, specialScrapQueue.id, changedPti, transaction);
          const specialDisposition = await service.switchQueuePriority({
            extruder_id: machine.id,
            target_queue_id: specialScrapQueue.id,
            purge_percentage: 0,
            remaining_mix_disposition: 'SCRAP_ESPECIAL',
            shift_code: 'QA',
            notes: 'Prueba de saldo enviado a scrap especial; reversible.',
            userId: user.id,
          });
          assert.equal(specialDisposition.displaced_container_disposition, 'SCRAP_ESPECIAL');
          assert.equal(specialDisposition.scrap_logged.some((log) => log.category === 'SCRAP_ESPECIAL' && Number(log.estimated_weight_kg) === 5 && log.actual_weight_kg == null), true, 'El saldo debe quedar en un registro separado de scrap especial pendiente de pesaje real.');
          assert.equal((await models.ExtruderQueue.findByPk(nextQueue.id, { transaction })).status, 'COMPLETADA', 'La cola del contenedor dispuesto como scrap no debe quedarse activa.');
          assert.equal((await models.TraceableItem.findByPk(specialScrapTrace.id, { transaction })).status, 'CONSUMIDO', 'El QR del saldo convertido en scrap debe quedar consumido.');

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
