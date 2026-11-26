'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('cierre y recepción de relevo conservan colas y saldos digitales sin escaneo ni pesaje (fixtures revertidos)', {
  skip: process.env.RUN_EXTRUSION_SHIFT_HANDOFF_LOCAL !== '1',
  timeout: 60000,
}, async () => {
  require('dotenv').config({ quiet: true });
  const models = require('../src/database/models');
  const service = require('../src/modules/extrusion/extrusion.service');
  const { sequelize } = models;
  const originalTransaction = sequelize.transaction;
  const rollbackMarker = new Error('EXTRUSION_SHIFT_HANDOFF_QA_ROLLBACK');
  let transaction;

  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(sequelize.config.host), 'La prueba solo puede ejecutarse contra PostgreSQL local.');
  sequelize.options.logging = false;

  try {
    await sequelize.authenticate();
    transaction = await originalTransaction.call(sequelize);
    sequelize.transaction = async (...args) => {
      const callback = args.find((value) => typeof value === 'function');
      return callback ? callback(transaction) : transaction;
    };

    const outgoing = await models.ExtrusionShiftSession.findOne({
      where: { status: 'ABIERTO' },
      order: [['opened_at', 'DESC']],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    assert.ok(outgoing, 'Debe existir un turno local abierto para verificar su relevo.');

    const activeUsers = await models.User.findAll({
      where: { is_active: true },
      include: [{ model: models.Role, as: 'role', attributes: ['code'] }],
      transaction,
    });
    const supervisors = activeUsers.filter((user) => ['SUPERVISOR_EXTRUSION', 'SUPERVISOR_DE_EXTRUSION'].includes(String(user.role?.code || '').toUpperCase()));
    const outgoingSupervisor = supervisors.find((user) => Number(user.id) === Number(outgoing.supervisor_id));
    const incomingSupervisor = supervisors.find((user) => Number(user.id) !== Number(outgoing.supervisor_id));
    assert.ok(outgoingSupervisor && incomingSupervisor, 'Se requieren dos supervisores activos distintos para probar el relevo.');

    const beforeSummary = await service.getExtrusionShiftSessionSummary(outgoing, { transaction });
    const mixes = beforeSummary.active_mixes_to_transfer || [];
    assert.ok(mixes.length > 0, 'El turno debe conservar mezclas activas o en espera para validar el relevo digital.');

    const closeResult = await service.closeExtrusionShiftSession({
      sessionId: outgoing.id,
      user: { id: outgoingSupervisor.id, role: outgoingSupervisor.role },
    });
    assert.equal(closeResult.handoff_ready, true, 'Con mezclas vivas el cierre debe dejar listo el relevo sin detenerlas.');
    assert.equal(closeResult.active_mixes_to_transfer.length, mixes.length);

    const entryState = await service.getExtrusionShiftEntryState({ user: incomingSupervisor });
    assert.ok(entryState.suggested_shift?.shift_date && entryState.suggested_shift?.shift_code, 'El sistema debe sugerir fecha y turno del supervisor entrante.');

    const received = await service.openExtrusionShiftSession({
      shift_date: entryState.suggested_shift.shift_date,
      shift_code: entryState.suggested_shift.shift_code,
      confirm_carryover: true,
      confirm_active_mixture: true,
      user: incomingSupervisor,
    });

    const handoffs = await models.ExtrusionShiftMixtureHandoff.findAll({
      where: { from_shift_session_id: outgoing.id, to_shift_session_id: received.id },
      order: [['id', 'ASC']],
      transaction,
    });
    assert.equal(handoffs.length, mixes.length, 'Debe haber un movimiento de custodia por cada mezcla confirmada.');
    assert.equal(Number(handoffs.reduce((sum, row) => sum + Number(row.remaining_balance_kg || 0), 0).toFixed(3)), Number(mixes.reduce((sum, row) => sum + Number(row.expected_remaining_kg || 0), 0).toFixed(3)), 'Los saldos aceptados deben conservar el total digital.');

    const queueIds = mixes.map((mix) => Number(mix.queue_id));
    const queuesAfter = await models.ExtruderQueue.findAll({ where: { id: queueIds }, transaction });
    assert.equal(queuesAfter.length, mixes.length);
    assert.ok(queuesAfter.every((queue) => Number(queue.shift_session_id) === Number(received.id)), 'Todas las colas deben quedar bajo el turno entrante.');
    assert.ok(queuesAfter.every((queue) => ['ACTIVA', 'EN_ESPERA'].includes(queue.status)), 'El relevo no debe detener ni consumir las mezclas.');

    const incomingSummary = await service.getExtrusionShiftSessionSummary(received, { transaction });
    assert.equal(Number(incomingSummary.mixture_handoff_in_kg.toFixed(3)), Number(handoffs.reduce((sum, row) => sum + Number(row.remaining_balance_kg || 0), 0).toFixed(3)));
    assert.equal(incomingSummary.active_mixes_to_transfer.length, mixes.length);
    assert.equal(received.supervisor_id, incomingSupervisor.id);

    throw rollbackMarker;
  } catch (error) {
    if (error !== rollbackMarker) throw error;
  } finally {
    sequelize.transaction = originalTransaction;
    if (transaction && !transaction.finished) await transaction.rollback();
    await sequelize.close();
  }
});
