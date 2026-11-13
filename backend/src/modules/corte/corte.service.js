'use strict';

const { randomUUID } = require('crypto');
const { Op } = require('sequelize');
const {
  sequelize, ViajeroRoll, ViajeroRoutingLog, CorteLaminadoOrder,
  CorteLaminadoOrderItem, ProductionBom, Loom, User, Area, QrCode,
  TraceableItem, TraceabilityMovement,
} = require('../../database/models');
const normalizeViajeroQr = require('../../shared/utils/normalizeViajeroQr');

const ACTIVE_RESERVATION_STATES = ['REQUESTED', 'PICKED'];

class CorteService {
  async getEligibleRolls({ transaction } = {}) {
    const [rolls, reservations] = await Promise.all([
      ViajeroRoll.findAll({
        where: { current_stage: 'TELARES', status: 'DISPONIBLE', is_active: true },
        include: [
          { model: ProductionBom, as: 'bom', attributes: ['id', 'code', 'name', 'product_kind'] },
          { model: Loom, as: 'loom', attributes: ['id', 'code', 'name'] },
        ],
        order: [['created_at', 'ASC']],
        transaction,
      }),
      CorteLaminadoOrderItem.findAll({ where: { status: { [Op.in]: ACTIVE_RESERVATION_STATES } }, attributes: ['roll_id'], transaction }),
    ]);
    const reservedIds = new Set(reservations.map((row) => Number(row.roll_id)));
    return rolls.filter((roll) => (
      !reservedIds.has(Number(roll.id))
      && normalizeRoute(roll.route).includes('LAMINADO')
      && String(roll.next_allowed_stage).toUpperCase() === 'LAMINADO'
    )).map(toRollSummary);
  }

  async listOrders({ includeClosed = false, transaction } = {}) {
    const where = includeClosed ? {} : { status: { [Op.in]: ['REQUESTED', 'PARTIALLY_PICKED'] } };
    const orders = await CorteLaminadoOrder.findAll({
      where,
      include: [
        { model: User, as: 'requester', attributes: ['id', 'first_name', 'last_name', 'username'] },
        { model: CorteLaminadoOrderItem, as: 'items', include: [{ model: ViajeroRoll, as: 'roll', include: [
          { model: Loom, as: 'loom', attributes: ['id', 'code', 'name'] },
          { model: ProductionBom, as: 'bom', attributes: ['id', 'code', 'name'] },
        ] }] },
      ],
      order: [['requested_at', 'DESC'], [{ model: CorteLaminadoOrderItem, as: 'items' }, 'id', 'ASC']],
      limit: 100,
      transaction,
    });
    return orders.map((order) => ({
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      requested_at: order.requested_at,
      requester: order.requester ? `${order.requester.first_name || ''} ${order.requester.last_name || ''}`.trim() || order.requester.username : '—',
      notes: order.notes,
      items: (order.items || []).map((item) => ({
        id: item.id,
        status: item.status,
        picked_at: item.picked_at,
        roll: item.roll ? toRollSummary(item.roll) : null,
      })),
    }));
  }

  async createOrder({ rollIds, requestedBy, notes }) {
    const ids = [...new Set((rollIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
    if (!ids.length || ids.length !== (rollIds || []).length) throw httpError(400, 'Selecciona al menos un rollo válido.');
    return sequelize.transaction(async (transaction) => {
      const rolls = await ViajeroRoll.findAll({
        where: { id: { [Op.in]: ids }, current_stage: 'TELARES', status: 'DISPONIBLE', is_active: true },
        include: [{ model: ProductionBom, as: 'bom', attributes: ['id', 'code', 'name'] }],
        transaction,
        lock: { level: transaction.LOCK.UPDATE, of: ViajeroRoll },
      });
      if (rolls.length !== ids.length) throw httpError(409, 'Uno o más rollos ya no están disponibles en Telares. Actualiza la lista e intenta de nuevo.');
      for (const roll of rolls) {
        if (!normalizeRoute(roll.route).includes('LAMINADO') || String(roll.next_allowed_stage).toUpperCase() !== 'LAMINADO') {
          throw httpError(409, `El rollo ${roll.roll_code} no está autorizado para Laminado según su ruta.`);
        }
      }
      const active = await CorteLaminadoOrderItem.findAll({
        where: { roll_id: { [Op.in]: ids }, status: { [Op.in]: ACTIVE_RESERVATION_STATES } },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (active.length) throw httpError(409, 'Uno o más rollos ya están reservados en otra orden.');

      const order = await CorteLaminadoOrder.create({ order_number: `CLP-${randomUUID()}`, requested_by: requestedBy, notes: String(notes || '').trim() || null }, { transaction });
      const number = `CL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(order.id).padStart(6, '0')}`;
      await order.update({ order_number: number }, { transaction });
      await CorteLaminadoOrderItem.bulkCreate(ids.map((roll_id) => ({ order_id: order.id, roll_id })), { transaction });
      const corteArea = await Area.findOne({ where: { code: 'CORTE' }, transaction });
      if (!corteArea) throw httpError(500, 'No está configurada el área de Corte; no se puede guardar la solicitud en la genealogía.');
      await ViajeroRoutingLog.bulkCreate(rolls.map((roll) => ({
        viajero_roll_id: roll.id,
        from_stage: 'TELARES',
        to_stage: 'LAMINADO',
        area_id: corteArea.id,
        operator_id: requestedBy,
        action: 'SOLICITUD_CORTE_A_LAMINADO',
        notes: `Corte solicitó el rollo ${roll.roll_code} para procesamiento en Laminado. Orden ${number}.`,
      })), { transaction });
      return { id: order.id, order_number: number, status: 'REQUESTED', roll_count: ids.length };
    });
  }

  async pickRoll({ orderId, qrCode, pickedBy }) {
    const clean = normalizeViajeroQr(qrCode);
    if (!clean) throw httpError(400, 'Escanea el QR viajero del rollo.');
    return sequelize.transaction(async (transaction) => {
      const order = await CorteLaminadoOrder.findByPk(orderId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!order || !['REQUESTED', 'PARTIALLY_PICKED'].includes(order.status)) throw httpError(409, 'La orden ya no está abierta para recogida.');
      const roll = await ViajeroRoll.findOne({
        where: { [Op.or]: [{ qr_code: clean }, { roll_code: clean }, { qr_code: `VIAJERO-${clean}` }, { roll_code: clean.replace(/^VIAJERO-/, '') }], is_active: true },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!roll) throw httpError(404, 'El QR no corresponde a un rollo activo.');
      const line = await CorteLaminadoOrderItem.findOne({ where: { order_id: order.id, roll_id: roll.id }, transaction, lock: transaction.LOCK.UPDATE });
      if (!line) throw httpError(400, `El rollo ${roll.roll_code} no pertenece a la orden ${order.order_number}.`);
      if (line.status !== 'REQUESTED') throw httpError(409, `El rollo ${roll.roll_code} ya fue recogido o procesado.`);
      if (roll.current_stage !== 'TELARES' || roll.status !== 'DISPONIBLE' || !roll.is_active) throw httpError(409, `El rollo ${roll.roll_code} ya no está disponible en Telares.`);
      if (!normalizeRoute(roll.route).includes('LAMINADO')) throw httpError(409, 'El QR no tiene ruta autorizada a Laminado.');

      const pickedAt = new Date();
      await line.update({ status: 'PICKED', picked_by: pickedBy, picked_at: pickedAt }, { transaction });
      const pending = await CorteLaminadoOrderItem.count({ where: { order_id: order.id, status: 'REQUESTED' }, transaction });
      await order.update({ status: pending === 0 ? 'PICKED' : 'PARTIALLY_PICKED' }, { transaction });
      const area = await Area.findOne({ where: { code: 'LAMINADO' }, transaction });
      if (!area) throw httpError(500, 'No está configurada el área de Laminado; no se puede registrar el cambio de custodia.');
      const qrRecord = await QrCode.findByPk(roll.virgin_qr_code_id, { transaction, lock: transaction.LOCK.UPDATE });
      const traceable = qrRecord ? await TraceableItem.findOne({ where: { qr_code_id: qrRecord.id }, transaction, lock: transaction.LOCK.UPDATE }) : null;
      if (!qrRecord || !traceable) throw httpError(409, `El rollo ${roll.roll_code} no tiene una identidad QR y genealogía de custodia completa.`);
      const fromAreaId = traceable.current_area_id;
      await qrRecord.update({ current_area_id: area.id, used_by: pickedBy, used_at: pickedAt }, { transaction });
      await traceable.update({ current_area_id: area.id, status: 'RECIBIDO', location: 'Piso de Laminado', updated_by: pickedBy }, { transaction });
      await TraceabilityMovement.create({
        traceable_item_id: traceable.id,
        qr_code_id: qrRecord.id,
        movement_type: 'TRANSFERENCIA_AREA',
        from_area_id: fromAreaId,
        to_area_id: area.id,
        quantity: Number(roll.weight_kg),
        unit: 'KG',
        balance_after: Number(traceable.quantity_current),
        reference_folio: order.order_number,
        notes: `Laminado confirmó la recogida física del rollo ${roll.roll_code} en Telares.`,
        metadata: { roll_id: roll.id, roll_code: roll.roll_code, order_id: order.id, pickup_kind: 'CORTE_ORDER' },
        performed_by: pickedBy,
      }, { transaction });
      await ViajeroRoutingLog.create({
        viajero_roll_id: roll.id,
        from_stage: 'TELARES',
        to_stage: 'LAMINADO',
        area_id: area.id,
        operator_id: pickedBy,
        action: 'RECOGIDA_ORDEN_CORTE_CONFIRMADA',
        notes: `Recogida física confirmada por Laminado bajo orden ${order.order_number}. Custodia transferida desde Telares.`,
      }, { transaction });
      return { success: true, order_status: pending === 0 ? 'PICKED' : 'PARTIALLY_PICKED', order_number: order.order_number, roll_code: roll.roll_code, qr_code: roll.qr_code, message: `Recogida confirmada: ${roll.roll_code}. El QR ya puede recibirse y procesarse en Laminado.` };
    });
  }

  async cancelOrder(orderId, cancelledBy = null) {
    return sequelize.transaction(async (transaction) => {
      const order = await CorteLaminadoOrder.findByPk(orderId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!order || !['REQUESTED', 'PARTIALLY_PICKED'].includes(order.status)) throw httpError(409, 'Solo se pueden cancelar órdenes que aún tengan rollos pendientes de recoger.');
      const pendingLines = await CorteLaminadoOrderItem.findAll({
        where: { order_id: order.id, status: 'REQUESTED' },
        include: [{ model: ViajeroRoll, as: 'roll', attributes: ['id', 'roll_code'] }],
        transaction,
        lock: { level: transaction.LOCK.UPDATE, of: CorteLaminadoOrderItem },
      });
      if (!pendingLines.length) throw httpError(409, 'La orden no tiene rollos pendientes que se puedan cancelar.');
      await CorteLaminadoOrderItem.update({ status: 'CANCELLED' }, { where: { order_id: order.id, status: 'REQUESTED' }, transaction });
      const picked = await CorteLaminadoOrderItem.count({ where: { order_id: order.id, status: { [Op.in]: ['PICKED', 'PROCESSED'] } }, transaction });
      await order.update({ status: picked ? 'PARTIALLY_CANCELLED' : 'CANCELLED' }, { transaction });
      const corteArea = await Area.findOne({ where: { code: 'CORTE' }, transaction });
      if (corteArea) {
        await ViajeroRoutingLog.bulkCreate(pendingLines.filter((line) => line.roll).map((line) => ({
          viajero_roll_id: line.roll.id,
          from_stage: 'TELARES',
          to_stage: 'LAMINADO',
          area_id: corteArea.id,
          operator_id: cancelledBy,
          action: 'CANCELACION_ORDEN_CORTE',
          notes: `Corte canceló la solicitud ${order.order_number}; el rollo ${line.roll.roll_code} sigue en custodia de Telares.`,
        })), { transaction });
      }
      return { success: true, status: order.status, message: picked
        ? `Se cancelaron los rollos pendientes de ${order.order_number}; los ya recogidos permanecen bajo custodia de Laminado.`
        : `Orden ${order.order_number} cancelada; los rollos quedan disponibles en Telares.` };
    });
  }
}

function normalizeRoute(route) {
  return (Array.isArray(route) ? route : []).map((stage) => String(stage || '').trim().toUpperCase());
}
function toRollSummary(roll) {
  return {
    id: roll.id, roll_code: roll.roll_code, qr_code: roll.qr_code,
    loom: roll.loom ? { id: roll.loom.id, code: roll.loom.code, name: roll.loom.name } : null,
    bom: roll.bom ? { id: roll.bom.id, code: roll.bom.code, name: roll.bom.name } : null,
    meters: Number(roll.meters), weight_kg: Number(roll.weight_kg),
    route: roll.route, current_stage: roll.current_stage, next_allowed_stage: roll.next_allowed_stage,
    created_at: roll.created_at,
  };
}
function httpError(statusCode, message) { return Object.assign(new Error(message), { statusCode }); }

module.exports = new CorteService();
