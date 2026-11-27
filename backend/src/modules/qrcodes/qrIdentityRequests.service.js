'use strict';

const {
  sequelize,
  QrBatch,
  Area,
  QrCode,
  QrAreaAssignment,
  QrIdentityRequest,
  QrIdentityRequestItem,
  TraceabilityEvent,
} = require('../../database/models');
const { Op } = require('sequelize');
const { QR_STATUS, QR_BATCH_STATUS, QR_EVENT_TYPE } = require('./qr.constants');
const { canRequestQrForOwnArea, getAreaId, isWarehouseQrClerk } = require('./qrIdentityRequestAccess');

const fail = (message, statusCode, code) => Object.assign(new Error(message), { statusCode, code });
const requestIncludes = [
  { model: Area, as: 'area', attributes: ['id', 'code', 'name'] },
  { model: QrIdentityRequestItem, as: 'items', include: [{ model: QrCode, as: 'qr_code', attributes: ['id', 'uuid', 'qr_code', 'status'] }] },
];
const toResponse = (request) => {
  const plain = request.get ? request.get({ plain: true }) : request;
  return {
    ...plain,
    status: plain.delivered_at ? 'DELIVERED' : 'PENDING',
    delivered_quantity: (plain.items || []).length,
  };
};

const createQrIdentityRequest = async ({ requested_quantity, notes }, currentUser) => {
  if (!canRequestQrForOwnArea(currentUser)) throw fail('Solo un usuario operativo de área puede solicitar QR para su propia área.', 403, 'QR_REQUEST_AREA_FORBIDDEN');
  const areaId = getAreaId(currentUser);
  return sequelize.transaction(async (transaction) => {
    const area = await Area.findByPk(areaId, { transaction });
    if (!area) throw fail('No se encontró el área efectiva del usuario.', 403, 'QR_REQUEST_AREA_NOT_FOUND');
    const created = await QrIdentityRequest.create({
      area_id: area.id,
      requested_by: currentUser.id,
      requested_quantity,
      notes: notes || null,
      requested_at: new Date(),
    }, { transaction });
    const request = await QrIdentityRequest.findByPk(created.id, { include: requestIncludes, transaction });
    return toResponse(request);
  });
};

const listQrIdentityRequests = async (currentUser) => {
  const warehouse = isWarehouseQrClerk(currentUser);
  const areaId = getAreaId(currentUser);
  if (!warehouse && (!areaId || !canRequestQrForOwnArea(currentUser))) throw fail('No tienes un área operativa autorizada para consultar solicitudes QR.', 403, 'QR_REQUEST_LIST_FORBIDDEN');
  const rows = await QrIdentityRequest.findAll({
    where: warehouse ? {} : { area_id: areaId },
    include: requestIncludes,
    order: [['requested_at', 'DESC'], ['id', 'DESC']],
  });
  return rows.map(toResponse);
};

const listAvailableQrCodesForWarehouse = async (currentUser, requestedLimit = 500, requestedOffset = 0) => {
  if (!isWarehouseQrClerk(currentUser)) throw fail('Solo el personal de Almacén puede consultar QR vírgenes para surtir solicitudes.', 403, 'QR_REQUEST_AVAILABLE_CODES_FORBIDDEN');
  const limit = Math.min(Math.max(Number(requestedLimit) || 100, 1), 500);
  const offset = Math.max(Number(requestedOffset) || 0, 0);
  const { rows, count } = await QrCode.findAndCountAll({
    where: { status: QR_STATUS.UNASSIGNED, is_active: true },
    attributes: ['id', 'qr_code', 'batch_id', 'status', 'assigned_area_id'],
    include: [{ model: QrBatch, as: 'batch', attributes: ['assigned_area_id'] }],
    order: [['id', 'ASC']],
    limit,
    offset,
  });
  return { items: rows.map((code) => {
    const plain = code.get ? code.get({ plain: true }) : code;
    return { ...plain, batch_assigned_area_id: plain.batch?.assigned_area_id ?? null };
  }), total: count, limit, offset };
};

const fulfillQrIdentityRequest = async (requestId, qrCodeIds, currentUser) => {
  if (!isWarehouseQrClerk(currentUser)) throw fail('Solo el personal de Almacén puede surtir solicitudes de QR.', 403, 'QR_REQUEST_FULFILL_FORBIDDEN');
  if (!Array.isArray(qrCodeIds) || qrCodeIds.length === 0 || qrCodeIds.some((id) => !Number.isInteger(Number(id)) || Number(id) < 1)) {
    throw fail('Escanea y selecciona los códigos QR que se entregarán.', 400, 'QR_REQUEST_INVALID_CODES');
  }
  const ids = qrCodeIds.map(Number);
  if (new Set(ids).size !== ids.length) throw fail('La selección contiene códigos QR repetidos.', 400, 'QR_REQUEST_DUPLICATE_CODES');
  ids.sort((a, b) => a - b);

  return sequelize.transaction(async (transaction) => {
    const request = await QrIdentityRequest.findByPk(requestId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!request) throw fail('Solicitud de QR no encontrada.', 404, 'QR_REQUEST_NOT_FOUND');
    if (request.delivered_at) throw fail('Esta solicitud ya fue surtida.', 409, 'QR_REQUEST_ALREADY_DELIVERED');
    if (ids.length !== Number(request.requested_quantity)) {
      throw fail(`La solicitud requiere exactamente ${request.requested_quantity} QR; la selección contiene ${ids.length}.`, 400, 'QR_REQUEST_EXACT_QUANTITY_REQUIRED');
    }

    const codes = await QrCode.findAll({
      where: { id: ids, status: QR_STATUS.UNASSIGNED, is_active: true },
      order: [['id', 'ASC']],
      attributes: ['id', 'batch_id', 'status', 'assigned_area_id'],
      include: [{ model: QrBatch, as: 'batch', attributes: ['assigned_area_id'] }],
      transaction,
      lock: { level: transaction.LOCK.UPDATE, of: QrCode },
    });
    if (codes.length !== ids.length) throw fail('Uno o más QR no están vírgenes y disponibles para surtir.', 409, 'QR_REQUEST_CODES_UNAVAILABLE');
    const areaMismatch = codes.some((code) => {
      const qrAreaId = Number(code.assigned_area_id || 0) || null;
      const batchAreaId = Number(code.batch?.assigned_area_id || 0) || null;
      return (qrAreaId && qrAreaId !== Number(request.area_id)) || (batchAreaId && batchAreaId !== Number(request.area_id));
    });
    if (areaMismatch) throw fail('Uno o más QR pertenecen a un lote destinado a otra área.', 409, 'QR_REQUEST_AREA_MISMATCH');

    const now = new Date();
    const assignments = [];
    for (const code of codes) {
      assignments.push(await QrAreaAssignment.create({
        qr_code_id: code.id,
        area_id: request.area_id,
        assigned_to_user_id: request.requested_by,
        status: 'ACTIVA',
        assigned_at: now,
        notes: `Entrega de solicitud QR ${request.id}.`,
        created_by: currentUser.id,
        updated_by: currentUser.id,
      }, { transaction }));
    }

    const [updatedCount] = await QrCode.update({
      assigned_area_id: request.area_id,
      status: QR_STATUS.ASSIGNED,
    }, {
      where: {
        id: ids,
        status: QR_STATUS.UNASSIGNED,
        is_active: true,
        [Op.or]: [{ assigned_area_id: null }, { assigned_area_id: request.area_id }],
      },
      transaction,
    });
    if (updatedCount !== ids.length) throw fail('Cambió la disponibilidad de un QR durante la entrega; no se confirmó el surtido.', 409, 'QR_REQUEST_CONCURRENT_CHANGE');

    for (const batchId of new Set(codes.map((code) => Number(code.batch_id)))) {
      const remaining = await QrCode.count({ where: { batch_id: batchId, status: QR_STATUS.UNASSIGNED, is_active: true }, transaction });
      if (remaining === 0) await QrBatch.update({ status: QR_BATCH_STATUS.ASSIGNED }, { where: { id: batchId }, transaction });
    }

    await QrIdentityRequestItem.bulkCreate(codes.map((code, index) => ({
      request_id: request.id,
      qr_code_id: code.id,
      qr_area_assignment_id: assignments[index].id,
      delivered_at: now,
    })), { transaction });
    await TraceabilityEvent.bulkCreate(codes.map((code) => ({
      qr_code_id: code.id,
      event_type: QR_EVENT_TYPE.ASSIGNED,
      from_status: code.status,
      to_status: QR_STATUS.ASSIGNED,
      from_area_id: code.assigned_area_id || null,
      to_area_id: request.area_id,
      performed_by: currentUser.id,
      notes: `QR entregado por Almacén para solicitud ${request.id}.`,
      metadata: { identity_request_id: request.id, warehouse_delivery_confirmed: true },
      created_at: now,
      updated_at: now,
    })), { transaction });

    await request.update({ delivered_by: currentUser.id, delivered_at: now }, { transaction });
    const delivered = await QrIdentityRequest.findByPk(request.id, { include: requestIncludes, transaction });
    return toResponse(delivered);
  });
};

module.exports = { createQrIdentityRequest, fulfillQrIdentityRequest, listQrIdentityRequests, listAvailableQrCodesForWarehouse };
