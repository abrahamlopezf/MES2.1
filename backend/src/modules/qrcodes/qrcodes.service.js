const { Op } = require('sequelize');
const crypto = require('crypto');

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
  isSupervisor,
  throwHttpError,
} = require('../../shared/security/accessRules');

const {
  QR_STATUS,
  QR_BATCH_STATUS,
  QR_EVENT_TYPE,
} = require('./qr.constants');
const { canManageQrBatches } = require('./qrBatchAccess');

const CHUNK_SIZE = 1000;

const canManageAllAreas = (currentUser) => {
  return isSuperadmin(currentUser) || isAdmin(currentUser);
};

const isWarehouseQrCoordinator = (currentUser) => {
  const roleCode = String(currentUser?.role?.code || '').toUpperCase();
  return ['ADMIN_ALM', 'ADMIN_ALMACEN'].includes(roleCode);
};

const getUserAreaId = (currentUser) => {
  const roleCode = String(currentUser?.role?.code || '').toUpperCase();
  return (
    currentUser?.area?.id ||
    currentUser?.areaId ||
    currentUser?.role?.area_id ||
    currentUser?.role?.area?.id ||
    (['ADMIN_EXT', 'ADMIN_EXTRUSION', 'SUPERVISOR_EXTRUSION', 'OPERADOR_EXTRUSION'].includes(roleCode) ? 2 : null) ||
    (['ADMIN_TELARES', 'ADMIN_TEL', 'SUPERVISOR_TELARES', 'OPERADOR_TELARES'].includes(roleCode) ? 3 : null) ||
    (['ADMIN_ALM', 'ADMIN_ALMACEN', 'WAREHOUSEMAN'].includes(roleCode) ? 1 : null) ||
    null
  );
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

  const roleCode = String(currentUser?.role?.code || '').toUpperCase();
  if (['ADMIN_EXT', 'ADMIN_EXTRUSION'].includes(roleCode)) {
    return { assigned_area_id: getUserAreaId(currentUser) || 2 };
  }

  if (roleCode === 'SUPERVISOR_EXTRUSION') {
    return { assigned_area_id: getUserAreaId(currentUser) || 2 };
  }

  // El supervisor solo puede ver los lotes de QR creados por él
  if (isSupervisor(currentUser)) {
    return {
      created_by: currentUser.id,
    };
  }

  const userAreaId = getUserAreaId(currentUser);

  // Para usuarios de Almacén (ADMIN_ALM / WAREHOUSEMAN), SOLO mostrar los QR asignados a Almacén
  if (roleCode === 'ADMIN_ALM' || roleCode === 'WAREHOUSEMAN' || Number(userAreaId) === 1) {
    return {
      assigned_area_id: userAreaId || 1,
    };
  }

  if (!userAreaId) {
    return {
      created_by: currentUser.id,
    };
  }

  return {
    [Op.or]: [
      { assigned_area_id: userAreaId },
      { created_by: currentUser.id },
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
    created_at: plainEvent.created_at || plainEvent.createdAt,
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
  if (!canManageQrBatches(currentUser)) {
    throwHttpError('La generación de lotes QR está centralizada en Almacén y los perfiles globales.', 403);
  }

  return sequelize.transaction(async (transaction) => {
    let assignedAreaId = payload.assigned_area_id || null;

    if (!assignedAreaId && payload.area_code) {
      const area = await Area.findOne({ where: { code: payload.area_code }, transaction });
      if (area) assignedAreaId = area.id;
    }

    const warehouseQrCoordinator = isWarehouseQrCoordinator(currentUser) && !isSupervisor(currentUser);
    if ((!canManageAllAreas(currentUser) && !warehouseQrCoordinator) || isSupervisor(currentUser)) {
      assignedAreaId = getUserAreaId(currentUser);

      if (!assignedAreaId) {
        throwHttpError('Tu usuario no tiene un área asignada para generar QR.', 403);
      }
    }


    if (!assignedAreaId) {
      throwHttpError('Debes seleccionar un área para generar los códigos QR.', 400);
    }

    if (warehouseQrCoordinator) {
      const targetArea = await Area.findByPk(assignedAreaId, { transaction });
      if (!targetArea || !targetArea.is_active) {
        throwHttpError('El área destino no existe o está inactiva.', 400);
      }
    } else {
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

    where[Op.and] = [
      ...(where[Op.and] || []),
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
  const where = isWarehouseQrCoordinator(currentUser)
    ? { [Op.or]: [{ created_by: currentUser.id }, { assigned_area_id: getUserAreaId(currentUser) || 1 }] }
    : { ...getQrVisibilityWhere(currentUser) };
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
      qrCodeId: c.id,
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

  const roleCode = String(currentUser?.role?.code || '').toUpperCase();
  if (isWarehouseQrCoordinator(currentUser)) {
    const isOwnBatch = Number(plainBatch.created_by?.id || plainBatch.created_by) === Number(currentUser.id);
    const isWarehouseBatch = Number(plainBatch.assigned_area_id) === Number(getUserAreaId(currentUser) || 1);
    if (!isOwnBatch && !isWarehouseBatch) {
      throwHttpError('Almacén solo puede consultar los lotes propios y los asignados a su área.', 403);
    }
  }
  if (['ADMIN_EXT', 'ADMIN_EXTRUSION', 'SUPERVISOR_EXTRUSION'].includes(roleCode)
    && Number(plainBatch.assigned_area_id) !== Number(getUserAreaId(currentUser) || 2)) {
    throwHttpError('Solo puedes consultar lotes de QR asignados a Extrusión.', 403);
  }

  if (isSupervisor(currentUser) && roleCode !== 'SUPERVISOR_EXTRUSION') {
    const creatorId = plainBatch.created_by?.id || plainBatch.created_by;
    if (creatorId && Number(creatorId) !== Number(currentUser.id)) {
      throwHttpError('Solo puedes consultar los lotes creados por ti.', 403);
    }
  }
  
  const available_quantity = batch.codes ? batch.codes.filter(c => (c.status === QR_STATUS.UNASSIGNED || c.status === QR_STATUS.ASSIGNED) && c.is_active).length : 0;
  const tokens = batch.codes ? batch.codes.map(c => ({
    qrCodeId: c.id,
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
    where[Op.and] = [
      ...(where[Op.and] || []),
      { [Op.or]: [{ qr_code: qrCodeValue }, { uuid: qrCodeValue }] },
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

const getQrCodesByUuids = async (uuids, currentUser) => {
  const requestedUuids = [...new Set((Array.isArray(uuids) ? uuids : [])
    .filter((uuid) => typeof uuid === 'string' && uuid.trim())
    .map((uuid) => uuid.trim()))];

  if (!requestedUuids.length) return [];

  const roleCode = String(currentUser?.role?.code || '').toUpperCase();
  const userAreaId = getUserAreaId(currentUser);
  const isWarehouseUser = ['ADMIN_ALM', 'WAREHOUSEMAN'].includes(roleCode)
    || Number(userAreaId) === 1;

  // Warehouse lot QR codes are valid for printing from the lot ledger even when
  // their QR record has no assigned_area_id (or a stale area assignment).
  // Scope the exception through Lote.qr_id so it cannot expose arbitrary QRs.
  if (isWarehouseUser) {
    const { Lote } = require('../../database/models');
    const warehouseLots = await Lote.findAll({
      attributes: ['qr_id'],
      where: { qr_id: { [Op.not]: null } },
      include: [{
        model: QrCode,
        as: 'qr_code',
        attributes: [],
        required: true,
        where: { uuid: { [Op.in]: requestedUuids } },
      }],
      raw: true,
    });
    const linkedQrIds = [...new Set(warehouseLots.map((lot) => lot.qr_id).filter(Boolean))];
    if (!linkedQrIds.length) return [];

    return QrCode.findAll({
      where: { id: { [Op.in]: linkedQrIds } },
      include: qrInclude,
    });
  }

  const where = {
    ...getQrVisibilityWhere(currentUser),
    uuid: {
      [Op.in]: requestedUuids
    }
  };

  const qrCodes = await QrCode.findAll({
    where,
    include: qrInclude,
  });

  return qrCodes;
};

const THERMAL_PRINT_MAX_LABELS = 500;
const PRINT_PAYLOAD_EVENT_TYPES = [QR_EVENT_TYPE.PRINT_PAYLOAD_RESERVED, QR_EVENT_TYPE.PRINT_REQUESTED, QR_EVENT_TYPE.REPRINT_REQUESTED];

const validateThermalPrintSelection = (qrCodeIds) => {
  const normalizedIds = (Array.isArray(qrCodeIds) ? qrCodeIds : []).map(Number);
  if (!normalizedIds.length) throwHttpError('Selecciona al menos un código QR.', 400);
  if (normalizedIds.length > THERMAL_PRINT_MAX_LABELS) {
    const error = new Error(`Puedes generar hasta ${THERMAL_PRINT_MAX_LABELS} etiquetas por PDF. Divide la selección en grupos más pequeños.`);
    error.statusCode = 413;
    error.code = 'QR_PRINT_BATCH_TOO_LARGE';
    throw error;
  }
  if (normalizedIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    throwHttpError('La selección contiene un código QR no válido.', 400);
  }
  if (new Set(normalizedIds).size !== normalizedIds.length) {
    throwHttpError('La selección contiene códigos QR duplicados.', 400);
  }
  return normalizedIds;
};

const resolveQrPrintData = async (qrCodes, currentUser, { transaction, labelLengthMm, recordPrintRequest = false } = {}) => {
  const { getLabelProfile } = require('./printer/thermalLabelPdf');
  const profile = getLabelProfile(labelLengthMm === undefined || labelLengthMm === null
    ? undefined
    : `62x${Number(labelLengthMm)}`);
  const ids = validateThermalPrintSelection(qrCodes.map((code) => code.id));
  const lockedCodes = await QrCode.findAll({
    where: { id: ids },
    order: [['id', 'ASC']],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (lockedCodes.length !== ids.length) throwHttpError('Uno o más códigos QR ya no están disponibles para impresión.', 409);

  const orderedCodes = new Map(lockedCodes.map((code) => [Number(code.id), code]));
  const ordered = ids.map((id) => orderedCodes.get(id));
  const priorEvents = await TraceabilityEvent.findAll({
    where: { qr_code_id: ids, event_type: PRINT_PAYLOAD_EVENT_TYPES },
    attributes: ['qr_code_id', 'event_type', 'metadata'],
    order: [['created_at', 'ASC'], ['id', 'ASC']],
    transaction,
  });
  const firstPayloadByQrId = new Map();
  const hasPriorPrintRequestByQrId = new Set();
  for (const event of priorEvents) {
    const qrId = Number(event.qr_code_id);
    const metadata = event.metadata || {};
    if (event.event_type === QR_EVENT_TYPE.PRINT_PAYLOAD_RESERVED && metadata.encoded_qr_payload && !firstPayloadByQrId.has(qrId)) {
      firstPayloadByQrId.set(qrId, metadata.encoded_qr_payload);
    }
    if ([QR_EVENT_TYPE.PRINT_REQUESTED, QR_EVENT_TYPE.REPRINT_REQUESTED].includes(event.event_type)) {
      hasPriorPrintRequestByQrId.add(qrId);
    }
  }

  const createdAt = new Date();
  const reservationEvents = [];
  const printEvents = [];
  const codes = ordered.map((qrCode) => {
    const id = Number(qrCode.id);
    let encodedPayload = firstPayloadByQrId.get(id);
    if (!encodedPayload) {
      encodedPayload = require('../../shared/utils/crypto.utils').encryptQrData(qrCode.qr_code);
      reservationEvents.push({
        qr_code_id: id,
        event_type: QR_EVENT_TYPE.PRINT_PAYLOAD_RESERVED,
        from_status: qrCode.status,
        to_status: qrCode.status,
        from_area_id: qrCode.current_area_id || qrCode.assigned_area_id || null,
        to_area_id: qrCode.current_area_id || qrCode.assigned_area_id || null,
        performed_by: currentUser.id,
        notes: 'Payload cifrado reservado para que futuras reimpresiones conserven el mismo contenido QR.',
        metadata: { encoded_qr_payload: encodedPayload, purpose: 'thermal_qr_label' },
        created_at: createdAt,
        updated_at: createdAt,
      });
      firstPayloadByQrId.set(id, encodedPayload);
    }

    if (recordPrintRequest) {
      const eventType = hasPriorPrintRequestByQrId.has(id)
        ? QR_EVENT_TYPE.REPRINT_REQUESTED
        : QR_EVENT_TYPE.PRINT_REQUESTED;
      printEvents.push({
        qr_code_id: id,
        event_type: eventType,
        from_status: qrCode.status,
        to_status: qrCode.status,
        from_area_id: qrCode.current_area_id || qrCode.assigned_area_id || null,
        to_area_id: qrCode.current_area_id || qrCode.assigned_area_id || null,
        performed_by: currentUser.id,
        notes: eventType === QR_EVENT_TYPE.REPRINT_REQUESTED
          ? 'Se generó un nuevo archivo PDF para reimpresión; el estado y la identidad QR permanecen iguales.'
          : 'Se generó el archivo PDF térmico; esto no confirma impresión física ni entrega del lote.',
        metadata: {
          print_profile: profile.id,
          label_width_mm: profile.widthMm,
          label_length_mm: profile.heightMm,
          encoded_qr_payload: encodedPayload,
          physical_print_confirmed: false,
          warehouse_delivery_confirmed: false,
        },
        created_at: createdAt,
        updated_at: createdAt,
      });
      hasPriorPrintRequestByQrId.add(id);
    }

    return {
      id,
      uuid: qrCode.uuid,
      qr_code: qrCode.qr_code,
      status: qrCode.status,
      encodedPayload,
    };
  });

  if (reservationEvents.length) await TraceabilityEvent.bulkCreate(reservationEvents, { transaction });
  if (printEvents.length) await TraceabilityEvent.bulkCreate(printEvents, { transaction });

  return { codes, profile };
};

const getThermalPrintSummary = (count, profile) => ({
  quantity: count,
  width_mm: profile.widthMm,
  label_length_mm: profile.heightMm,
  qr_size_mm: profile.qrSizeMm,
  label_format: profile.label,
  theoretical_paper_consumption_mm: count * profile.heightMm,
  theoretical_paper_consumption_m: (count * profile.heightMm) / 1000,
  nominal_roll_length_mm: 30_400,
  theoretical_labels_per_roll: Math.floor(30_400 / profile.heightMm),
  excludes_advance_gap_and_calibration: true,
  roll_yield_is_guaranteed: false,
});

const getQrBatchForThermalPrint = async (batchId, currentUser) => {
  const batch = await getQrBatchById(batchId, currentUser);
  return {
    batch,
    qrCodeIds: (batch.tokens || []).map((token) => Number(token.qrCodeId)).filter(Number.isInteger),
  };
};

const prepareThermalPrintPreview = async (qrCodeIds, currentUser, { labelLengthMm } = {}) => {
  const ids = validateThermalPrintSelection(qrCodeIds);
  return sequelize.transaction(async (transaction) => {
    const qrs = await QrCode.findAll({ where: { id: ids }, transaction });
    if (qrs.length !== ids.length) throwHttpError('Uno o más códigos QR no existen.', 404);
    const { codes, profile } = await resolveQrPrintData(qrs, currentUser, { transaction, labelLengthMm });
    return {
      summary: getThermalPrintSummary(codes.length, profile),
      preview: {
        qr_code: codes[0].qr_code,
        encoded_payload: codes[0].encodedPayload,
        status: codes[0].status,
      },
    };
  });
};

const generateThermalPrintPdf = async (qrCodeIds, currentUser, { labelLengthMm } = {}) => {
  const ids = validateThermalPrintSelection(qrCodeIds);
  return sequelize.transaction(async (transaction) => {
    const qrs = await QrCode.findAll({ where: { id: ids }, transaction });
    if (qrs.length !== ids.length) throwHttpError('Uno o más códigos QR no existen.', 404);
    const { codes, profile } = await resolveQrPrintData(qrs, currentUser, {
      transaction,
      labelLengthMm,
      recordPrintRequest: true,
    });
    const { buffer } = await require('./printer/thermalLabelPdf').generateThermalQrPdf(
      codes,
      `62x${profile.heightMm}`,
    );
    return {
      buffer,
      profile,
      summary: getThermalPrintSummary(codes.length, profile),
    };
  });
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

const lookup = async (qr_code, currentUser) => {
  const { buildFullQrLookup, normalizeAreaCode } = require('./qrTraceabilityTree.service');
  const result = await buildFullQrLookup(qr_code, { qrInclude, eventInclude, buildQrResponse, buildEventResponse });

  if (canManageAllAreas(currentUser)) return result;

  const areaCodeById = {
    1: 'ALMACEN',
    2: 'EXTRUSION',
    3: 'TELARES',
    4: 'LAMINADO',
    5: 'GLOBO',
    6: 'CORTE',
  };
  const userAreaCode = areaCodeById[Number(getUserAreaId(currentUser))];
  const qrAreaCode = normalizeAreaCode(
    result?.operational_routing?.current_stage || result?.qr?.assigned_area?.code || result?.qr?.assigned_area?.name
  );
  const hasAuthorizedNextAction = Boolean(
    result?.operational_routing?.actions_by_area?.[userAreaCode]
  );

  if (!userAreaCode || (!hasAuthorizedNextAction && (!qrAreaCode || qrAreaCode !== userAreaCode))) {
    throwHttpError('El QR pertenece a otra área o no tiene una etapa asignada a tu usuario.', 403);
  }

  return result;
};

module.exports = {
  generateQrBatch,
  getQrCodes,
  getQrCodeByValue,
  getQrCodesByUuids,
  getQrEvents,
  assignQrCodes,
  validateQrForUse,
  cancelQrCode,
  getQrBatches,
  getQrBatchById,
  THERMAL_PRINT_MAX_LABELS,
  prepareThermalPrintPreview,
  generateThermalPrintPdf,
  getQrBatchForThermalPrint,
  lookup,
};
