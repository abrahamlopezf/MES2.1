const { Op } = require('sequelize');

const {
  sequelize,
  QrBatch,
  QrCode,
  QrEvent,
  Area,
  User,
} = require('../../database/models');

const {
  isAdmin,
  isSuperadmin,
  throwHttpError,
} = require('../../shared/security/accessRules');

const {
  QR_STATUS,
  QR_BATCH_STATUS,
  QR_EVENT_TYPE,
} = require('./qr.constants');

const CHUNK_SIZE = 1000;

const canManageAllAreas = (currentUser) => {
  return isSuperadmin(currentUser) || isAdmin(currentUser);
};

const getUserAreaId = (currentUser) => {
  return currentUser?.area?.id || currentUser?.areaId || null;
};

const assertCanUseArea = async (areaId, currentUser, transaction = null) => {
  if (!areaId) {
    throwHttpError('Debes indicar un área válida.', 400);
  }

  const area = await Area.findByPk(areaId, {
    transaction,
  });

  if (!area || !area.is_active) {
    throwHttpError('El área seleccionada no existe o está inactiva.', 400);
  }

  if (!canManageAllAreas(currentUser)) {
    const userAreaId = getUserAreaId(currentUser);

    if (!userAreaId || Number(userAreaId) !== Number(areaId)) {
      throwHttpError('Solo puedes operar códigos QR de tu propia área.', 403);
    }
  }

  return area;
};

const getQrVisibilityWhere = (currentUser) => {
  if (canManageAllAreas(currentUser)) return {};

  const userAreaId = getUserAreaId(currentUser);

  if (!userAreaId) {
    return {
      id: null,
    };
  }

  return {
    [Op.or]: [
      { assigned_area_id: userAreaId },
      { current_area_id: userAreaId },
    ],
  };
};

const generateBatchCode = () => {
  const now = new Date();
  const datePart = now
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '');

  const timePart = now
    .toISOString()
    .slice(11, 19)
    .replace(/:/g, '');

  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();

  return `QRB-${datePart}-${timePart}-${randomPart}`;
};

const buildQrCodeValue = (batchCode, serialNumber) => {
  return `${batchCode}-${String(serialNumber).padStart(6, '0')}`;
};

const buildAreaResponse = (area) => {
  if (!area) return null;

  return {
    id: area.id,
    name: area.name,
    code: area.code,
    description: area.description,
    is_active: area.is_active,
  };
};

const buildUserMiniResponse = (user) => {
  if (!user) return null;

  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    username: user.username,
  };
};

const buildQrResponse = (qrCode) => {
  if (!qrCode) return null;

  const plainQr = qrCode.get ? qrCode.get({ plain: true }) : qrCode;

  return {
    id: plainQr.id,
    qr_code: plainQr.qr_code,
    batch_id: plainQr.batch_id,
    batch: plainQr.batch
      ? {
          id: plainQr.batch.id,
          batch_code: plainQr.batch.batch_code,
          quantity: plainQr.batch.quantity,
          status: plainQr.batch.status,
        }
      : null,
    assigned_area: buildAreaResponse(plainQr.assignedArea),
    current_area: buildAreaResponse(plainQr.currentArea),
    status: plainQr.status,
    entity_type: plainQr.entity_type,
    entity_id: plainQr.entity_id,
    is_active: plainQr.is_active,
    created_by: buildUserMiniResponse(plainQr.creator),
    assigned_by: buildUserMiniResponse(plainQr.assignedByUser),
    used_by: buildUserMiniResponse(plainQr.usedByUser),
    cancelled_by: buildUserMiniResponse(plainQr.cancelledByUser),
    assigned_at: plainQr.assigned_at,
    used_at: plainQr.used_at,
    cancelled_at: plainQr.cancelled_at,
    cancel_reason: plainQr.cancel_reason,
    created_at: plainQr.created_at,
    updated_at: plainQr.updated_at,
  };
};

const buildBatchResponse = (batch) => {
  if (!batch) return null;

  const plainBatch = batch.get ? batch.get({ plain: true }) : batch;

  return {
    id: plainBatch.id,
    batch_code: plainBatch.batch_code,
    quantity: plainBatch.quantity,
    status: plainBatch.status,
    notes: plainBatch.notes,
    assigned_area: buildAreaResponse(plainBatch.assignedArea),
    created_by: buildUserMiniResponse(plainBatch.creator),
    created_at: plainBatch.created_at,
    updated_at: plainBatch.updated_at,
  };
};

const buildEventResponse = (event) => {
  if (!event) return null;

  const plainEvent = event.get ? event.get({ plain: true }) : event;

  return {
    id: plainEvent.id,
    event_type: plainEvent.event_type,
    from_status: plainEvent.from_status,
    to_status: plainEvent.to_status,
    from_area: buildAreaResponse(plainEvent.fromArea),
    to_area: buildAreaResponse(plainEvent.toArea),
    performed_by: buildUserMiniResponse(plainEvent.performedByUser),
    description: plainEvent.description,
    metadata: plainEvent.metadata || {},
    created_at: plainEvent.created_at,
  };
};

const qrInclude = [
  {
    model: QrBatch,
    as: 'batch',
  },
  {
    model: Area,
    as: 'assignedArea',
  },
  {
    model: Area,
    as: 'currentArea',
  },
  {
    model: User,
    as: 'creator',
    attributes: ['id', 'first_name', 'last_name', 'username'],
  },
  {
    model: User,
    as: 'assignedByUser',
    attributes: ['id', 'first_name', 'last_name', 'username'],
  },
  {
    model: User,
    as: 'usedByUser',
    attributes: ['id', 'first_name', 'last_name', 'username'],
  },
  {
    model: User,
    as: 'cancelledByUser',
    attributes: ['id', 'first_name', 'last_name', 'username'],
  },
];

const eventInclude = [
  {
    model: User,
    as: 'performedByUser',
    attributes: ['id', 'first_name', 'last_name', 'username'],
  },
  {
    model: Area,
    as: 'fromArea',
  },
  {
    model: Area,
    as: 'toArea',
  },
];

const createQrEvent = async ({
  qrCodeId,
  eventType,
  fromStatus = null,
  toStatus = null,
  fromAreaId = null,
  toAreaId = null,
  performedBy,
  description = null,
  metadata = {},
  transaction = null,
}) => {
  return QrEvent.create(
    {
      qr_code_id: qrCodeId,
      event_type: eventType,
      from_status: fromStatus,
      to_status: toStatus,
      from_area_id: fromAreaId,
      to_area_id: toAreaId,
      performed_by: performedBy,
      description,
      metadata,
    },
    {
      transaction,
    }
  );
};

const generateQrBatch = async (payload, currentUser) => {
  return sequelize.transaction(async (transaction) => {
    let assignedAreaId = payload.assigned_area_id || null;

    if (!canManageAllAreas(currentUser)) {
      assignedAreaId = getUserAreaId(currentUser);

      if (!assignedAreaId) {
        throwHttpError('Tu usuario no tiene un área asignada para generar QR.', 403);
      }
    }

    if (assignedAreaId) {
      await assertCanUseArea(assignedAreaId, currentUser, transaction);
    }

    const batchCode = generateBatchCode();

    const batch = await QrBatch.create(
      {
        batch_code: batchCode,
        quantity: payload.quantity,
        assigned_area_id: assignedAreaId,
        status: assignedAreaId ? QR_BATCH_STATUS.ASSIGNED : QR_BATCH_STATUS.CREATED,
        notes: payload.notes || null,
        created_by: currentUser.id,
      },
      {
        transaction,
      }
    );

    const status = assignedAreaId ? QR_STATUS.DISPONIBLE : QR_STATUS.GENERADO;
    const now = new Date();

    for (let start = 1; start <= payload.quantity; start += CHUNK_SIZE) {
      const end = Math.min(start + CHUNK_SIZE - 1, payload.quantity);
      const rows = [];

      for (let serial = start; serial <= end; serial += 1) {
        rows.push({
          qr_code: buildQrCodeValue(batchCode, serial),
          batch_id: batch.id,
          assigned_area_id: assignedAreaId,
          current_area_id: assignedAreaId,
          status,
          created_by: currentUser.id,
          assigned_by: assignedAreaId ? currentUser.id : null,
          assigned_at: assignedAreaId ? now : null,
          is_active: true,
          created_at: now,
          updated_at: now,
        });
      }

      await QrCode.bulkCreate(rows, {
        transaction,
      });
    }

    const generatedCodes = await QrCode.findAll({
      where: {
        batch_id: batch.id,
      },
      attributes: ['id'],
      transaction,
    });

    const eventRows = generatedCodes.map((code) => ({
      qr_code_id: code.id,
      event_type: assignedAreaId ? QR_EVENT_TYPE.ASSIGNED : QR_EVENT_TYPE.GENERATED,
      from_status: null,
      to_status: status,
      from_area_id: null,
      to_area_id: assignedAreaId,
      performed_by: currentUser.id,
      description: assignedAreaId
        ? 'Código QR generado y asignado al área.'
        : 'Código QR generado sin área asignada.',
      metadata: {
        batch_code: batchCode,
      },
      created_at: now,
      updated_at: now,
    }));

    for (let start = 0; start < eventRows.length; start += CHUNK_SIZE) {
      await QrEvent.bulkCreate(eventRows.slice(start, start + CHUNK_SIZE), {
        transaction,
      });
    }

    const createdBatch = await QrBatch.findByPk(batch.id, {
      include: [
        {
          model: Area,
          as: 'assignedArea',
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'first_name', 'last_name', 'username'],
        },
      ],
      transaction,
    });

    return {
      batch: buildBatchResponse(createdBatch),
      generated_quantity: payload.quantity,
      initial_status: status,
    };
  });
};

const getQrCodes = async (query, currentUser) => {
  const where = {
    ...getQrVisibilityWhere(currentUser),
  };

  if (query.status) {
    where.status = query.status;
  }

  if (query.area_id) {
    await assertCanUseArea(Number(query.area_id), currentUser);

    where[Op.or] = [
      { assigned_area_id: Number(query.area_id) },
      { current_area_id: Number(query.area_id) },
    ];
  }

  if (query.search) {
    where.qr_code = {
      [Op.iLike]: `%${query.search}%`,
    };
  }

  const limit = Math.min(Number(query.limit) || 100, 500);
  const offset = Number(query.offset) || 0;

  const { rows, count } = await QrCode.findAndCountAll({
    where,
    include: qrInclude,
    order: [['id', 'DESC']],
    limit,
    offset,
  });

  return {
    total: count,
    limit,
    offset,
    items: rows.map(buildQrResponse),
  };
};

const getQrCodeByValue = async (qrCodeValue, currentUser) => {
  const qrCode = await QrCode.findOne({
    where: {
      qr_code: qrCodeValue,
      ...getQrVisibilityWhere(currentUser),
    },
    include: qrInclude,
  });

  if (!qrCode) {
    throwHttpError('Código QR no encontrado.', 404);
  }

  return buildQrResponse(qrCode);
};

const getQrEvents = async (qrCodeId, currentUser) => {
  const qrCode = await QrCode.findOne({
    where: {
      id: qrCodeId,
      ...getQrVisibilityWhere(currentUser),
    },
  });

  if (!qrCode) {
    throwHttpError('Código QR no encontrado.', 404);
  }

  const events = await QrEvent.findAll({
    where: {
      qr_code_id: qrCode.id,
    },
    include: eventInclude,
    order: [['created_at', 'ASC']],
  });

  return events.map(buildEventResponse);
};

const assignQrCodes = async (payload, currentUser) => {
  return sequelize.transaction(async (transaction) => {
    const area = await assertCanUseArea(payload.area_id, currentUser, transaction);

    let qrCodes = [];

    if (payload.qr_code_ids?.length) {
      qrCodes = await QrCode.findAll({
        where: {
          id: payload.qr_code_ids,
          status: QR_STATUS.GENERADO,
          is_active: true,
          ...getQrVisibilityWhere(currentUser),
        },
        transaction,
      });

      if (qrCodes.length !== payload.qr_code_ids.length) {
        throwHttpError('Uno o más códigos QR no existen o no están disponibles para asignación.', 400);
      }
    } else {
      qrCodes = await QrCode.findAll({
        where: {
          batch_id: payload.batch_id,
          status: QR_STATUS.GENERADO,
          is_active: true,
          ...getQrVisibilityWhere(currentUser),
        },
        order: [['id', 'ASC']],
        limit: payload.quantity,
        transaction,
      });

      if (qrCodes.length < payload.quantity) {
        throwHttpError('El lote no tiene suficientes códigos QR disponibles para asignar.', 400);
      }
    }

    const now = new Date();

    await QrCode.update(
      {
        assigned_area_id: area.id,
        current_area_id: area.id,
        status: QR_STATUS.DISPONIBLE,
        assigned_by: currentUser.id,
        assigned_at: now,
      },
      {
        where: {
          id: qrCodes.map((qrCode) => qrCode.id),
        },
        transaction,
      }
    );

    const eventRows = qrCodes.map((qrCode) => ({
      qr_code_id: qrCode.id,
      event_type: QR_EVENT_TYPE.ASSIGNED,
      from_status: qrCode.status,
      to_status: QR_STATUS.DISPONIBLE,
      from_area_id: qrCode.current_area_id,
      to_area_id: area.id,
      performed_by: currentUser.id,
      description: 'Código QR asignado al área.',
      metadata: {
        area_code: area.code,
        area_name: area.name,
      },
      created_at: now,
      updated_at: now,
    }));

    await QrEvent.bulkCreate(eventRows, {
      transaction,
    });

    return {
      assigned_quantity: qrCodes.length,
      area: buildAreaResponse(area),
    };
  });
};

const validateQrForUse = async (payload, currentUser) => {
  return sequelize.transaction(async (transaction) => {
    const targetAreaId = payload.area_id || getUserAreaId(currentUser);

    if (targetAreaId) {
      await assertCanUseArea(targetAreaId, currentUser, transaction);
    }

    const qrCode = await QrCode.findOne({
      where: {
        qr_code: payload.qr_code,
        ...getQrVisibilityWhere(currentUser),
      },
      include: qrInclude,
      transaction,
    });

    if (!qrCode) {
      throwHttpError('Código QR no encontrado.', 404);
    }

    if (!qrCode.is_active) {
      throwHttpError('El código QR está inactivo.', 400);
    }

    if (targetAreaId && Number(qrCode.current_area_id) !== Number(targetAreaId)) {
      throwHttpError('Este código QR no pertenece al área indicada.', 400);
    }

    if (payload.require_available !== false && qrCode.status !== QR_STATUS.DISPONIBLE) {
      throwHttpError(`El código QR no está disponible. Estado actual: ${qrCode.status}.`, 400);
    }

    await createQrEvent({
      qrCodeId: qrCode.id,
      eventType: QR_EVENT_TYPE.VALIDATED,
      fromStatus: qrCode.status,
      toStatus: qrCode.status,
      fromAreaId: qrCode.current_area_id,
      toAreaId: qrCode.current_area_id,
      performedBy: currentUser.id,
      description: 'Código QR validado para operación.',
      metadata: {
        require_available: payload.require_available !== false,
      },
      transaction,
    });

    return {
      is_valid: true,
      qr: buildQrResponse(qrCode),
    };
  });
};

const cancelQrCode = async (qrCodeId, payload, currentUser) => {
  return sequelize.transaction(async (transaction) => {
    const qrCode = await QrCode.findOne({
      where: {
        id: qrCodeId,
        ...getQrVisibilityWhere(currentUser),
      },
      transaction,
    });

    if (!qrCode) {
      throwHttpError('Código QR no encontrado.', 404);
    }

    if (qrCode.entity_type || qrCode.entity_id || qrCode.status === QR_STATUS.EN_USO) {
      throwHttpError('No puedes cancelar un QR que ya está vinculado a una operación.', 400);
    }

    if (qrCode.status === QR_STATUS.CANCELADO) {
      throwHttpError('Este código QR ya está cancelado.', 400);
    }

    const previousStatus = qrCode.status;
    const now = new Date();

    await qrCode.update(
      {
        status: QR_STATUS.CANCELADO,
        is_active: false,
        cancelled_by: currentUser.id,
        cancelled_at: now,
        cancel_reason: payload.reason,
      },
      {
        transaction,
      }
    );

    await createQrEvent({
      qrCodeId: qrCode.id,
      eventType: QR_EVENT_TYPE.CANCELLED,
      fromStatus: previousStatus,
      toStatus: QR_STATUS.CANCELADO,
      fromAreaId: qrCode.current_area_id,
      toAreaId: qrCode.current_area_id,
      performedBy: currentUser.id,
      description: payload.reason,
      metadata: {
        reason: payload.reason,
      },
      transaction,
    });

    const updatedQr = await QrCode.findByPk(qrCode.id, {
      include: qrInclude,
      transaction,
    });

    return buildQrResponse(updatedQr);
  });
};

module.exports = {
  generateQrBatch,
  getQrCodes,
  getQrCodeByValue,
  getQrEvents,
  assignQrCodes,
  validateQrForUse,
  cancelQrCode,
};