'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const enabled = process.env.RUN_EXTRUSION_TRANSFER_LOCAL === '1';

test('traslado de mezcla entre extrusoras conserva saldo y auditoría (fixtures revertidos)', { skip: !enabled, timeout: 30000 }, async () => {
  require('dotenv').config({ quiet: true });
  const models = require('../src/database/models');
  const service = require('../src/modules/extrusion/extrusion.service');
  const { calculatePtiOutputEstimate, getShiftDateForInstant, getShiftCodeForInstant } = require('../src/modules/extrusion/services/shiftBalance');
  const { sequelize } = models;
  const originalTransaction = sequelize.transaction;
  const marker = new Error('EXTRUSION_TRANSFER_QA_ROLLBACK');
  const suffix = `QA-TRANSFER-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(sequelize.config.host), 'La prueba solo puede ejecutarse contra PostgreSQL local.');
  sequelize.options.logging = false;

  let parentTransaction;
  try {
    await sequelize.authenticate();
    const [user, batch, extrusionArea, machines, waitingQueues, openSession, formulas] = await Promise.all([
      models.User.findOne({ where: { is_active: true }, attributes: ['id'] }),
      models.QrBatch.findOne({ attributes: ['id'] }),
      models.Area.findOne({ where: { code: 'EXTRUSION', is_active: true }, attributes: ['id'] }),
      models.Extruder.findAll({ where: { is_active: true, status: 'ACTIVE' }, order: [['id', 'ASC']] }),
      models.ExtruderQueue.findAll({ where: { status: 'EN_ESPERA', formula_id: { [require('sequelize').Op.ne]: null } }, attributes: ['formula_id'] }),
      models.ExtrusionShiftSession.findOne({ where: { status: 'ABIERTO' }, order: [['opened_at', 'DESC']] }),
      models.Formula.findAll({ where: { is_active: true }, order: [['id', 'ASC']] }),
    ]);
    assert.ok(user && batch && extrusionArea && machines.length >= 2, 'Faltan usuario, lote QR, área o dos extrusoras activas para la prueba.');

    const candidateFormulaIds = [...new Set([
      ...waitingQueues.map((row) => Number(row.formula_id)),
      ...formulas.map((row) => Number(row.id)),
    ].filter(Number.isInteger))];
    assert.ok(candidateFormulaIds.length, 'No hay fórmulas activas para probar compatibilidad.');

    parentTransaction = await originalTransaction.call(sequelize);
    sequelize.transaction = async (...args) => {
      const callback = args.find((value) => typeof value === 'function');
      return callback ? callback(parentTransaction) : parentTransaction;
    };

    let transferred = null;
    let serial = Date.now() * 1000;
    for (const source of machines) {
      for (const target of machines) {
        if (Number(source.id) === Number(target.id)) continue;
        for (const formulaId of candidateFormulaIds) {
          const formula = await models.Formula.findByPk(formulaId, { transaction: parentTransaction });
          if (!formula) continue;
          const qrValue = `${suffix}-${source.id}-${target.id}-${formulaId}`;
          const qr = await models.QrCode.create({
            serial: serial++,
            qr_code: qrValue,
            batch_id: batch.id,
            purpose: 'PREPARED_MIX',
            assigned_area_id: extrusionArea.id,
            current_area_id: extrusionArea.id,
            status: 'IN_USE',
            created_by: user.id,
          }, { transaction: parentTransaction });
          const traceable = await models.TraceableItem.create({
            qr_code_id: qr.id,
            item_type: 'PREPARED_MIX',
            product_name: formula.name,
            origin_area_id: extrusionArea.id,
            current_area_id: extrusionArea.id,
            quantity_initial: 125.375,
            quantity_current: 125.375,
            unit: 'KG',
            reference_folio: suffix,
            metadata: { qa_rollback: true, test: 'inter-extruder-transfer' },
            created_by: user.id,
          }, { transaction: parentTransaction });
          const queue = await models.ExtruderQueue.create({
            extruder_id: source.id,
            consumption_order_qr_id: qrValue,
            formula_id: formula.id,
            shift_session_id: openSession?.id || null,
            mixture_balance_initial_kg: 125.375,
            status: 'EN_ESPERA',
            priority: 1,
            is_silo_kit: false,
            notes: 'Fixture de transferencia reversible; se revierte al terminar la prueba.',
          }, { transaction: parentTransaction });

          try {
            const result = await service.transferQueuedMixContainer({
              queue_id: queue.id,
              from_extruder_id: source.id,
              to_extruder_id: target.id,
              scanned_mixture_qr: qrValue,
              notes: 'Prueba E2E local reversible de traslado entre extrusoras.',
              shift_session_id: openSession?.id || 1,
              userId: user.id,
            });
            transferred = { source, target, formula, qr, queue, traceable, result };
            break;
          } catch (error) {
            if (![400, 409].includes(Number(error.statusCode))) throw error;
          }
        }
        if (transferred) break;
      }
      if (transferred) break;
    }

    assert.ok(transferred, 'No se encontró una combinación de fórmula y extrusoras que permita una transferencia compatible.');
    assert.equal(transferred.result.balance_kg, 125.375, 'La transferencia debe congelar el saldo actual del QR.');
    assert.equal(Number(transferred.result.from_extruder.id), Number(transferred.source.id));
    assert.equal(Number(transferred.result.to_extruder.id), Number(transferred.target.id));

    const queueAfter = await models.ExtruderQueue.findByPk(transferred.queue.id, { transaction: parentTransaction });
    const traceableAfter = await models.TraceableItem.findByPk(transferred.traceable.id, { transaction: parentTransaction });
    const event = await models.TraceabilityEvent.findOne({
      where: { entity_type: 'ExtruderQueue', entity_id: String(transferred.queue.id), event_type: 'TRASLADO_MEZCLA_EXTRUSORA' },
      order: [['createdAt', 'DESC']],
      transaction: parentTransaction,
    });
    assert.equal(Number(queueAfter.extruder_id), Number(transferred.target.id), 'La cola debe quedar asignada al destino.');
    assert.equal(queueAfter.status, 'EN_ESPERA', 'El traslado no debe activar ni consumir la mezcla.');
    assert.equal(Number(traceableAfter.quantity_current), 125.375, 'Mover custodia no debe modificar el saldo del contenedor.');
    assert.ok(event, 'Debe existir un evento de trazabilidad para el QR trasladado.');
    assert.equal(Number(event.metadata.balance_kg_at_transfer), 125.375);
    assert.equal(Number(event.metadata.from_extruder_id), Number(transferred.source.id));
    assert.equal(Number(event.metadata.to_extruder_id), Number(transferred.target.id));
    assert.equal(String(event.metadata.mixture_qr), String(transferred.qr.qr_code));

    const currentDate = getShiftDateForInstant(new Date());
    const currentCode = openSession?.shift_code || getShiftCodeForInstant(new Date());
    const activity = await service.getExtrusionShiftActivity({ shift_date: openSession?.shift_date || currentDate, shift_code: currentCode }, { transaction: parentTransaction });
    const sourceActivity = activity.used_extruders.find((row) => Number(row.id) === Number(transferred.source.id));
    const targetActivity = activity.used_extruders.find((row) => Number(row.id) === Number(transferred.target.id));
    assert.ok(sourceActivity && targetActivity, 'El reporte por turno debe mostrar ambas extrusoras involucradas.');
    assert.ok(sourceActivity.mixture_transfer_out_kg >= 125.375, 'El reporte debe reflejar el egreso de custodia en origen.');
    assert.ok(targetActivity.mixture_transfer_in_kg >= 125.375, 'El reporte debe reflejar el ingreso de custodia en destino.');

    const measuredPti = calculatePtiOutputEstimate([
      { pieces: 10, standard_unit_weight_kg: 6.8, net_weight_kg: 58.25, weight_source: 'BASCULA' },
    ]);
    assert.equal(measuredPti.useful_pti_kg, 58.25, 'Los reportes deben usar el peso neto medido cuando su fuente sea báscula.');

    throw marker;
  } catch (error) {
    if (error !== marker) throw error;
  } finally {
    sequelize.transaction = originalTransaction;
    if (parentTransaction && !parentTransaction.finished) await parentTransaction.rollback();
    await sequelize.close();
  }
});
