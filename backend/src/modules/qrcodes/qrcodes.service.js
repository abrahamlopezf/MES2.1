const { Op } = require('sequelize');

const {
  sequelize,
  QrBatch,
  QrCode,
  TraceabilityEvent,
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
      { assigned_area_id: userAreaId },
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

const buildQrCodeValue = (nomenclaturePrefix, serialNumber) => {
  return `${nomenclaturePrefix}-${String(serialNumber).padStart(9, '0')}`;
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
    status: plainQr.status,
    is_active: plainQr.is_active,
    created_by: buildUserMiniResponse(plainQr.creator),
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
    created_at: plainBatch.created_at || plainBatch.createdAt,
    updated_at: plainBatch.updated_at || plainBatch.updatedAt,
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
    notes: plainEvent.notes,
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
    model: User,
    as: 'creator',
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

const createTraceabilityEvent = async ({
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
  return TraceabilityEvent.create(
    {
      qr_code_id: qrCodeId,
      event_type: eventType,
      from_status: fromStatus,
      to_status: toStatus,
      from_area_id: fromAreaId,
      to_area_id: toAreaId,
      performed_by: performedBy,
      notes: description,
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

    if (!assignedAreaId && payload.area_code) {
      const area = await Area.findOne({ where: { code: payload.area_code }, transaction });
      if (area) assignedAreaId = area.id;
    }

    if (!canManageAllAreas(currentUser)) {
      assignedAreaId = getUserAreaId(currentUser);

      if (!assignedAreaId) {
        throwHttpError('Tu usuario no tiene un área asignada para generar QR.', 403);
      }
    }

    if (!assignedAreaId) {
      throwHttpError('Debes seleccionar un área para generar los códigos QR.', 400);
    }

    await assertCanUseArea(assignedAreaId, currentUser, transaction);

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

    const nomenclaturePrefix = payload.nomenclature_prefix || 'UND-UND-UND';
    const status = QR_STATUS.UNASSIGNED; // Starts unassigned despite area, waiting for warehouse reception
    const now = new Date();

    // Obtener los siguientes N seriales de la secuencia
    const seqResult = await sequelize.query(
      `SELECT nextval('qr_code_serial_seq') as serial FROM generate_series(1, :qty);`,
      {
        replacements: { qty: payload.quantity },
        type: sequelize.QueryTypes.SELECT,
        transaction,
      }
    );
    const serials = seqResult.map(r => Number(r.serial));

    for (let start = 0; start < payload.quantity; start += CHUNK_SIZE) {
      const end = Math.min(start + CHUNK_SIZE, payload.quantity);
      const rows = [];

      for (let i = start; i < end; i++) {
        const serial = serials[i];
        const crypto = require('crypto');
        rows.push({
          uuid: crypto.randomUUID(),
          serial,
          qr_code: buildQrCodeValue(nomenclaturePrefix, serial),
          batch_id: batch.id,
          assigned_area_id: assignedAreaId,
          status,
          created_by: currentUser.id,
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

      const crypto = require('crypto');
      const eventRows = generatedCodes.map((code) => ({
        uuid: crypto.randomUUID(),
        qr_code_id: code.id,
        event_type: assignedAreaId ? QR_EVENT_TYPE.ASSIGNED : QR_EVENT_TYPE.GENERATED,
        from_status: null,
        to_status: status,
        from_area_id: null,
        to_area_id: assignedAreaId,
        performed_by: currentUser.id,
        notes: assignedAreaId
          ? 'Código QR generado y asignado al área.'
          : 'Código QR generado sin área asignada.',
        metadata: {
          batch_code: batchCode,
        },
        created_at: now,
        updated_at: now,
      }));

    for (let start = 0; start < eventRows.length; start += CHUNK_SIZE) {
      await TraceabilityEvent.bulkCreate(eventRows.slice(start, start + CHUNK_SIZE), {
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
      { assigned_area_id: Number(query.area_id) },
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

const getQrBatches = async (query, currentUser) => {
  const where = {};
  if (query.status) where.status = query.status;
  
  const limit = Math.min(Number(query.limit) || 100, 500);
  const offset = Number(query.offset) || 0;

  const { rows, count } = await QrBatch.findAndCountAll({
    where,
    include: [
      {
        model: QrCode,
        as: 'codes',
        attributes: ['id', 'qr_code', 'status', 'is_active', 'serial', 'uuid'],
      },
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
    order: [['id', 'DESC']],
    limit,
    offset,
  });

  const items = await Promise.all(rows.map(async (batch) => {
    const plainBatch = batch.get ? batch.get({ plain: true }) : batch;
    
    const available_quantity = batch.codes ? batch.codes.filter(c => (c.status === QR_STATUS.UNASSIGNED || c.status === QR_STATUS.ASSIGNED) && c.is_active).length : 0;
    const tokens = batch.codes ? batch.codes.map(c => ({
      tokenId: c.uuid,
      industrialCode: c.qr_code,
      status: c.status
    })) : [];

    return {
      ...buildBatchResponse(batch),
      available_quantity,
      tokens
    };
  }));

  return {
    total: count,
    limit,
    offset,
    items,
  };
};

const getQrBatchById = async (batchId, currentUser) => {
  const batch = await QrBatch.findByPk(batchId, {
    include: [
      {
        model: QrCode,
        as: 'codes',
        attributes: ['id', 'qr_code', 'status', 'is_active', 'serial', 'uuid'],
      },
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
  });

  if (!batch) {
    throwHttpError('Lote no encontrado.', 404);
  }

  const plainBatch = batch.get({ plain: true });
  
  const available_quantity = batch.codes ? batch.codes.filter(c => (c.status === QR_STATUS.UNASSIGNED || c.status === QR_STATUS.ASSIGNED) && c.is_active).length : 0;
  const tokens = batch.codes ? batch.codes.map(c => ({
    tokenId: c.uuid,
    industrialCode: c.qr_code,
    status: c.status
  })) : [];

  return {
    ...buildBatchResponse(batch),
    available_quantity,
    tokens
  };
};

const getQrCodeByValue = async (qrCodeValue, currentUser) => {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(qrCodeValue);
  
  const where = {
    ...getQrVisibilityWhere(currentUser),
  };
  
  if (isUuid) {
    where[Op.or] = [
      { qr_code: qrCodeValue },
      { uuid: qrCodeValue }
    ];
  } else {
    where.qr_code = qrCodeValue;
  }

  const qrCode = await QrCode.findOne({
    where,
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

  const events = await TraceabilityEvent.findAll({
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
          status: QR_STATUS.UNASSIGNED,
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
          status: QR_STATUS.UNASSIGNED,
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
        status: QR_STATUS.ASSIGNED,
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
      to_status: QR_STATUS.ASSIGNED,
      from_area_id: qrCode.assigned_area_id,
      to_area_id: area.id,
      performed_by: currentUser.id,
      notes: 'Código QR asignado al área.',
      metadata: {
        area_code: area.code,
        area_name: area.name,
      },
      created_at: now,
      updated_at: now,
    }));

    await TraceabilityEvent.bulkCreate(eventRows, {
      transaction,
    });

    if (payload.batch_id) {
      const remainingQrs = await QrCode.count({
        where: {
          batch_id: payload.batch_id,
          status: QR_STATUS.UNASSIGNED,
          is_active: true,
        },
        transaction,
      });
      if (remainingQrs === 0) {
        await QrBatch.update(
          { status: QR_BATCH_STATUS.ASSIGNED },
          { where: { id: payload.batch_id }, transaction }
        );
      }
    }

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

    if (targetAreaId && Number(qrCode.assigned_area_id) !== Number(targetAreaId)) {
      throwHttpError('Este código QR no pertenece al área indicada.', 400);
    }

    if (payload.require_available !== false && qrCode.status !== QR_STATUS.ASSIGNED) {
      throwHttpError(`El código QR no está disponible. Estado actual: ${qrCode.status}.`, 400);
    }

    await createTraceabilityEvent({
      qrCodeId: qrCode.id,
      eventType: QR_EVENT_TYPE.VALIDATED,
      fromStatus: qrCode.status,
      toStatus: qrCode.status,
      fromAreaId: qrCode.assigned_area_id,
      toAreaId: qrCode.assigned_area_id,
      performedBy: currentUser.id,
      notes: 'Código QR validado para operación.',
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
        cancel_reason: payload.reason,
      },
      {
        transaction,
      }
    );

    await createTraceabilityEvent({
      qrCodeId: qrCode.id,
      eventType: QR_EVENT_TYPE.CANCELLED,
      fromStatus: previousStatus,
      toStatus: QR_STATUS.CANCELADO,
      fromAreaId: qrCode.assigned_area_id,
      toAreaId: qrCode.assigned_area_id,
      performedBy: currentUser.id,
      notes: payload.reason,
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

const lookup = async (qr_code) => {
  const qr = await QrCode.findOne({
    where: { qr_code },
    include: qrInclude,
  });

  if (!qr) {
    throwHttpError('Código QR no encontrado.', 404);
  }

  const events = await TraceabilityEvent.findAll({
    where: { qr_code_id: qr.id },
    include: eventInclude,
    order: [['created_at', 'ASC']],
  });

  // Try to find if it's associated with an Inventory
  const Inventory = sequelize.models.Inventory;
  let inventoryData = null;

  if (Inventory) {
    const stock = await Inventory.findOne({
      where: { qr_code_uuid: qr.uuid },
      include: [
        { model: sequelize.models.Material, as: 'material' },
        { model: sequelize.models.MaterialUnit, as: 'unit' }
      ]
    });
    
    if (stock) {
      inventoryData = stock;
    }
  }

  return {
    qr: buildQrResponse(qr),
    events: events.map(buildEventResponse),
    inventory: inventoryData
  };
};

module.exports = {
  generateQrBatch,
  getQrCodes,
  getQrCodeByValue,
  getQrEvents,
  assignQrCodes,
  validateQrForUse,
  cancelQrCode,
  getQrBatches,
  getQrBatchById,
  lookup,
};