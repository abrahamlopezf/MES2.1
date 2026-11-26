'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const enabled = process.env.RUN_CORTE_LAMINADO_LOCAL_INTEGRATION === '1';

test('Corte solicita una cantidad de PTI y Laminado solo recibe custodia con QR (fixtures revertidos)', { skip: !enabled, timeout: 45000 }, async () => {
  require('dotenv').config({ quiet: true });
  const models = require('../src/database/models');
  const corte = require('../src/modules/corte/corte.service');
  const laminado = require('../src/modules/laminado/laminado.service');
  const { sequelize } = models;
  const originalTransaction = sequelize.transaction;

  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(sequelize.config.host), 'La prueba solo puede conectarse a PostgreSQL local.');
  sequelize.options.logging = false;

  try {
    await sequelize.authenticate();
    const candidates = await corte.getEligibleRolls();
    const candidate = candidates[0];
    assert.ok(candidate, 'Se necesita al menos un rollo elegible local en Telares para Laminado.');
    const user = await models.User.findOne({ where: { is_active: true }, attributes: ['id'] });
    const roll = await models.ViajeroRoll.findByPk(candidate.id);
    const qr = await models.QrCode.findByPk(roll.virgin_qr_code_id);
    const traceable = qr && await models.TraceableItem.findOne({ where: { qr_code_id: qr.id } });
    assert.ok(user && qr && traceable, 'El rollo de prueba necesita usuario, QR viajero y artículo trazable.');
    const demandOptions = await corte.getDemandOptions();
    const matchingDemand = demandOptions.find((option) => option.eligible_rolls.some((item) => Number(item.id) === Number(roll.id)));
    assert.ok(matchingDemand, 'Debe existir un PTI de Laminado compatible con el rollo de prueba.');
    const nonLaminationRoll = await models.ViajeroRoll.findOne({
      where: { current_stage: 'TELARES', status: 'DISPONIBLE', is_active: true, next_allowed_stage: { [require('sequelize').Op.ne]: 'LAMINADO' } },
      attributes: ['id', 'route', 'roll_code', 'qr_code'],
    });

    const rollback = new Error('QA_ROLLBACK_FIXTURES');
    try {
      await originalTransaction.call(sequelize, async (transaction) => {
        // El servicio abre transacciones propias. Redirigirlas a la transacción
        // padre permite probar el mismo flujo y revertir todos sus efectos.
        sequelize.transaction = async (...args) => {
          const callback = typeof args[0] === 'function' ? args[0] : args[1];
          if (callback) return callback(transaction);
          return originalTransaction.apply(sequelize, args);
        };

        try {
          const verifyBefore = await laminado.verifyScan({ qr_code: roll.qr_code, operator_id: user.id, transaction });
          assert.equal(verifyBefore.error_code, 'CORTE_ORDER_PICKUP_REQUIRED', 'El QR no debe entrar directo a Laminado por su sola ruta.');
          await assert.rejects(
            laminado.transformRoll({ roll_id: roll.id, specification_id: -1, operator_id: user.id }),
            (error) => error.statusCode === 409 && error.code === 'CORTE_ORDER_PICKUP_REQUIRED',
            'Tampoco se debe transformar sin confirmar la recogida física.',
          );
          const created = await corte.createOrder({ specificationId: matchingDemand.id, requestedRollCount: 1, requestedBy: user.id, notes: 'QA local, transacción revertida.' });
          assert.equal(created.requested_roll_count, 1);
          const order = await models.CorteLaminadoOrder.findByPk(created.id, { transaction });
          const line = await models.CorteLaminadoOrderItem.findOne({ where: { order_id: created.id }, transaction });
          assert.equal(line.status, 'REQUESTED');
          assert.equal((await corte.listOrders({ transaction }))[0].order_number, created.order_number, 'Corte debe consultar la orden recién generada con su QR asociado.');
          assert.ok((await corte.getEligibleRolls({ transaction })).some((item) => Number(item.id) === Number(roll.id)), 'La solicitud por cantidad no debe asignar un rollo antes de escanear su QR.');
          await assert.rejects(corte.pickRoll({ orderId: order.id, qrCode: `${roll.qr_code}-NO-ES`, pickedBy: user.id }), (error) => error.statusCode === 404, 'Un QR incorrecto no debe transferir custodia.');
          if (nonLaminationRoll) await assert.rejects(corte.pickRoll({ orderId: order.id, qrCode: nonLaminationRoll.qr_code, pickedBy: user.id }), (error) => error.statusCode === 409, 'Un rollo sin ruta a Laminado no debe transferir custodia.');
          assert.equal((await models.CorteLaminadoOrderItem.findByPk(line.id, { transaction })).status, 'REQUESTED');

          const picked = await corte.pickRoll({ orderId: order.id, qrCode: roll.qr_code, pickedBy: user.id });
          assert.equal(picked.success, true);
          assert.equal(picked.order_status, 'PICKED');
          assert.equal((await models.CorteLaminadoOrderItem.findByPk(line.id, { transaction })).status, 'PICKED');
          assert.ok(!(await corte.listOrders({ transaction })).some((item) => item.id === order.id), 'La orden totalmente recogida debe salir de pendientes.');
          assert.ok((await corte.listOrders({ includeClosed: true, transaction })).some((item) => item.id === order.id && item.status === 'PICKED'), 'Corte debe conservar la orden completa en su historial.');
          assert.equal(Number((await models.QrCode.findByPk(qr.id, { transaction })).current_area_id), 4, 'El QR debe quedar bajo custodia de Laminado.');
          const movedTraceable = await models.TraceableItem.findByPk(traceable.id, { transaction });
          assert.equal(Number(movedTraceable.current_area_id), 4);
          assert.equal(movedTraceable.status, 'RECIBIDO');
          assert.ok(await models.TraceabilityMovement.findOne({ where: { qr_code_id: qr.id, reference_folio: created.order_number, movement_type: 'TRANSFERENCIA_AREA' }, transaction }), 'El kardex debe registrar la transferencia Telares → Laminado.');
          assert.ok(await models.ViajeroRoutingLog.findOne({ where: { viajero_roll_id: roll.id, action: 'RECOGIDA_ORDEN_CORTE_CONFIRMADA' }, transaction }), 'La genealogía debe registrar quién confirmó la recogida.');
          await assert.rejects(corte.pickRoll({ orderId: order.id, qrCode: roll.qr_code, pickedBy: user.id }), (error) => error.statusCode === 409, 'La recogida del mismo rollo no debe repetirse.');
          const verifyAfter = await laminado.verifyScan({ qr_code: roll.qr_code, operator_id: user.id, transaction });
          assert.notEqual(verifyAfter.error_code, 'CORTE_ORDER_PICKUP_REQUIRED', 'Tras el escaneo autorizado debe desaparecer el bloqueo de pedido/recogida.');
          await assert.rejects(
            laminado.transformRoll({ roll_id: roll.id, specification_id: -1, operator_id: user.id }),
            (error) => error.statusCode === 404 && error.code !== 'CORTE_ORDER_PICKUP_REQUIRED',
            'Tras la recogida, el rollo debe superar el control de Corte y continuar a la validación de receta de Laminado.',
          );
          const wip = await laminado.getWipSummary(null, { transaction });
          assert.ok(wip.rolls_in_floor.some((item) => Number(item.id) === Number(roll.id)), 'El rollo recogido debe aparecer bajo custodia en el WIP de Laminado.');

          throw rollback;
        } catch (error) {
          if (error === rollback) throw error;
          throw error;
        } finally {
          sequelize.transaction = originalTransaction;
        }
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  } finally {
    sequelize.transaction = originalTransaction;
    await sequelize.close();
  }
});
