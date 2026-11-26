'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const enabled = process.env.RUN_TELARES_LOCAL_E2E === '1';

test('corrida QA completa de Telares: racks PTI → WIP → rollo QR (reversible)', { skip: !enabled, timeout: 60000 }, async () => {
  require('dotenv').config({ quiet: true });
  const models = require('../src/database/models');
  const service = require('../src/modules/telares/telares.service');
  const { sequelize } = models;
  const originalTransaction = sequelize.transaction;
  let parentTransaction;
  let originalCommit;
  let originalRollback;
  const originalNotificationCreate = models.Notification.create;
  const marker = new Error('TELARES_QA_ROLLBACK');
  const suffix = `QA-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(sequelize.config.host), 'La prueba sólo se ejecuta contra PostgreSQL local.');
  sequelize.options.logging = false;

  try {
    await sequelize.authenticate();
    const bom = await models.ProductionBom.findOne({
      where: { code: 'BOM-TEST-E2E-20261113', is_active: true, is_provisional: false },
      include: [{ model: models.ProductionBomItem, as: 'items', include: [{ model: models.PtiProduct, as: 'ptiProduct' }] }],
    });
    const supervisor = await models.User.findOne({ where: { username: 'sup_tel_1150', is_active: true } });
    const operator = await models.User.findOne({ where: { username: 'op_tel_1200', is_active: true } });
    const admin = await models.User.findOne({ where: { username: 'nexus', is_active: true } });
    const telArea = await models.Area.findOne({ where: { code: 'TELARES' } });
    const extrusionArea = await models.Area.findOne({ where: { code: 'EXTRUSION' } });
    const loomCandidates = bom ? await models.Loom.findAll({ where: { subarea_id: bom.subarea_id, is_active: true }, order: [['code', 'ASC']] }) : [];
    let loom = null;
    for (const candidate of loomCandidates) {
      const [activeRuns, wipRows] = await Promise.all([
        models.LoomRun.count({ where: { loom_id: candidate.id, status: 'EN_PROCESO' } }),
        models.LoomPtiWip.count({ where: { loom_id: candidate.id } }),
      ]);
      if (Number(candidate.current_spools_count || 0) === 0 && activeRuns === 0 && wipRows === 0) {
        loom = candidate;
        break;
      }
    }
    assert.ok(loom && bom && supervisor && operator && admin && telArea && extrusionArea, 'Faltan catálogos o usuarios QA locales requeridos.');
    assert.equal(Number(loom.current_spools_count), 0, 'La prueba selecciona únicamente un telar libre.');
    assert.equal(Number(bom.subarea_id), Number(loom.subarea_id), 'La ficha QA debe corresponder al telar libre.');
    assert.equal(bom.items.length, 2, 'La ficha QA debe requerir dos PTI de Extrusión.');
    assert.ok(bom.items.every((item) => item.ptiProduct?.is_active && Number(item.ptiProduct.unit_weight_kg) > 0));
    assert.equal(await service.getPtiTransferMode(), 'RACK_PARTIAL', 'La prueba necesita transferencia por rack parcial y no cambiará el modo configurado.');

    const sourcePti = bom.items.map((item) => item.ptiProduct);
    const unitWeights = sourcePti.map((pti) => Number(pti.unit_weight_kg));
    const outputMeters = 20;
    const outputWeightKg = Number((bom.items.reduce((sum, item) => sum + Number(item.consumption_g_per_m || 0), 0) * outputMeters / 1000).toFixed(3));
    assert.ok(outputWeightKg > 0, 'La ficha QA debe calcular peso de salida a partir del consumo por metro.');

    parentTransaction = await originalTransaction.call(sequelize);
    originalCommit = parentTransaction.commit;
    originalRollback = parentTransaction.rollback;
    parentTransaction.commit = async () => {};
    parentTransaction.rollback = async () => {};
    models.Notification.create = async (values, options = {}) => originalNotificationCreate.call(
      models.Notification,
      values,
      { ...options, transaction: options.transaction || parentTransaction },
    );
    sequelize.transaction = async (...args) => {
      const callback = args.find((value) => typeof value === 'function');
      return callback ? callback(parentTransaction) : parentTransaction;
    };

    try {
      const batchCode = `${suffix}-QR`;
      const rackBatch = await models.QrBatch.create({
        batch_code: `${batchCode}-RACKS`, quantity: 2, assigned_area_id: extrusionArea.id,
        status: 'ASSIGNED', notes: 'Fixture QA transaccional de Telares; se revierte al finalizar.', created_by: admin.id,
      }, { transaction: parentTransaction });
      const outputBatch = await models.QrBatch.create({
        batch_code: `${batchCode}-OUTPUT`, quantity: 1, assigned_area_id: telArea.id,
        status: 'ASSIGNED', notes: 'Fixture QA transaccional de Telares; se revierte al finalizar.', created_by: admin.id,
      }, { transaction: parentTransaction });

      const racks = [];
      for (let index = 0; index < sourcePti.length; index += 1) {
        const pti = sourcePti[index];
        const qrValue = `${suffix}-RACK-${index + 1}`;
        const qr = await models.QrCode.create({
          serial: Date.now() * 1000 + index,
          qr_code: qrValue,
          batch_id: rackBatch.id,
          purpose: 'PTI_RACK',
          assigned_area_id: extrusionArea.id,
          current_area_id: extrusionArea.id,
          status: 'IN_USE',
          created_by: admin.id,
        }, { transaction: parentTransaction });
        const rack = await models.PtiRack.create({
          rack_code: `${suffix}-RACK-${index + 1}`,
          qr_code: qrValue,
          current_pti_product_id: pti.id,
          destination_subarea_id: loom.subarea_id,
          destination_route: 'TELARES_ROLLO',
          custody_shift_session_id: null,
          current_quantity: 1,
          min_capacity: 0,
          max_capacity: 100,
          status: 'DISPONIBLE',
          location_name: `QA reversible · ${loom.code}`,
          unit_price: 0,
          unit_cost_per_kg: 1,
          unit_weight_kg: Number(pti.unit_weight_kg),
          container_type: 'RACK',
        }, { transaction: parentTransaction });
        await qr.update({ entity_type: 'PTI_RACK', entity_id: rack.id }, { transaction: parentTransaction });
        await models.TraceableItem.create({
          qr_code_id: qr.id,
          item_type: 'INTERMEDIATE_PRODUCT',
          product_name: pti.name || pti.code,
          origin_area_id: extrusionArea.id,
          current_area_id: extrusionArea.id,
          quantity_initial: Number(pti.unit_weight_kg),
          quantity_current: Number(pti.unit_weight_kg),
          unit: 'KG',
          status: 'DISPONIBLE',
          reference_folio: `${suffix}-PTI-${index + 1}`,
          location: `QA reversible · ${loom.code}`,
          metadata: { qa_fixture: true, source: 'telaresE2E.local.integration.test.js' },
          created_by: admin.id,
        }, { transaction: parentTransaction });
        racks.push({ rack, qrValue, pti });
      }

      const outputQrValue = `${suffix}-ROLL`;
      await models.QrCode.create({
        serial: Date.now() * 1000 + 99,
        qr_code: outputQrValue,
        batch_id: outputBatch.id,
        purpose: 'general',
        assigned_area_id: telArea.id,
        status: 'UNASSIGNED',
        created_by: admin.id,
      }, { transaction: parentTransaction });

      for (const { rack, qrValue } of racks) {
        const transfer = await service.loadLoomCreel({
          loom_id: loom.id, rack_id: rack.id, spools_to_load: 1, scanned_qr: qrValue,
          operator_id: supervisor.id, bom_id: bom.id,
        });
        assert.equal(Number(transfer.rack.current_quantity), 0, 'Cada bobina transferida debe descontarse del rack origen.');
      }
      const loomAfterTransfer = await models.Loom.findByPk(loom.id, { transaction: parentTransaction });
      assert.equal(Number(loomAfterTransfer.current_spools_count), 2, 'El WIP debe recibir las dos bobinas sin mezclarlas por PTI.');
      assert.ok(Math.abs(Number(loomAfterTransfer.current_wip_kg) - unitWeights.reduce((sum, value) => sum + value, 0)) < 0.001);
      assert.equal(await models.LoomPtiWip.count({ where: { loom_id: loom.id }, transaction: parentTransaction }), 2);

      const run = await service.startLoomRun({
        loom_id: loom.id, bom_id: bom.id, operator_id: operator.id, shift: 'TURNO_1',
        meters_planned: outputMeters, weight_planned_kg: outputWeightKg,
        notes: `${suffix} corrida QA reversible; ficha no cliente.`,
      });
      assert.equal(run.status, 'EN_PROCESO');

      const finished = await service.finishRollAndBackflush({
        run_id: run.id,
        meters: outputMeters,
        weight_kg: outputWeightKg,
        operator_id: operator.id,
        recorded_by: supervisor.id,
        shift_supervisor_id: supervisor.id,
        operator_segments: [{ operator_id: operator.id, shift_number: 1, meters_start: 0, meters_end: outputMeters, weight_start_kg: 0, weight_end_kg: outputWeightKg }],
        custom_route: bom.default_route,
        notes: `${suffix} corrida QA reversible.`,
        shift_number: 1,
        idempotency_key: `${suffix}-IDEMPOTENCY`,
        virgin_qr_code: outputQrValue,
      });
      assert.equal(finished.success, true);
      assert.equal(Number(finished.run_summary.meters_produced), outputMeters);
      assert.equal(Number(finished.roll.meters), outputMeters);
      assert.equal(Number(finished.roll.weight_kg), outputWeightKg);
      assert.equal(finished.roll.qr_code, outputQrValue);
      assert.equal(finished.backflush.length, 2, 'El cierre debe descontar ambos PTI de acuerdo con la ficha.');
      assert.ok(finished.backflush.every((entry) => Number(entry.spools_consumed) > 0));
      const outputQr = await models.QrCode.findOne({ where: { qr_code: outputQrValue }, transaction: parentTransaction });
      assert.equal(outputQr.status, 'IN_USE');
      assert.equal(outputQr.entity_type, 'VIAJERO_ROLL');
      const outputTrace = await models.TraceableItem.findOne({ where: { qr_code_id: outputQr.id }, transaction: parentTransaction });
      assert.equal(Number(outputTrace.quantity_current), outputWeightKg);
      const remainingWip = await models.LoomPtiWip.findAll({ where: { loom_id: loom.id }, transaction: parentTransaction });
      assert.equal(remainingWip.length, 2);
      assert.ok(remainingWip.every((row) => Number(row.quantity_remaining_spools) > 0 && Number(row.quantity_remaining_spools) < 1));

      throw marker;
    } catch (error) {
      if (error !== marker) throw error;
    }
  } finally {
    sequelize.transaction = originalTransaction;
    models.Notification.create = originalNotificationCreate;
    if (parentTransaction) {
      parentTransaction.commit = originalCommit;
      parentTransaction.rollback = originalRollback;
      if (!parentTransaction.finished) await originalRollback.call(parentTransaction);
    }
    await sequelize.close();
  }
});
