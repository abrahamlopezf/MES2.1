'use strict';

const { randomUUID } = require('crypto');
const { Op } = require('sequelize');
const {
  sequelize, ViajeroRoll, ViajeroRoutingLog, CorteLaminadoOrder,
  CorteLaminadoOrderItem, ProductionBom, Loom, User, Area, QrCode,
  TraceableItem, TraceabilityMovement,
  LaminadoSpecification, GloboSpecification,
} = require('../../database/models');
const normalizeViajeroQr = require('../../shared/utils/normalizeViajeroQr');
const rollTransformation = require('../wip/rollTransformation');

const ACTIVE_RESERVATION_STATES = ['REQUESTED', 'PICKED', 'AWAITING_DISPATCH', 'IN_TRANSIT'];
const ACTIVE_PROCESS_ORDER_STATES = ['REQUESTED', 'PARTIALLY_PICKED', 'PICKED', 'IN_PROCESS', 'AWAITING_DISPATCH', 'IN_TRANSIT'];
const PENDING_CUT_PICKUP_STATES = ['REQUESTED', 'PARTIALLY_PICKED'];

class CorteService {
  async getLaminatedWip({ transaction } = {}) {
    const corteArea = await Area.findOne({ where: { code: 'CORTE' }, transaction });
    if (!corteArea) throw httpError(500, 'No está configurada el área de Corte.');
    const rolls = await ViajeroRoll.findAll({
      where: { current_stage: 'LAMINADO', next_allowed_stage: 'CORTE', status: 'DISPONIBLE', is_active: true },
      include: [
        { model: ProductionBom, as: 'bom', attributes: ['id', 'code', 'name'] },
        { model: Loom, as: 'loom', attributes: ['id', 'code', 'name'] },
        { model: QrCode, as: 'identityQr', attributes: ['id', 'qr_code', 'current_area_id'], include: [{ model: TraceableItem, as: 'traceable_item', attributes: ['current_area_id', 'quantity_current', 'unit', 'status', 'product_name', 'metadata'] }] },
      ],
      order: [['updated_at', 'DESC']], transaction,
    });
    return rolls.filter((roll) => Number(roll.identityQr?.traceable_item?.current_area_id) === Number(corteArea.id)).map((roll) => ({
      id: roll.id, roll_code: roll.roll_code, qr_code: roll.qr_code,
      product_name: roll.identityQr?.traceable_item?.product_name || roll.bom?.name || null,
      output_pti_code: roll.identityQr?.traceable_item?.metadata?.output_pti_code || null,
      bom: roll.bom ? { code: roll.bom.code, name: roll.bom.name } : null,
      loom: roll.loom ? { code: roll.loom.code, name: roll.loom.name } : null,
      meters: Number(roll.meters || 0), weight_kg: Number(roll.weight_kg || 0),
      current_stage: roll.current_stage,
      next_allowed_stage: roll.next_allowed_stage, received_at: roll.updated_at,
    }));
  }

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

  async getDemandOptions({ transaction } = {}) {
    const [rolls, specs] = await Promise.all([
      this.getEligibleRollEntities({ transaction }),
      LaminadoSpecification.findAll({ where: { is_active: true }, order: [['code', 'ASC']], transaction }),
    ]);
    return specs.map((spec) => ({
      id: spec.id,
      code: spec.code,
      name: spec.name,
      output_pti_code: spec.output_pti_code,
      output_product_name: spec.output_product_name,
      eligible_rolls: rolls.filter((roll) => rollTransformation.compatibility(spec, roll, 'LAMINADO')).map(toRollSummary),
    }));
  }

  async getEligibleRollEntities({ transaction } = {}) {
    const [rolls, reservations] = await Promise.all([
      ViajeroRoll.findAll({
        where: { current_stage: 'TELARES', status: 'DISPONIBLE', is_active: true },
        include: [
          { model: ProductionBom, as: 'bom', attributes: ['id', 'code', 'name', 'product_kind', 'target_width_cm', 'target_weight_g_per_m', 'fabric_type'] },
          { model: Loom, as: 'loom', attributes: ['id', 'code', 'name'] },
        ], order: [['created_at', 'ASC']], transaction,
      }),
      CorteLaminadoOrderItem.findAll({ where: { status: { [Op.in]: ACTIVE_RESERVATION_STATES } }, attributes: ['roll_id'], transaction }),
    ]);
    const reserved = new Set(reservations.map((row) => Number(row.roll_id)));
    return rolls.filter((roll) => !reserved.has(Number(roll.id))
      && normalizeRoute(roll.route).includes('LAMINADO')
      && String(roll.next_allowed_stage).toUpperCase() === 'LAMINADO');
  }

  async listOrders({ includeClosed = false, transaction } = {}) {
    const where = includeClosed ? {} : { status: { [Op.in]: PENDING_CUT_PICKUP_STATES } };
    const orders = await CorteLaminadoOrder.findAll({
      where,
      include: [
        { model: User, as: 'requester', attributes: ['id', 'first_name', 'last_name', 'username'] },
        { model: LaminadoSpecification, as: 'targetSpecification', attributes: ['id', 'code', 'output_pti_code', 'output_product_name'], required: false },
        { model: CorteLaminadoOrderItem, as: 'items', include: [{ model: ViajeroRoll, as: 'roll', include: [
          { model: Loom, as: 'loom', attributes: ['id', 'code', 'name'] },
          { model: ProductionBom, as: 'bom', attributes: ['id', 'code', 'name'] },
        ] }] },
      ],
      order: [['requested_at', 'DESC'], [{ model: CorteLaminadoOrderItem, as: 'items' }, 'id', 'ASC']],
      limit: 100,
      transaction,
    });
    const availableRolls = await this.getEligibleRollEntities({ transaction });
    return orders.map((order) => ({
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      requested_at: order.requested_at,
      requester: order.requester ? `${order.requester.first_name || ''} ${order.requester.last_name || ''}`.trim() || order.requester.username : '—',
      notes: order.notes,
      requested_roll_count: order.requested_roll_count == null ? order.items?.length || 0 : Number(order.requested_roll_count),
      target_specification: order.targetSpecification ? { id: order.targetSpecification.id, code: order.targetSpecification.code, output_pti_code: order.targetSpecification.output_pti_code, output_product_name: order.targetSpecification.output_product_name } : null,
      compatible_available_rolls: order.targetSpecification ? availableRolls.filter((roll) => rollTransformation.compatibility(order.targetSpecification, roll, 'LAMINADO')).map(toRollSummary) : [],
      pending_pickup_count: (order.items || []).filter((item) => item.status === 'REQUESTED').length,
      processed_count: (order.items || []).filter((item) => item.status === 'PROCESSED').length,
      items: (order.items || []).map((item) => ({
        id: item.id,
        status: item.status,
        picked_at: item.picked_at,
          dispatched_at: item.dispatched_at,
          received_at: item.received_at,
        roll: item.roll ? toRollSummary(item.roll) : null,
      })),
    }));
  }

  async createOrder({ specificationId, requestedRollCount, requestedBy, notes }) {
    const quantity = Number(requestedRollCount);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) throw httpError(400, 'Indica una cantidad de rollos entre 1 y 500.');
    return sequelize.transaction(async (transaction) => {
      // La ficha es catálogo de solo lectura para el runtime QA. No cambia en
      // esta operación; bloquearla con FOR UPDATE exigiría permiso de escritura
      // sobre Master Data y ampliaría innecesariamente el acceso de la aplicación.
      const spec = await LaminadoSpecification.findByPk(Number(specificationId), { transaction });
      if (!spec || !spec.is_active) throw httpError(400, 'Selecciona un PTI de Laminado activo.');
      const order = await CorteLaminadoOrder.create({ order_number: `CLP-${randomUUID()}`, requested_by: requestedBy, target_specification_id: spec.id, requested_roll_count: quantity, notes: String(notes || '').trim() || null }, { transaction });
      const number = `CL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(order.id).padStart(6, '0')}`;
      await order.update({ order_number: number }, { transaction });
      await CorteLaminadoOrderItem.bulkCreate(Array.from({ length: quantity }, () => ({ order_id: order.id, roll_id: null })), { transaction });
      return { id: order.id, order_number: number, status: 'REQUESTED', requested_roll_count: quantity, specification: { id: spec.id, code: spec.code, output_pti_code: spec.output_pti_code, output_product_name: spec.output_product_name } };
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
        include: [
          { model: ProductionBom, as: 'bom', attributes: ['id', 'code', 'name', 'product_kind', 'target_width_cm', 'target_weight_g_per_m', 'fabric_type'] },
          { model: Loom, as: 'loom', attributes: ['id', 'code', 'name'] },
        ],
        transaction,
        // Lock only the source roll row. Locking all joined tables here makes
        // PostgreSQL reject FOR UPDATE over the optional BOM/loom joins.
        lock: { level: transaction.LOCK.UPDATE, of: ViajeroRoll },
      });
      if (!roll) throw httpError(404, 'El QR no corresponde a un rollo activo.');
      if (roll.current_stage !== 'TELARES' || roll.status !== 'DISPONIBLE' || !roll.is_active) throw httpError(409, `El rollo ${roll.roll_code} ya no está disponible en Telares.`);
      if (!normalizeRoute(roll.route).includes('LAMINADO')) throw httpError(409, 'El QR no tiene ruta autorizada a Laminado.');
      if (String(roll.next_allowed_stage).toUpperCase() !== 'LAMINADO') throw httpError(409, `El rollo ${roll.roll_code} no tiene Laminado como siguiente etapa.`);
      const spec = await LaminadoSpecification.findByPk(order.target_specification_id, { transaction });
      if (!spec || !spec.is_active || !rollTransformation.compatibility(spec, roll, 'LAMINADO')) throw httpError(409, `El rollo ${roll.roll_code} no es compatible con el PTI solicitado (${spec?.output_pti_code || spec?.code || 'no definido'}).`);
      const reservation = await CorteLaminadoOrderItem.findOne({ where: { roll_id: roll.id, status: { [Op.in]: ACTIVE_RESERVATION_STATES } }, transaction, lock: transaction.LOCK.UPDATE });
      if (reservation) throw httpError(409, `El rollo ${roll.roll_code} ya está reservado por otra orden.`);
      const line = await CorteLaminadoOrderItem.findOne({ where: { order_id: order.id, roll_id: null, status: 'REQUESTED' }, transaction, lock: transaction.LOCK.UPDATE });
      if (!line) throw httpError(409, `La orden ${order.order_number} ya recibió la cantidad de rollos solicitada.`);

      const pickedAt = new Date();
      await line.update({ roll_id: roll.id, status: 'PICKED', picked_by: pickedBy, picked_at: pickedAt }, { transaction });
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
      const corteArea = await Area.findOne({ where: { code: 'CORTE' }, transaction });
      if (!corteArea) throw httpError(500, 'No está configurada el área de Corte; no se puede guardar la solicitud en la genealogía.');
      await ViajeroRoutingLog.create({
        viajero_roll_id: roll.id,
        from_stage: 'TELARES',
        to_stage: 'LAMINADO',
        area_id: corteArea.id,
        operator_id: order.requested_by,
        action: 'SOLICITUD_CORTE_A_LAMINADO',
        notes: `Corte solicitó el PTI ${spec.output_pti_code || spec.code}; Laminado asignó el rollo ${roll.roll_code}. Orden ${order.order_number}.`,
      }, { transaction });
      return { success: true, order_status: pending === 0 ? 'PICKED' : 'PARTIALLY_PICKED', remaining_to_pick: pending, order_number: order.order_number, roll_code: roll.roll_code, qr_code: roll.qr_code, message: `Recogida confirmada: ${roll.roll_code}. Quedan ${pending} rollo(s) por surtir en esta solicitud.` };
    });
  }

  async dispatchLaminatedOutput({ qrCode, dispatchedBy }) {
    const clean = normalizeViajeroQr(qrCode);
    if (!clean) throw httpError(400, 'Escanea el QR del rollo laminado que va a salir a Corte.');
    return sequelize.transaction(async (transaction) => {
      const roll = await ViajeroRoll.findOne({
        where: { [Op.or]: [{ qr_code: clean }, { roll_code: clean }, { qr_code: `VIAJERO-${clean}` }, { roll_code: clean.replace(/^VIAJERO-/, '') }], is_active: true },
        transaction, lock: { level: transaction.LOCK.UPDATE, of: ViajeroRoll },
      });
      if (!roll || roll.current_stage !== 'LAMINADO' || roll.next_allowed_stage !== 'CORTE' || roll.status !== 'PENDIENTE_TRANSFERENCIA') {
        throw httpError(409, 'Este QR no está pendiente de despacho de Laminado a Corte. Verifica el rollo y su destino.');
      }
      const item = await CorteLaminadoOrderItem.findOne({
        where: { roll_id: roll.id, status: 'AWAITING_DISPATCH' },
        include: [{ model: CorteLaminadoOrder, as: 'order', where: { destination_area_code: 'LAMINADO' } }],
        transaction, lock: { level: transaction.LOCK.UPDATE, of: CorteLaminadoOrderItem },
      });
      if (!item) throw httpError(409, 'No existe una orden de Corte asociada a este rollo pendiente de despacho.');
      const qr = await QrCode.findByPk(roll.virgin_qr_code_id, { transaction, lock: transaction.LOCK.UPDATE });
      const traceable = qr ? await TraceableItem.findOne({ where: { qr_code_id: qr.id }, transaction, lock: transaction.LOCK.UPDATE }) : null;
      const [laminadoArea, corteArea] = await Promise.all([
        Area.findOne({ where: { code: 'LAMINADO' }, transaction }),
        Area.findOne({ where: { code: 'CORTE' }, transaction }),
      ]);
      if (!qr || !traceable || !laminadoArea || !corteArea || Number(traceable.current_area_id) !== Number(laminadoArea.id)) {
        throw httpError(409, 'La identidad o custodia del rollo no coincide con Laminado; no se confirmó la salida.');
      }
      const at = new Date();
      await item.update({ status: 'IN_TRANSIT', dispatched_by: dispatchedBy, dispatched_at: at }, { transaction });
      await roll.update({ status: 'EN_TRANSITO' }, { transaction });
      await traceable.update({ status: 'EN_TRANSITO', location: 'En tránsito de Laminado a Corte', updated_by: dispatchedBy }, { transaction });
      await qr.update({ used_by: dispatchedBy, used_at: at }, { transaction });
      await TraceabilityMovement.create({
        traceable_item_id: traceable.id, qr_code_id: qr.id, movement_type: 'DESPACHO_TRANSFERENCIA',
        from_area_id: laminadoArea.id, to_area_id: corteArea.id, quantity: Number(traceable.quantity_current),
        unit: traceable.unit || 'KG', balance_after: Number(traceable.quantity_current), reference_folio: item.order?.order_number,
        notes: `Laminado confirmó la salida física del rollo ${roll.roll_code}; Corte debe confirmar la recepción escaneando el mismo QR.`,
        metadata: { roll_id: roll.id, roll_code: roll.roll_code, order_id: item.order_id, handoff_status: 'IN_TRANSIT' }, performed_by: dispatchedBy,
      }, { transaction });
      await ViajeroRoutingLog.create({
        viajero_roll_id: roll.id, from_stage: 'LAMINADO', to_stage: 'CORTE', area_id: laminadoArea.id, operator_id: dispatchedBy,
        action: 'DESPACHO_A_CORTE_CONFIRMADO', meters_in: roll.meters, meters_out: roll.meters,
        weight_in_kg: roll.weight_kg, weight_out_kg: roll.weight_kg,
        notes: `Salida confirmada bajo orden ${item.order?.order_number}; pendiente confirmación de recepción por Corte.`,
      }, { transaction });
      await item.order?.update({ status: 'IN_TRANSIT' }, { transaction });
      return { success: true, roll_code: roll.roll_code, qr_code: roll.qr_code, order_number: item.order?.order_number, status: 'IN_TRANSIT', message: `Salida de ${roll.roll_code} confirmada. El rollo queda en tránsito; Corte debe escanear el QR para aceptar la recepción.` };
    });
  }

  async receiveLaminatedOutput({ qrCode, receivedBy }) {
    const clean = normalizeViajeroQr(qrCode);
    if (!clean) throw httpError(400, 'Escanea el QR del rollo que Corte está recibiendo.');
    return sequelize.transaction(async (transaction) => {
      const roll = await ViajeroRoll.findOne({
        where: { [Op.or]: [{ qr_code: clean }, { roll_code: clean }, { qr_code: `VIAJERO-${clean}` }, { roll_code: clean.replace(/^VIAJERO-/, '') }], is_active: true },
        transaction, lock: { level: transaction.LOCK.UPDATE, of: ViajeroRoll },
      });
      if (!roll || roll.current_stage !== 'LAMINADO' || roll.next_allowed_stage !== 'CORTE' || roll.status !== 'EN_TRANSITO') {
        throw httpError(409, 'Este QR no está en tránsito hacia Corte. No se registró la recepción.');
      }
      const item = await CorteLaminadoOrderItem.findOne({
        where: { roll_id: roll.id, status: 'IN_TRANSIT' },
        include: [{ model: CorteLaminadoOrder, as: 'order', where: { destination_area_code: 'LAMINADO' } }],
        transaction, lock: { level: transaction.LOCK.UPDATE, of: CorteLaminadoOrderItem },
      });
      if (!item) throw httpError(409, 'No se encontró el despacho pendiente que corresponde a este QR.');
      const qr = await QrCode.findByPk(roll.virgin_qr_code_id, { transaction, lock: transaction.LOCK.UPDATE });
      const traceable = qr ? await TraceableItem.findOne({ where: { qr_code_id: qr.id }, transaction, lock: transaction.LOCK.UPDATE }) : null;
      const [laminadoArea, corteArea] = await Promise.all([
        Area.findOne({ where: { code: 'LAMINADO' }, transaction }),
        Area.findOne({ where: { code: 'CORTE' }, transaction }),
      ]);
      if (!qr || !traceable || !laminadoArea || !corteArea || traceable.status !== 'EN_TRANSITO' || Number(traceable.current_area_id) !== Number(laminadoArea.id)) throw httpError(409, 'El QR no conserva un despacho válido pendiente de recepción.');
      const at = new Date();
      await item.update({ status: 'RECEIVED', received_by: receivedBy, received_at: at }, { transaction });
      await roll.update({ current_stage: 'LAMINADO', status: 'DISPONIBLE' }, { transaction });
      await traceable.update({ current_area_id: corteArea.id, status: 'RECIBIDO', location: 'WIP de Corte', updated_by: receivedBy }, { transaction });
      await qr.update({ current_area_id: corteArea.id, used_by: receivedBy, used_at: at }, { transaction });
      await TraceabilityMovement.create({
        traceable_item_id: traceable.id, qr_code_id: qr.id, movement_type: 'RECEPCION_TRANSFERENCIA',
        from_area_id: laminadoArea.id, to_area_id: corteArea.id, quantity: Number(traceable.quantity_current),
        unit: traceable.unit || 'KG', balance_after: Number(traceable.quantity_current), reference_folio: item.order?.order_number,
        notes: `Corte confirmó la recepción física del rollo ${roll.roll_code} escaneando su QR.`,
        metadata: { roll_id: roll.id, roll_code: roll.roll_code, order_id: item.order_id, handoff_status: 'RECEIVED' }, performed_by: receivedBy,
      }, { transaction });
      await ViajeroRoutingLog.create({
        viajero_roll_id: roll.id, from_stage: 'LAMINADO', to_stage: 'CORTE', area_id: corteArea.id, operator_id: receivedBy,
        action: 'RECEPCION_EN_CORTE_CONFIRMADA', meters_in: roll.meters, meters_out: roll.meters,
        weight_in_kg: roll.weight_kg, weight_out_kg: roll.weight_kg,
        notes: `Recepción confirmada por Corte bajo orden ${item.order?.order_number}. El rollo ya está en WIP de Corte.`,
      }, { transaction });
      const openItems = await CorteLaminadoOrderItem.count({ where: { order_id: item.order_id, status: { [Op.notIn]: ['RECEIVED', 'PROCESSED', 'CANCELLED'] } }, transaction });
      if (item.order && openItems === 0) await item.order.update({ status: 'PROCESSED' }, { transaction });
      return { success: true, roll_code: roll.roll_code, qr_code: roll.qr_code, order_number: item.order?.order_number, status: 'RECEIVED', message: `Recepción de ${roll.roll_code} confirmada. El rollo ya está disponible en WIP de Corte.` };
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
      const picked = await CorteLaminadoOrderItem.count({ where: { order_id: order.id, status: { [Op.in]: ['PICKED', 'PROCESSED', 'AWAITING_DISPATCH', 'IN_TRANSIT', 'RECEIVED'] } }, transaction });
      await order.update({ status: picked ? 'PARTIALLY_CANCELLED' : 'CANCELLED' }, { transaction });
      const corteArea = await Area.findOne({ where: { code: 'CORTE' }, transaction });
      const destination = normalizeDestination(order.destination_area_code || 'LAMINADO');
      const destinationStage = stageForArea(destination);
      if (corteArea) {
        await ViajeroRoutingLog.bulkCreate(pendingLines.filter((line) => line.roll).map((line) => ({
          viajero_roll_id: line.roll.id,
          from_stage: 'TELARES',
          to_stage: destinationStage,
          area_id: corteArea.id,
          operator_id: cancelledBy,
          action: 'CANCELACION_ORDEN_CORTE',
          notes: `Corte canceló la solicitud ${order.order_number} para ${destination}; el rollo ${line.roll.roll_code} sigue en custodia de Telares.`,
        })), { transaction });
      }
      return { success: true, status: order.status, message: picked
        ? `Se cancelaron los rollos pendientes de ${order.order_number}; los ya recogidos permanecen bajo custodia de Laminado.`
        : `Orden ${order.order_number} cancelada; los rollos quedan disponibles en Telares.` };
    });
  }

  async getProcessEligibleRolls(destinationAreaCode, { transaction } = {}) {
    const destination = normalizeDestination(destinationAreaCode);
    const stage = stageForArea(destination);
    const [rolls, reservations] = await Promise.all([
      ViajeroRoll.findAll({
        where: { current_stage: 'TELARES', status: 'DISPONIBLE', is_active: true },
        include: [
          { model: ProductionBom, as: 'bom', attributes: ['id', 'code', 'name', 'product_kind', 'target_width_cm', 'target_weight_g_per_m', 'fabric_type'] },
          { model: Loom, as: 'loom', attributes: ['id', 'code', 'name'] },
        ], order: [['created_at', 'ASC'], ['id', 'ASC']], transaction,
      }),
      CorteLaminadoOrderItem.findAll({ where: { status: { [Op.in]: ACTIVE_RESERVATION_STATES }, roll_id: { [Op.ne]: null } }, attributes: ['roll_id'], transaction }),
    ]);
    const reserved = new Set(reservations.map((item) => Number(item.roll_id)));
    return rolls.filter((roll) => !reserved.has(Number(roll.id))
      && normalizeRoute(roll.route).includes(stage)
      && String(roll.next_allowed_stage).toUpperCase() === stage);
  }

  async getProcessDemandOptions(destinationAreaCode) {
    const destination = normalizeDestination(destinationAreaCode);
    const stage = stageForArea(destination);
    const Specification = specificationModelForArea(destination);
    const [specs, rolls] = await Promise.all([
      Specification.findAll({ where: { is_active: true }, order: [['code', 'ASC']] }),
      this.getProcessEligibleRolls(destination),
    ]);
    return specs.map((spec) => ({
      id: spec.id, code: spec.code, name: spec.name,
      output_pti_code: spec.output_pti_code, output_product_name: spec.output_product_name,
      destination_area_code: destination,
      eligible_rolls: rolls.filter((roll) => rollTransformation.compatibility(spec, roll, stage)).map(toRollSummary),
    }));
  }

  async listProcessOrders({ destinationAreaCode, includeClosed = false } = {}) {
    const where = {};
    if (destinationAreaCode) where.destination_area_code = normalizeDestination(destinationAreaCode);
    if (!includeClosed) where.status = { [Op.in]: ACTIVE_PROCESS_ORDER_STATES };
    const orders = await CorteLaminadoOrder.findAll({
      where,
      include: [
        { model: User, as: 'requester', attributes: ['id', 'first_name', 'last_name', 'username'] },
        { model: LaminadoSpecification, as: 'targetSpecification', required: false },
        { model: GloboSpecification, as: 'targetGloboSpecification', required: false },
        { model: CorteLaminadoOrderItem, as: 'items', include: [{ model: ViajeroRoll, as: 'roll', include: [
          { model: Loom, as: 'loom', attributes: ['id', 'code', 'name'] },
          { model: ProductionBom, as: 'bom', attributes: ['id', 'code', 'name'] },
        ] }] },
      ],
      order: [['is_urgent', 'DESC'], ['requested_at', 'ASC'], ['id', 'ASC'], [{ model: CorteLaminadoOrderItem, as: 'items' }, 'id', 'ASC']],
      limit: 200,
    });
    return orders.map((order) => {
      const destination = normalizeDestination(order.destination_area_code || 'LAMINADO');
      const spec = destination === 'GLOBO' ? order.targetGloboSpecification : order.targetSpecification;
      return {
        id: order.id, order_number: order.order_number, status: order.status,
        destination_area_code: destination, is_urgent: Boolean(order.is_urgent), urgent_reason: order.urgent_reason,
        requested_at: order.requested_at,
        requester: order.requester ? `${order.requester.first_name || ''} ${order.requester.last_name || ''}`.trim() || order.requester.username : '—',
        notes: order.notes, requested_roll_count: Number(order.requested_roll_count || order.items?.length || 0),
        target_specification: spec ? { id: spec.id, code: spec.code, output_pti_code: spec.output_pti_code, output_product_name: spec.output_product_name } : null,
        pending_pickup_count: (order.items || []).filter((item) => item.status === 'REQUESTED').length,
        picked_count: (order.items || []).filter((item) => item.status === 'PICKED').length,
        processed_count: (order.items || []).filter((item) => ['PROCESSED', 'RECEIVED'].includes(item.status)).length,
        items: (order.items || []).map((item) => ({ id: item.id, status: item.status, picked_at: item.picked_at, dispatched_at: item.dispatched_at, received_at: item.received_at, roll: item.roll ? toRollSummary(item.roll) : null })),
      };
    });
  }

  async createProcessOrder({ destinationAreaCode, specificationId, requestedRollCount, requestedBy, notes, isUrgent = false, urgentReason }) {
    const destination = normalizeDestination(destinationAreaCode);
    const count = Number(requestedRollCount);
    if (!Number.isInteger(count) || count < 1 || count > 500) throw httpError(400, 'Indica una cantidad entre 1 y 500 rollos.');
    if (isUrgent && !String(urgentReason || '').trim()) throw httpError(400, 'El motivo es obligatorio para priorizar una orden urgente.');
    return sequelize.transaction(async (transaction) => {
      const Specification = specificationModelForArea(destination);
      const spec = await Specification.findByPk(Number(specificationId), { transaction, lock: transaction.LOCK.UPDATE });
      if (!spec || !spec.is_active) throw httpError(400, `Selecciona una especificación activa de ${destination}.`);
      const order = await CorteLaminadoOrder.create({
        order_number: `CL-${randomUUID()}`, requested_by: requestedBy,
        destination_area_code: destination,
        target_specification_id: destination === 'LAMINADO' ? spec.id : null,
        target_globo_specification_id: destination === 'GLOBO' ? spec.id : null,
        requested_roll_count: count, is_urgent: Boolean(isUrgent),
        urgent_reason: isUrgent ? String(urgentReason).trim() : null,
        notes: String(notes || '').trim() || null,
      }, { transaction });
      const orderNumber = `CL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(order.id).padStart(6, '0')}`;
      await order.update({ order_number: orderNumber }, { transaction });
      await CorteLaminadoOrderItem.bulkCreate(Array.from({ length: count }, () => ({ order_id: order.id, roll_id: null })), { transaction });
      return { id: order.id, order_number: orderNumber, status: 'REQUESTED', destination_area_code: destination, is_urgent: Boolean(isUrgent), requested_roll_count: count, specification: { id: spec.id, code: spec.code, output_pti_code: spec.output_pti_code, output_product_name: spec.output_product_name } };
    });
  }

  async pickupProcessRoll({ qrCode, pickedBy, destinationAreaCode }) {
    const clean = normalizeViajeroQr(qrCode);
    if (!clean) throw httpError(400, 'Escanea el QR viajero del rollo.');
    const requestedDestination = normalizeDestination(destinationAreaCode);
    return sequelize.transaction(async (transaction) => {
      const roll = await ViajeroRoll.findOne({
        where: { [Op.or]: [{ qr_code: clean }, { roll_code: clean }, { qr_code: `VIAJERO-${clean}` }, { roll_code: clean.replace(/^VIAJERO-/, '') }], is_active: true },
        include: [
          { model: ProductionBom, as: 'bom', attributes: ['id', 'code', 'name', 'product_kind', 'target_width_cm', 'target_weight_g_per_m', 'fabric_type'] },
          { model: Loom, as: 'loom', attributes: ['id', 'code', 'name'] },
        ], transaction, lock: { level: transaction.LOCK.UPDATE, of: ViajeroRoll },
      });
      if (!roll || roll.current_stage !== 'TELARES' || roll.status !== 'DISPONIBLE') throw httpError(409, 'El QR no identifica un rollo disponible actualmente en Telares.');
      const alreadyReserved = await CorteLaminadoOrderItem.findOne({ where: { roll_id: roll.id, status: { [Op.in]: ACTIVE_RESERVATION_STATES } }, transaction, lock: transaction.LOCK.UPDATE });
      if (alreadyReserved) throw httpError(409, 'Este rollo ya está asignado a una orden; no puede recogerse dos veces.');
      const stage = stageForArea(requestedDestination);
      if (!normalizeRoute(roll.route).includes(stage) || String(roll.next_allowed_stage).toUpperCase() !== stage) throw httpError(409, `La ruta del rollo no autoriza ${requestedDestination} como siguiente proceso.`);

      const queuedOrders = await CorteLaminadoOrder.findAll({
        where: { destination_area_code: requestedDestination, status: { [Op.in]: ['REQUESTED', 'PARTIALLY_PICKED'] } },
        include: [
          { model: LaminadoSpecification, as: 'targetSpecification', required: false },
          { model: GloboSpecification, as: 'targetGloboSpecification', required: false },
        ], order: [['is_urgent', 'DESC'], ['requested_at', 'ASC'], ['id', 'ASC']],
        transaction, lock: { level: transaction.LOCK.UPDATE, of: CorteLaminadoOrder },
      });
      let assignment = null;
      for (const order of queuedOrders) {
        const spec = requestedDestination === 'GLOBO' ? order.targetGloboSpecification : order.targetSpecification;
        if (!spec || !spec.is_active || !rollTransformation.compatibility(spec, roll, stage)) continue;
        const pendingLine = await CorteLaminadoOrderItem.findOne({ where: { order_id: order.id, roll_id: null, status: 'REQUESTED' }, transaction, lock: transaction.LOCK.UPDATE });
        if (!pendingLine) continue;
        const fifoRolls = (await this.getProcessEligibleRolls(requestedDestination, { transaction }))
          .filter((candidate) => rollTransformation.compatibility(spec, candidate, stage));
        if (!fifoRolls.length || Number(fifoRolls[0].id) !== Number(roll.id)) {
          throw httpError(409, `Recogida FIFO: escanea primero ${fifoRolls[0]?.roll_code || 'el rollo compatible más antiguo'}.`);
        }
        assignment = { order, spec, line: pendingLine };
        break;
      }
      if (!assignment) throw httpError(409, `No hay una orden pendiente de ${requestedDestination} compatible con este rollo.`);

      const { order, spec, line } = assignment;
      const pickedAt = new Date();
      await line.update({ roll_id: roll.id, status: 'PICKED', picked_by: pickedBy, picked_at: pickedAt }, { transaction });
      const pendingCount = await CorteLaminadoOrderItem.count({ where: { order_id: order.id, status: 'REQUESTED' }, transaction });
      await order.update({ status: pendingCount === 0 ? 'PICKED' : 'PARTIALLY_PICKED' }, { transaction });

      const area = await Area.findOne({ where: { code: requestedDestination }, transaction });
      const qr = await QrCode.findByPk(roll.virgin_qr_code_id, { transaction, lock: transaction.LOCK.UPDATE });
      const traceable = qr ? await TraceableItem.findOne({ where: { qr_code_id: qr.id }, transaction, lock: transaction.LOCK.UPDATE }) : null;
      if (!area || !qr || !traceable) throw httpError(409, 'No se pudo confirmar la custodia; se requiere área, QR y genealogía activos.');
      const fromAreaId = traceable.current_area_id;
      await qr.update({ current_area_id: area.id, used_by: pickedBy, used_at: pickedAt }, { transaction });
      await traceable.update({ current_area_id: area.id, status: 'RECIBIDO', location: `WIP de ${requestedDestination}`, updated_by: pickedBy }, { transaction });
      await TraceabilityMovement.create({
        traceable_item_id: traceable.id, qr_code_id: qr.id, movement_type: 'TRANSFERENCIA_AREA',
        from_area_id: fromAreaId, to_area_id: area.id, quantity: Number(roll.weight_kg), unit: 'KG',
        balance_after: Number(traceable.quantity_current), reference_folio: order.order_number,
        notes: `Recogida agrupada en Telares para ${requestedDestination}; orden de Corte ${order.order_number}.`,
        metadata: { roll_id: roll.id, order_id: order.id, destination_area_code: requestedDestination, pickup_kind: 'CORTE_BATCH_FIFO' }, performed_by: pickedBy,
      }, { transaction });
      await ViajeroRoutingLog.create({
        viajero_roll_id: roll.id, from_stage: 'TELARES', to_stage: stage, area_id: area.id, operator_id: pickedBy,
        action: 'RECOGIDA_ORDEN_CORTE_CONFIRMADA', notes: `Custodia de ${roll.roll_code} transferida a ${requestedDestination}; orden ${order.order_number}.`,
      }, { transaction });
      const corteArea = await Area.findOne({ where: { code: 'CORTE' }, transaction });
      if (corteArea) await ViajeroRoutingLog.create({
        viajero_roll_id: roll.id, from_stage: 'TELARES', to_stage: stage, area_id: corteArea.id, operator_id: order.requested_by,
        action: 'SOLICITUD_CORTE_ROLLO_ASIGNADO', notes: `Orden ${order.order_number}: PTI ${spec.output_pti_code || spec.code}; destino ${requestedDestination}; rollo ${roll.roll_code}.`,
      }, { transaction });
      return { success: true, order_id: order.id, order_number: order.order_number, order_status: order.status, destination_area_code: requestedDestination, roll: toRollSummary(roll), message: `${roll.roll_code} recibido en WIP de ${requestedDestination}. Escanea su QR nuevamente al iniciar el proceso.` };
    });
  }
}

function normalizeRoute(route) {
  return (Array.isArray(route) ? route : []).map((stage) => String(stage || '').trim().toUpperCase());
}
function normalizeDestination(destination) {
  const code = String(destination || '').trim().toUpperCase();
  if (['GLOBO', 'LINER'].includes(code)) return 'GLOBO';
  if (code === 'LAMINADO') return 'LAMINADO';
  throw httpError(400, 'Destino de proceso inválido. Usa Laminado o Liner/Globo.');
}
function stageForArea(areaCode) { return areaCode === 'GLOBO' ? 'GLOBO' : 'LAMINADO'; }
function specificationModelForArea(areaCode) { return areaCode === 'GLOBO' ? GloboSpecification : LaminadoSpecification; }
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
