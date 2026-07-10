const { Op } = require('sequelize');

const db = require('../../database/models');
const auditService = require('../../modules/audit/audit.service');

const {
    QR_AREA_ASSIGNMENT_STATUS,
    TRACEABLE_ITEM_STATUS,
    TRACEABLE_ITEM_TYPE,
    TRACEABILITY_ALLOWED_ACTION,
    TRACEABILITY_MOVEMENT_TYPE,
    TRACEABILITY_LINK_TYPE,
} = require('./traceability.constants');

const QR_STATUS = {
    GENERADO: 'GENERADO',
    DISPONIBLE: 'DISPONIBLE',
    EN_USO: 'EN_USO',
    TRANSFERIDO: 'TRANSFERIDO',
    FINALIZADO: 'FINALIZADO',
    CANCELADO: 'CANCELADO',
    DANADO: 'DANADO',
};

const getQrCodeFieldName = () => {
    const attributes = db.QrCode?.rawAttributes || {};

    const candidate = ['qr_code', 'code', 'value'].find((field) => attributes[field]);

    if (!candidate) {
        throw new Error(
            'No se encontró el campo del código QR en el modelo QrCode. Revisa si se llama qr_code, code o value.'
        );
    }

    return candidate;
};

const getQrDisplayValue = (qr) => {
    if (!qr) return null;

    return qr.qr_code || qr.code || qr.value || qr.id;
};

const toNumber = (value) => {
    const numberValue = Number(value);

    return Number.isNaN(numberValue) ? 0 : numberValue;
};

const getUserRoleName = (user) => {
    return (
        user?.role?.name ||
        user?.role_name ||
        user?.role ||
        user?.type_user?.name ||
        user?.user_type ||
        ''
    ).toString().toUpperCase();
};

const getUserAreaId = (user) => {
    return (
        user?.area_id ||
        user?.area?.id ||
        user?.assigned_area_id ||
        user?.current_area_id ||
        null
    );
};

const isPrivilegedUser = (user) => {
    const roleName = getUserRoleName(user);

    return ['SUPERADMIN', 'ADMIN'].includes(roleName);
};

const mapAction = (key, label, description, priority = 'secondary') => ({
    key,
    label,
    description,
    priority,
});

const getBaseAccessContext = ({ user, assignment, traceableItem }) => {
    const userAreaId = getUserAreaId(user);
    const privileged = isPrivilegedUser(user);

    const assignedAreaId = assignment?.area_id || null;
    const currentAreaId = traceableItem?.current_area_id || null;

    const belongsToAssignedArea =
        userAreaId && assignedAreaId && Number(userAreaId) === Number(assignedAreaId);

    const belongsToCurrentArea =
        userAreaId && currentAreaId && Number(userAreaId) === Number(currentAreaId);

    const allowedByArea =
        privileged ||
        belongsToAssignedArea ||
        belongsToCurrentArea ||
        (!assignedAreaId && !currentAreaId);

    return {
        user_area_id: userAreaId,
        privileged,
        assigned_area_id: assignedAreaId,
        current_area_id: currentAreaId,
        allowed_by_area: Boolean(allowedByArea),
    };
};

const getAllowedActions = ({ qr, assignment, traceableItem, user }) => {
    const actions = [];
    const qrStatus = qr?.status;
    const access = getBaseAccessContext({ user, assignment, traceableItem });

    if (!access.allowed_by_area) {
        return {
            access,
            actions: [
                mapAction(
                    TRACEABILITY_ALLOWED_ACTION.VIEW_DETAIL,
                    'Ver detalle',
                    'Puedes consultar el QR, pero no operarlo porque pertenece a otra área.'
                ),
            ],
            warning:
                'Este QR no pertenece a tu área actual. Solo puedes consultarlo.',
        };
    }

    actions.push(
        mapAction(
            TRACEABILITY_ALLOWED_ACTION.VIEW_DETAIL,
            'Ver detalle',
            'Consultar información general del QR y su trazabilidad.'
        )
    );

    actions.push(
        mapAction(
            TRACEABILITY_ALLOWED_ACTION.VIEW_HISTORY,
            'Ver historial',
            'Consultar movimientos registrados para este QR.'
        )
    );

    if ([QR_STATUS.CANCELADO, QR_STATUS.DANADO, QR_STATUS.FINALIZADO].includes(qrStatus)) {
        return {
            access,
            actions,
            warning: `Este QR está en estado ${qrStatus}; no permite operaciones nuevas.`,
        };
    }

    if (!traceableItem) {
        if (qrStatus === QR_STATUS.DISPONIBLE || qrStatus === QR_STATUS.GENERADO) {
            if (assignment?.area_id) {
                actions.unshift(
                    mapAction(
                        TRACEABILITY_ALLOWED_ACTION.REGISTER_RAW_MATERIAL_ENTRY,
                        'Registrar entrada de materia prima',
                        'Vincular este QR con material recibido en almacén.',
                        'primary'
                    )
                );
            }

            if (access.privileged && !assignment?.area_id) {
                actions.unshift(
                    mapAction(
                        TRACEABILITY_ALLOWED_ACTION.ASSIGN_QR_TO_AREA,
                        'Asignar QR a área',
                        'Entregar este QR a un área operativa.',
                        'primary'
                    )
                );
            }

            if (access.privileged && assignment?.area_id) {
                actions.push(
                    mapAction(
                        TRACEABILITY_ALLOWED_ACTION.ASSIGN_QR_TO_AREA,
                        'Reasignar QR a otra área',
                        'Cambiar este QR a otra área operativa antes de utilizarlo.'
                    )
                );
            }

            actions.push(
                mapAction(
                    TRACEABILITY_ALLOWED_ACTION.MARK_QR_DAMAGED,
                    'Marcar QR dañado',
                    'Indicar que la etiqueta no puede utilizarse.'
                )
            );

            actions.push(
                mapAction(
                    TRACEABILITY_ALLOWED_ACTION.CANCEL_QR,
                    'Cancelar QR',
                    'Cancelar este QR para que no sea usado.'
                )
            );
        }

        return {
            access,
            actions,
            warning: assignment?.area_id
                ? null
                : 'Este QR aún no tiene área asignada.',
        };
    }

    const itemType = traceableItem.item_type;
    const itemStatus = traceableItem.status;
    const quantityCurrent = toNumber(traceableItem.quantity_current);

    if (quantityCurrent <= 0 || itemStatus === TRACEABLE_ITEM_STATUS.CONSUMIDO) {
        return {
            access,
            actions,
            warning: 'Esta unidad trazable ya no tiene cantidad disponible para operar.',
        };
    }

    if (itemStatus === TRACEABLE_ITEM_STATUS.TRANSFERIDO) {
        actions.unshift(
            mapAction(
                TRACEABILITY_ALLOWED_ACTION.RECEIVE_IN_AREA,
                'Recibir en área destino',
                'Confirmar recepción física de este QR en tu área.',
                'primary'
            )
        );

        return {
            access,
            actions,
            warning: null,
        };
    }

    if (itemStatus === TRACEABLE_ITEM_STATUS.EN_PROCESO) {
        actions.unshift(
            mapAction(
                TRACEABILITY_ALLOWED_ACTION.GENERATE_INTERMEDIATE_PRODUCT,
                'Registrar salida de proceso',
                'Registrar producto intermedio generado por la corrida.',
                'primary'
            )
        );

        actions.push(
            mapAction(
                TRACEABILITY_ALLOWED_ACTION.REGISTER_SCRAP,
                'Registrar merma',
                'Registrar merma asociada al proceso en curso.'
            )
        );

        return {
            access,
            actions,
            warning: null,
        };
    }

    if (itemType === TRACEABLE_ITEM_TYPE.RAW_MATERIAL_LOT) {
        actions.unshift(
            mapAction(
                TRACEABILITY_ALLOWED_ACTION.TRANSFER_TO_AREA,
                'Enviar a proceso',
                'Transferir una cantidad de materia prima a otra área.',
                'primary'
            )
        );

        actions.push(
            mapAction(
                TRACEABILITY_ALLOWED_ACTION.SPLIT_TRACEABLE_ITEM,
                'Dividir lote',
                'Crear un nuevo QR hijo con parte de la cantidad disponible.'
            )
        );

        actions.push(
            mapAction(
                TRACEABILITY_ALLOWED_ACTION.ADJUST_QUANTITY,
                'Ajustar cantidad',
                'Registrar ajuste autorizado de inventario físico.'
            )
        );
    }

    if (itemType === TRACEABLE_ITEM_TYPE.PROCESS_INPUT) {
        actions.unshift(
            mapAction(
                TRACEABILITY_ALLOWED_ACTION.CONSUME_IN_PROCESS,
                'Consumir en proceso',
                'Registrar consumo de material dentro del área.',
                'primary'
            )
        );

        actions.push(
            mapAction(
                TRACEABILITY_ALLOWED_ACTION.GENERATE_INTERMEDIATE_PRODUCT,
                'Generar producto intermedio',
                'Crear QR hijo para la salida productiva del proceso.'
            )
        );

        actions.push(
            mapAction(
                TRACEABILITY_ALLOWED_ACTION.REGISTER_SCRAP,
                'Registrar merma',
                'Crear QR o registro de merma asociado al proceso.'
            )
        );
    }

    if (itemType === TRACEABLE_ITEM_TYPE.PREPARED_MIX) {
        actions.unshift(
            mapAction(
                TRACEABILITY_ALLOWED_ACTION.CONSUME_IN_PROCESS,
                'Iniciar mezcla/proceso',
                'Usar esta preparación como entrada del proceso de Extrusión.',
                'primary'
            )
        );

        actions.push(
            mapAction(
                TRACEABILITY_ALLOWED_ACTION.REGISTER_SCRAP,
                'Registrar merma',
                'Registrar merma asociada a esta preparación.'
            )
        );
    }

    if (itemType === TRACEABLE_ITEM_TYPE.INTERMEDIATE_PRODUCT) {
        actions.unshift(
            mapAction(
                TRACEABILITY_ALLOWED_ACTION.TRANSFER_TO_AREA,
                'Transferir a siguiente área',
                'Mover este producto intermedio al siguiente proceso.',
                'primary'
            )
        );

        actions.push(
            mapAction(
                TRACEABILITY_ALLOWED_ACTION.CONSUME_IN_PROCESS,
                'Procesar',
                'Usar este producto intermedio como entrada del proceso actual.'
            )
        );
    }

    if (itemType === TRACEABLE_ITEM_TYPE.SCRAP) {
        actions.push(
            mapAction(
                TRACEABILITY_ALLOWED_ACTION.FINALIZE_ITEM,
                'Finalizar merma',
                'Cerrar el registro de merma cuando ya no tendrá movimientos.'
            )
        );
    }

    if (itemType === TRACEABLE_ITEM_TYPE.FINISHED_PRODUCT) {
        actions.unshift(
            mapAction(
                TRACEABILITY_ALLOWED_ACTION.TRANSFER_TO_AREA,
                'Enviar a embarque',
                'Mover producto terminado hacia embarque.',
                'primary'
            )
        );
    }

    return {
        access,
        actions,
        warning: null,
    };
};

const buildQrDto = (qr) => {
    if (!qr) return null;

    return {
        id: qr.id,
        code: getQrDisplayValue(qr),
        status: qr.status,
        batch_id: qr.qr_batch_id || qr.batch_id || null,
        created_at: qr.created_at || qr.createdAt || null,
        updated_at: qr.updated_at || qr.updatedAt || null,
    };
};

const buildAreaDto = (area) => {
    if (!area) return null;

    return {
        id: area.id,
        code: area.code || null,
        name: area.name,
        is_active: area.is_active,
    };
};

const buildMaterialDto = (material) => {
    if (!material) return null;

    return {
        id: material.id,
        code: material.code,
        name: material.name,
        material_type: material.material_type,
        default_unit: material.default_unit,
        is_active: material.is_active,
    };
};

const buildTraceableItemDto = (item) => {
    if (!item) return null;

    return {
        id: item.id,
        qr_code_id: item.qr_code_id,
        item_type: item.item_type,
        material_id: item.material_id,
        material: buildMaterialDto(item.material),
        product_name: item.product_name,
        origin_area: buildAreaDto(item.origin_area),
        current_area: buildAreaDto(item.current_area),
        quantity_initial: item.quantity_initial,
        quantity_current: item.quantity_current,
        unit: item.unit,
        status: item.status,
        reference_folio: item.reference_folio,
        supplier_lot: item.supplier_lot,
        supplier_reference: item.supplier_reference,
        location: item.location,
        metadata: item.metadata || {},
        notes: item.notes,
        created_at: item.created_at || item.createdAt || null,
        updated_at: item.updated_at || item.updatedAt || null,
    };
};

const scanQrCode = async ({ scannedCode, user }) => {
    const cleanCode = String(scannedCode || '').trim();

    if (!cleanCode) {
        const error = new Error('Debes proporcionar un código QR.');
        error.statusCode = 400;
        throw error;
    }

    const qrCodeField = getQrCodeFieldName();

    const qr = await db.QrCode.findOne({
        where: {
            [qrCodeField]: cleanCode,
        },
    });

    if (!qr) {
        const error = new Error('QR no encontrado.');
        error.statusCode = 404;
        throw error;
    }

    const assignment = await db.QrAreaAssignment.findOne({
        where: {
            qr_code_id: qr.id,
            status: QR_AREA_ASSIGNMENT_STATUS.ACTIVA,
        },
        include: [
            {
                model: db.Area,
                as: 'area',
                attributes: ['id', 'code', 'name', 'is_active'],
                required: false,
            },
            {
                model: db.User,
                as: 'assigned_user',
                attributes: ['id', 'username', 'email'],
                required: false,
            },
        ],
        order: [['assigned_at', 'DESC']],
    });

    const traceableItem = await db.TraceableItem.findOne({
        where: {
            qr_code_id: qr.id,
        },
        include: [
            {
                model: db.Material,
                as: 'material',
                attributes: [
                    'id',
                    'code',
                    'name',
                    'material_type',
                    'default_unit',
                    'is_active',
                ],
                required: false,
            },
            {
                model: db.Area,
                as: 'origin_area',
                attributes: ['id', 'code', 'name', 'is_active'],
                required: false,
            },
            {
                model: db.Area,
                as: 'current_area',
                attributes: ['id', 'code', 'name', 'is_active'],
                required: false,
            },
        ],
    });

    const movements = traceableItem
        ? await db.TraceabilityMovement.findAll({
            where: {
                traceable_item_id: traceableItem.id,
            },
            include: [
                {
                    model: db.Area,
                    as: 'from_area',
                    attributes: ['id', 'code', 'name'],
                    required: false,
                },
                {
                    model: db.Area,
                    as: 'to_area',
                    attributes: ['id', 'code', 'name'],
                    required: false,
                },
                {
                    model: db.User,
                    as: 'performer',
                    attributes: ['id', 'username', 'email'],
                    required: false,
                },
            ],
            order: [['performed_at', 'DESC']],
            limit: 10,
        })
        : [];

    const parentLinks = traceableItem
        ? await db.TraceabilityLink.findAll({
            where: {
                child_traceable_item_id: traceableItem.id,
            },
            order: [['created_at', 'DESC']],
            limit: 10,
        })
        : [];

    const childLinks = traceableItem
        ? await db.TraceabilityLink.findAll({
            where: {
                parent_traceable_item_id: traceableItem.id,
            },
            order: [['created_at', 'DESC']],
            limit: 10,
        })
        : [];

    const actionContext = getAllowedActions({
        qr,
        assignment,
        traceableItem,
        user,
    });

    const primaryAction =
        actionContext.actions.find((action) => action.priority === 'primary') ||
        actionContext.actions[0] ||
        null;

    return {
        scanned_code: cleanCode,
        qr: buildQrDto(qr),
        assignment: assignment
            ? {
                id: assignment.id,
                status: assignment.status,
                area: buildAreaDto(assignment.area),
                assigned_user: assignment.assigned_user
                    ? {
                        id: assignment.assigned_user.id,
                        username: assignment.assigned_user.username,
                        email: assignment.assigned_user.email,
                    }
                    : null,
                assigned_at: assignment.assigned_at,
                released_at: assignment.released_at,
                notes: assignment.notes,
            }
            : null,
        traceable_item: buildTraceableItemDto(traceableItem),
        movements: movements.map((movement) => ({
            id: movement.id,
            movement_type: movement.movement_type,
            quantity: movement.quantity,
            unit: movement.unit,
            balance_after: movement.balance_after,
            from_area: buildAreaDto(movement.from_area),
            to_area: buildAreaDto(movement.to_area),
            reference_folio: movement.reference_folio,
            notes: movement.notes,
            performed_by: movement.performer
                ? {
                    id: movement.performer.id,
                    username: movement.performer.username,
                    email: movement.performer.email,
                }
                : null,
            performed_at: movement.performed_at,
        })),
        traceability_links: {
            parents: parentLinks.map((link) => ({
                id: link.id,
                parent_traceable_item_id: link.parent_traceable_item_id,
                parent_qr_code_id: link.parent_qr_code_id,
                link_type: link.link_type,
                quantity_used: link.quantity_used,
                quantity_generated: link.quantity_generated,
                scrap_quantity: link.scrap_quantity,
                unit: link.unit,
            })),
            children: childLinks.map((link) => ({
                id: link.id,
                child_traceable_item_id: link.child_traceable_item_id,
                child_qr_code_id: link.child_qr_code_id,
                link_type: link.link_type,
                quantity_used: link.quantity_used,
                quantity_generated: link.quantity_generated,
                scrap_quantity: link.scrap_quantity,
                unit: link.unit,
            })),
        },
        mobile_context: {
            access: actionContext.access,
            primary_action: primaryAction,
            allowed_actions: actionContext.actions,
            warning: actionContext.warning,
        },
    };
};

const assignQrCodesToArea = async ({ payload, user }) => {
    const qrCodeIds = Array.isArray(payload.qr_code_ids)
        ? payload.qr_code_ids
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0)
        : [];

    const qrCodes = Array.isArray(payload.qr_codes)
        ? payload.qr_codes
            .map((code) => String(code || '').trim())
            .filter(Boolean)
        : [];

    const areaId = Number(payload.area_id);
    const assignedToUserId = payload.assigned_to_user_id
        ? Number(payload.assigned_to_user_id)
        : null;

    const notes = payload.notes ? String(payload.notes).trim() : null;

    if ((!qrCodeIds.length && !qrCodes.length) || (qrCodeIds.length && qrCodes.length)) {
        const error = new Error(
            'Debes enviar qr_code_ids o qr_codes, pero no ambos.'
        );
        error.statusCode = 400;
        throw error;
    }

    if (!Number.isInteger(areaId) || areaId <= 0) {
        const error = new Error('Debes proporcionar un área válida.');
        error.statusCode = 400;
        throw error;
    }

    const userId = user?.id || null;
    const qrCodeField = getQrCodeFieldName();

    return db.sequelize.transaction(async (transaction) => {
        const area = await db.Area.findByPk(areaId, {
            transaction,
        });

        if (!area) {
            const error = new Error('Área no encontrada.');
            error.statusCode = 404;
            throw error;
        }

        if (area.is_active === false) {
            const error = new Error('No puedes asignar QR a un área inactiva.');
            error.statusCode = 400;
            throw error;
        }

        let assignedUser = null;

        if (assignedToUserId) {
            assignedUser = await db.User.findByPk(assignedToUserId, {
                transaction,
                attributes: ['id', 'username', 'email', 'area_id'],
            });

            if (!assignedUser) {
                const error = new Error('Usuario asignado no encontrado.');
                error.statusCode = 404;
                throw error;
            }
        }

        const where = qrCodeIds.length
            ? { id: { [Op.in]: [...new Set(qrCodeIds)] } }
            : { [qrCodeField]: { [Op.in]: [...new Set(qrCodes)] } };

        const qrRecords = await db.QrCode.findAll({
            where,
            transaction,
        });

        const expectedCount = qrCodeIds.length
            ? [...new Set(qrCodeIds)].length
            : [...new Set(qrCodes)].length;

        if (qrRecords.length !== expectedCount) {
            const foundIds = new Set(qrRecords.map((qr) => Number(qr.id)));
            const foundCodes = new Set(qrRecords.map((qr) => getQrDisplayValue(qr)));

            const missing = qrCodeIds.length
                ? [...new Set(qrCodeIds)].filter((id) => !foundIds.has(Number(id)))
                : [...new Set(qrCodes)].filter((code) => !foundCodes.has(code));

            const error = new Error(
                `Algunos QR no fueron encontrados: ${missing.join(', ')}`
            );
            error.statusCode = 404;
            throw error;
        }

        const blockedQrs = qrRecords.filter((qr) =>
            [QR_STATUS.CANCELADO, QR_STATUS.DANADO, QR_STATUS.FINALIZADO].includes(
                qr.status
            )
        );

        if (blockedQrs.length > 0) {
            const error = new Error(
                `No se pueden asignar QR cancelados, dañados o finalizados: ${blockedQrs
                    .map((qr) => getQrDisplayValue(qr))
                    .join(', ')}`
            );
            error.statusCode = 400;
            throw error;
        }

        const qrIds = qrRecords.map((qr) => qr.id);

        const traceableItems = await db.TraceableItem.findAll({
            where: {
                qr_code_id: {
                    [Op.in]: qrIds,
                },
            },
            transaction,
        });

        if (traceableItems.length > 0) {
            const usedQrIds = traceableItems.map((item) => item.qr_code_id);

            const usedQrs = qrRecords
                .filter((qr) => usedQrIds.includes(qr.id))
                .map((qr) => getQrDisplayValue(qr));

            const error = new Error(
                `Estos QR ya están vinculados a una unidad trazable y no deben reasignarse por este flujo: ${usedQrs.join(
                    ', '
                )}`
            );
            error.statusCode = 400;
            throw error;
        }

        await db.QrAreaAssignment.update(
            {
                status: QR_AREA_ASSIGNMENT_STATUS.CERRADA,
                released_at: new Date(),
                updated_by: userId,
            },
            {
                where: {
                    qr_code_id: {
                        [Op.in]: qrIds,
                    },
                    status: QR_AREA_ASSIGNMENT_STATUS.ACTIVA,
                },
                transaction,
            }
        );

        const assignmentsPayload = qrIds.map((qrCodeId) => ({
            qr_code_id: qrCodeId,
            area_id: areaId,
            assigned_to_user_id: assignedToUserId,
            status: QR_AREA_ASSIGNMENT_STATUS.ACTIVA,
            assigned_at: new Date(),
            notes,
            created_by: userId,
            updated_by: userId,
        }));

        const assignments = await db.QrAreaAssignment.bulkCreate(assignmentsPayload, {
            transaction,
            returning: true,
        });

        const generatedQrIds = qrRecords
            .filter((qr) => qr.status === QR_STATUS.GENERADO)
            .map((qr) => qr.id);

        if (generatedQrIds.length > 0) {
            await db.QrCode.update(
                {
                    status: QR_STATUS.DISPONIBLE,
                },
                {
                    where: {
                        id: {
                            [Op.in]: generatedQrIds,
                        },
                    },
                    transaction,
                }
            );
        }

        return {
            assigned_count: assignments.length,
            area: buildAreaDto(area),
            assigned_user: assignedUser
                ? {
                    id: assignedUser.id,
                    username: assignedUser.username,
                    email: assignedUser.email,
                    area_id: assignedUser.area_id,
                }
                : null,
            qr_codes: qrRecords.map((qr) => buildQrDto(qr)),
            assignments: assignments.map((assignment) => ({
                id: assignment.id,
                qr_code_id: assignment.qr_code_id,
                area_id: assignment.area_id,
                assigned_to_user_id: assignment.assigned_to_user_id,
                status: assignment.status,
                assigned_at: assignment.assigned_at,
                notes: assignment.notes,
            })),
        };
    });
};

const registerRawMaterialEntry = async ({ payload, user }) => {
    const qrCodeId = payload.qr_code_id ? Number(payload.qr_code_id) : null;
    const qrCodeValue = payload.qr_code
        ? String(payload.qr_code).trim()
        : null;

    const materialId = Number(payload.material_id);
    const quantity = Number(payload.quantity);
    const unit = payload.unit ? String(payload.unit).trim().toUpperCase() : null;

    const supplierLot = payload.supplier_lot
        ? String(payload.supplier_lot).trim()
        : null;

    const supplierReference = payload.supplier_reference
        ? String(payload.supplier_reference).trim()
        : null;

    const referenceFolio = payload.reference_folio
        ? String(payload.reference_folio).trim()
        : null;

    const location = payload.location
        ? String(payload.location).trim()
        : null;

    const notes = payload.notes
        ? String(payload.notes).trim()
        : null;

    const metadata =
        payload.metadata && typeof payload.metadata === 'object'
            ? payload.metadata
            : {};

    if ((!qrCodeId && !qrCodeValue) || (qrCodeId && qrCodeValue)) {
        const error = new Error(
            'Debes enviar qr_code_id o qr_code, pero no ambos.'
        );
        error.statusCode = 400;
        throw error;
    }

    if (!Number.isInteger(materialId) || materialId <= 0) {
        const error = new Error('Debes proporcionar un material válido.');
        error.statusCode = 400;
        throw error;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
        const error = new Error('La cantidad recibida debe ser mayor a cero.');
        error.statusCode = 400;
        throw error;
    }

    if (!unit) {
        const error = new Error('Debes proporcionar la unidad de medida.');
        error.statusCode = 400;
        throw error;
    }

    const userId = user?.id || null;
    const qrCodeField = getQrCodeFieldName();

    return db.sequelize.transaction(async (transaction) => {
        const qr = await db.QrCode.findOne({
            where: qrCodeId
                ? { id: qrCodeId }
                : { [qrCodeField]: qrCodeValue },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!qr) {
            const error = new Error('QR no encontrado.');
            error.statusCode = 404;
            throw error;
        }

        if (![QR_STATUS.DISPONIBLE, QR_STATUS.GENERADO].includes(qr.status)) {
            const error = new Error(
                `Este QR no puede registrar una entrada porque está en estado ${qr.status}.`
            );
            error.statusCode = 400;
            throw error;
        }

        const activeAssignment = await db.QrAreaAssignment.findOne({
            where: {
                qr_code_id: qr.id,
                status: QR_AREA_ASSIGNMENT_STATUS.ACTIVA,
            },
            order: [['assigned_at', 'DESC']],
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!activeAssignment) {
            const error = new Error(
                'Este QR debe estar asignado a un área antes de registrar materia prima.'
            );
            error.statusCode = 400;
            throw error;
        }

        const assignedArea = await db.Area.findByPk(activeAssignment.area_id, {
            attributes: ['id', 'code', 'name', 'is_active'],
            transaction,
        });

        if (!assignedArea) {
            const error = new Error('El área asignada al QR no existe.');
            error.statusCode = 404;
            throw error;
        }

        if (assignedArea.is_active === false) {
            const error = new Error('El área asignada a este QR está inactiva.');
            error.statusCode = 400;
            throw error;
        }

        activeAssignment.area = assignedArea;

        const access = getBaseAccessContext({
            user,
            assignment: activeAssignment,
            traceableItem: null,
        });

        if (!access.allowed_by_area) {
            const error = new Error(
                'No puedes registrar entrada con un QR asignado a otra área.'
            );
            error.statusCode = 403;
            throw error;
        }

        const existingTraceableItem = await db.TraceableItem.findOne({
            where: {
                qr_code_id: qr.id,
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (existingTraceableItem) {
            const error = new Error(
                'Este QR ya está vinculado a una unidad trazable.'
            );
            error.statusCode = 400;
            throw error;
        }

        const material = await db.Material.findByPk(materialId, {
            transaction,
        });

        if (!material) {
            const error = new Error('Material no encontrado.');
            error.statusCode = 404;
            throw error;
        }

        if (material.is_active === false) {
            const error = new Error(
                'No puedes registrar entrada de un material inactivo.'
            );
            error.statusCode = 400;
            throw error;
        }

        const traceableItem = await db.TraceableItem.create(
            {
                qr_code_id: qr.id,
                item_type: TRACEABLE_ITEM_TYPE.RAW_MATERIAL_LOT,
                material_id: material.id,
                product_name: null,
                origin_area_id: activeAssignment.area_id,
                current_area_id: activeAssignment.area_id,
                quantity_initial: quantity,
                quantity_current: quantity,
                unit,
                status: TRACEABLE_ITEM_STATUS.DISPONIBLE,
                reference_folio: referenceFolio,
                supplier_lot: supplierLot,
                supplier_reference: supplierReference,
                location,
                metadata: {
                    ...metadata,
                    registered_from: 'RAW_MATERIAL_ENTRY',
                    material_default_unit: material.default_unit,
                },
                notes,
                created_by: userId,
                updated_by: userId,
            },
            { transaction }
        );

        const movement = await db.TraceabilityMovement.create(
            {
                traceable_item_id: traceableItem.id,
                qr_code_id: qr.id,
                movement_type: TRACEABILITY_MOVEMENT_TYPE.RECEPCION_MP,
                from_area_id: null,
                to_area_id: activeAssignment.area_id,
                quantity,
                unit,
                balance_after: quantity,
                reference_folio: referenceFolio,
                notes: notes || 'Recepción inicial de materia prima.',
                metadata: {
                    supplier_lot: supplierLot,
                    supplier_reference: supplierReference,
                    location,
                },
                performed_by: userId,
            },
            { transaction }
        );

        await activeAssignment.update(
            {
                status: QR_AREA_ASSIGNMENT_STATUS.CERRADA,
                released_at: new Date(),
                updated_by: userId,
            },
            { transaction }
        );

        await db.QrCode.update(
            {
                status: QR_STATUS.EN_USO,
            },
            {
                where: {
                    id: qr.id,
                },
                transaction,
            }
        );

        const createdItem = await db.TraceableItem.findByPk(traceableItem.id, {
            include: [
                {
                    model: db.QrCode,
                    as: 'qr_code',
                    required: false,
                },
                {
                    model: db.Material,
                    as: 'material',
                    attributes: [
                        'id',
                        'code',
                        'name',
                        'material_type',
                        'default_unit',
                        'is_active',
                    ],
                    required: false,
                },
                {
                    model: db.Area,
                    as: 'origin_area',
                    attributes: ['id', 'code', 'name', 'is_active'],
                    required: false,
                },
                {
                    model: db.Area,
                    as: 'current_area',
                    attributes: ['id', 'code', 'name', 'is_active'],
                    required: false,
                },
            ],
            transaction,
        });

        return {
            qr: {
                ...buildQrDto(qr),
                status: QR_STATUS.EN_USO,
            },
            traceable_item: buildTraceableItemDto(createdItem),
            movement: {
                id: movement.id,
                movement_type: movement.movement_type,
                quantity: movement.quantity,
                unit: movement.unit,
                balance_after: movement.balance_after,
                reference_folio: movement.reference_folio,
                notes: movement.notes,
                performed_at: movement.performed_at,
            },
            next_recommended_action: {
                key: TRACEABILITY_ALLOWED_ACTION.TRANSFER_TO_AREA,
                label: 'Enviar a proceso',
                description:
                    'La materia prima ya está disponible para transferirse a un proceso.',
                priority: 'primary',
            },
        };
    });
};

const warehouseTransfer = async ({ payload, user }) => {
    const sourceQrCodeId = payload.source_qr_code_id
        ? Number(payload.source_qr_code_id)
        : null;

    const sourceQrCodeValue = payload.source_qr_code
        ? String(payload.source_qr_code).trim()
        : null;

    const childQrCodeId = payload.child_qr_code_id
        ? Number(payload.child_qr_code_id)
        : null;

    const childQrCodeValue = payload.child_qr_code
        ? String(payload.child_qr_code).trim()
        : null;

    const toAreaId = Number(payload.to_area_id);
    const quantity = Number(payload.quantity);
    const unit = payload.unit ? String(payload.unit).trim().toUpperCase() : null;

    const referenceFolio = payload.reference_folio
        ? String(payload.reference_folio).trim()
        : null;

    const location = payload.location ? String(payload.location).trim() : null;
    const notes = payload.notes ? String(payload.notes).trim() : null;

    const metadata =
        payload.metadata && typeof payload.metadata === 'object'
            ? payload.metadata
            : {};

    if ((!sourceQrCodeId && !sourceQrCodeValue) || (sourceQrCodeId && sourceQrCodeValue)) {
        const error = new Error(
            'Debes enviar source_qr_code_id o source_qr_code, pero no ambos.'
        );
        error.statusCode = 400;
        throw error;
    }

    if ((!childQrCodeId && !childQrCodeValue) || (childQrCodeId && childQrCodeValue)) {
        const error = new Error(
            'Debes enviar child_qr_code_id o child_qr_code, pero no ambos.'
        );
        error.statusCode = 400;
        throw error;
    }

    if (!Number.isInteger(toAreaId) || toAreaId <= 0) {
        const error = new Error('Debes proporcionar un área destino válida.');
        error.statusCode = 400;
        throw error;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
        const error = new Error('La cantidad a transferir debe ser mayor a cero.');
        error.statusCode = 400;
        throw error;
    }

    if (!unit) {
        const error = new Error('Debes proporcionar la unidad de medida.');
        error.statusCode = 400;
        throw error;
    }

    const userId = user?.id || null;
    const qrCodeField = getQrCodeFieldName();

    return db.sequelize.transaction(async (transaction) => {
        const sourceQr = await db.QrCode.findOne({
            where: sourceQrCodeId
                ? { id: sourceQrCodeId }
                : { [qrCodeField]: sourceQrCodeValue },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!sourceQr) {
            const error = new Error('QR origen no encontrado.');
            error.statusCode = 404;
            throw error;
        }

        const childQr = await db.QrCode.findOne({
            where: childQrCodeId
                ? { id: childQrCodeId }
                : { [qrCodeField]: childQrCodeValue },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!childQr) {
            const error = new Error('QR hijo no encontrado.');
            error.statusCode = 404;
            throw error;
        }

        if (sourceQr.id === childQr.id) {
            const error = new Error('El QR origen y el QR hijo no pueden ser el mismo.');
            error.statusCode = 400;
            throw error;
        }

        const sourceTraceableItem = await db.TraceableItem.findOne({
            where: {
                qr_code_id: sourceQr.id,
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!sourceTraceableItem) {
            const error = new Error('El QR origen no tiene una unidad trazable asociada.');
            error.statusCode = 400;
            throw error;
        }

        if (sourceTraceableItem.item_type !== TRACEABLE_ITEM_TYPE.RAW_MATERIAL_LOT) {
            const error = new Error(
                'Por ahora, Almacén solo puede transferir unidades tipo RAW_MATERIAL_LOT.'
            );
            error.statusCode = 400;
            throw error;
        }

        if (sourceTraceableItem.status !== TRACEABLE_ITEM_STATUS.DISPONIBLE) {
            const error = new Error(
                `El material origen no está disponible. Estado actual: ${sourceTraceableItem.status}.`
            );
            error.statusCode = 400;
            throw error;
        }

        if (String(sourceTraceableItem.unit).toUpperCase() !== unit) {
            const error = new Error(
                `La unidad enviada (${unit}) no coincide con la unidad del material origen (${sourceTraceableItem.unit}).`
            );
            error.statusCode = 400;
            throw error;
        }

        const sourceCurrentQuantity = toNumber(sourceTraceableItem.quantity_current);

        if (quantity > sourceCurrentQuantity) {
            const error = new Error(
                `Cantidad insuficiente. Disponible: ${sourceCurrentQuantity} ${sourceTraceableItem.unit}.`
            );
            error.statusCode = 400;
            throw error;
        }

        const toArea = await db.Area.findByPk(toAreaId, {
            attributes: ['id', 'code', 'name', 'is_active'],
            transaction,
        });

        if (!toArea) {
            const error = new Error('Área destino no encontrada.');
            error.statusCode = 404;
            throw error;
        }

        if (toArea.is_active === false) {
            const error = new Error('No puedes transferir material a un área inactiva.');
            error.statusCode = 400;
            throw error;
        }

        if (Number(sourceTraceableItem.current_area_id) === Number(toAreaId)) {
            const error = new Error(
                'El área destino debe ser diferente al área actual del material.'
            );
            error.statusCode = 400;
            throw error;
        }

        const access = getBaseAccessContext({
            user,
            assignment: null,
            traceableItem: sourceTraceableItem,
        });

        if (!access.allowed_by_area) {
            const error = new Error(
                'No puedes transferir material que pertenece a otra área.'
            );
            error.statusCode = 403;
            throw error;
        }

        if (![QR_STATUS.GENERADO, QR_STATUS.DISPONIBLE].includes(childQr.status)) {
            const error = new Error(
                `El QR hijo no está disponible para usarse. Estado actual: ${childQr.status}.`
            );
            error.statusCode = 400;
            throw error;
        }

        const existingChildTraceableItem = await db.TraceableItem.findOne({
            where: {
                qr_code_id: childQr.id,
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (existingChildTraceableItem) {
            const error = new Error(
                'El QR hijo ya está vinculado a una unidad trazable.'
            );
            error.statusCode = 400;
            throw error;
        }

        const childAssignment = await db.QrAreaAssignment.findOne({
            where: {
                qr_code_id: childQr.id,
                status: QR_AREA_ASSIGNMENT_STATUS.ACTIVA,
            },
            order: [['assigned_at', 'DESC']],
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!childAssignment) {
            const error = new Error(
                'El QR hijo debe estar asignado al área origen antes de usarse.'
            );
            error.statusCode = 400;
            throw error;
        }

        if (Number(childAssignment.area_id) !== Number(sourceTraceableItem.current_area_id)) {
            const error = new Error(
                'El QR hijo debe pertenecer al pool de QRs disponibles del área origen.'
            );
            error.statusCode = 400;
            throw error;
        }

        const sourceNewBalance = Number(
            (sourceCurrentQuantity - quantity).toFixed(3)
        );

        const sourceNewStatus =
            sourceNewBalance <= 0
                ? TRACEABLE_ITEM_STATUS.CONSUMIDO
                : TRACEABLE_ITEM_STATUS.DISPONIBLE;

        await sourceTraceableItem.update(
            {
                quantity_current: sourceNewBalance,
                status: sourceNewStatus,
                updated_by: userId,
            },
            { transaction }
        );

        const childTraceableItem = await db.TraceableItem.create(
            {
                qr_code_id: childQr.id,
                item_type: TRACEABLE_ITEM_TYPE.PROCESS_INPUT,
                material_id: sourceTraceableItem.material_id,
                product_name: sourceTraceableItem.product_name,
                origin_area_id: sourceTraceableItem.current_area_id,
                current_area_id: toAreaId,
                quantity_initial: quantity,
                quantity_current: quantity,
                unit,
                status: TRACEABLE_ITEM_STATUS.TRANSFERIDO,
                reference_folio: referenceFolio,
                supplier_lot: sourceTraceableItem.supplier_lot,
                supplier_reference: sourceTraceableItem.supplier_reference,
                location,
                metadata: {
                    ...metadata,
                    transferred_from_traceable_item_id: sourceTraceableItem.id,
                    transferred_from_qr_code_id: sourceQr.id,
                    source_reference_folio: sourceTraceableItem.reference_folio,
                },
                notes,
                created_by: userId,
                updated_by: userId,
            },
            { transaction }
        );

        const sourceMovement = await db.TraceabilityMovement.create(
            {
                traceable_item_id: sourceTraceableItem.id,
                qr_code_id: sourceQr.id,
                movement_type: TRACEABILITY_MOVEMENT_TYPE.TRANSFERENCIA_AREA,
                from_area_id: sourceTraceableItem.current_area_id,
                to_area_id: toAreaId,
                quantity,
                unit,
                balance_after: sourceNewBalance,
                reference_folio: referenceFolio,
                notes: notes || 'Salida parcial de material desde Almacén.',
                metadata: {
                    ...metadata,
                    movement_side: 'SOURCE',
                    child_traceable_item_id: childTraceableItem.id,
                    child_qr_code_id: childQr.id,
                },
                performed_by: userId,
            },
            { transaction }
        );

        const childMovement = await db.TraceabilityMovement.create(
            {
                traceable_item_id: childTraceableItem.id,
                qr_code_id: childQr.id,
                movement_type: TRACEABILITY_MOVEMENT_TYPE.TRANSFERENCIA_AREA,
                from_area_id: sourceTraceableItem.current_area_id,
                to_area_id: toAreaId,
                quantity,
                unit,
                balance_after: quantity,
                reference_folio: referenceFolio,
                notes: notes || 'Entrada transferida hacia proceso.',
                metadata: {
                    ...metadata,
                    movement_side: 'CHILD',
                    parent_traceable_item_id: sourceTraceableItem.id,
                    parent_qr_code_id: sourceQr.id,
                },
                performed_by: userId,
            },
            { transaction }
        );

        const traceabilityLink = await db.TraceabilityLink.create(
            {
                parent_traceable_item_id: sourceTraceableItem.id,
                child_traceable_item_id: childTraceableItem.id,
                parent_qr_code_id: sourceQr.id,
                child_qr_code_id: childQr.id,
                link_type: TRACEABILITY_LINK_TYPE.TRANSFERENCIA_PARCIAL,
                quantity_used: quantity,
                quantity_generated: quantity,
                scrap_quantity: 0,
                unit,
                process_area_id: toAreaId,
                notes: notes || 'Transferencia parcial desde Almacén hacia proceso.',
                metadata: {
                    ...metadata,
                    reference_folio: referenceFolio,
                },
                created_by: userId,
            },
            { transaction }
        );

        await childAssignment.update(
            {
                status: QR_AREA_ASSIGNMENT_STATUS.CERRADA,
                released_at: new Date(),
                updated_by: userId,
            },
            { transaction }
        );

        await db.QrCode.update(
            {
                status:
                    sourceNewBalance <= 0
                        ? QR_STATUS.FINALIZADO
                        : QR_STATUS.EN_USO,
            },
            {
                where: {
                    id: sourceQr.id,
                },
                transaction,
            }
        );

        await db.QrCode.update(
            {
                status: QR_STATUS.TRANSFERIDO,
            },
            {
                where: {
                    id: childQr.id,
                },
                transaction,
            }
        );

        const updatedSourceItem = await db.TraceableItem.findByPk(
            sourceTraceableItem.id,
            {
                include: [
                    {
                        model: db.Material,
                        as: 'material',
                        attributes: [
                            'id',
                            'code',
                            'name',
                            'material_type',
                            'default_unit',
                            'is_active',
                        ],
                        required: false,
                    },
                    {
                        model: db.Area,
                        as: 'origin_area',
                        attributes: ['id', 'code', 'name', 'is_active'],
                        required: false,
                    },
                    {
                        model: db.Area,
                        as: 'current_area',
                        attributes: ['id', 'code', 'name', 'is_active'],
                        required: false,
                    },
                ],
                transaction,
            }
        );

        const createdChildItem = await db.TraceableItem.findByPk(
            childTraceableItem.id,
            {
                include: [
                    {
                        model: db.Material,
                        as: 'material',
                        attributes: [
                            'id',
                            'code',
                            'name',
                            'material_type',
                            'default_unit',
                            'is_active',
                        ],
                        required: false,
                    },
                    {
                        model: db.Area,
                        as: 'origin_area',
                        attributes: ['id', 'code', 'name', 'is_active'],
                        required: false,
                    },
                    {
                        model: db.Area,
                        as: 'current_area',
                        attributes: ['id', 'code', 'name', 'is_active'],
                        required: false,
                    },
                ],
                transaction,
            }
        );

        return {
            source: {
                qr: {
                    ...buildQrDto(sourceQr),
                    status:
                        sourceNewBalance <= 0
                            ? QR_STATUS.FINALIZADO
                            : QR_STATUS.EN_USO,
                },
                traceable_item: buildTraceableItemDto(updatedSourceItem),
                movement: {
                    id: sourceMovement.id,
                    movement_type: sourceMovement.movement_type,
                    quantity: sourceMovement.quantity,
                    unit: sourceMovement.unit,
                    balance_after: sourceMovement.balance_after,
                    reference_folio: sourceMovement.reference_folio,
                    performed_at: sourceMovement.performed_at,
                },
            },
            child: {
                qr: {
                    ...buildQrDto(childQr),
                    status: QR_STATUS.TRANSFERIDO,
                },
                traceable_item: buildTraceableItemDto(createdChildItem),
                movement: {
                    id: childMovement.id,
                    movement_type: childMovement.movement_type,
                    quantity: childMovement.quantity,
                    unit: childMovement.unit,
                    balance_after: childMovement.balance_after,
                    reference_folio: childMovement.reference_folio,
                    performed_at: childMovement.performed_at,
                },
            },
            link: {
                id: traceabilityLink.id,
                link_type: traceabilityLink.link_type,
                parent_traceable_item_id: traceabilityLink.parent_traceable_item_id,
                child_traceable_item_id: traceabilityLink.child_traceable_item_id,
                quantity_used: traceabilityLink.quantity_used,
                quantity_generated: traceabilityLink.quantity_generated,
                unit: traceabilityLink.unit,
            },
            next_recommended_action: {
                key: TRACEABILITY_ALLOWED_ACTION.RECEIVE_IN_AREA,
                label: 'Recibir en área destino',
                description:
                    'El área destino debe confirmar la recepción física del material.',
                priority: 'primary',
            },
        };
    });
};

const prepareProcessFormula = async ({ payload, user, req }) => {
    const formulaId = Number(payload.formula_id);

    const destinationQrCodeId = payload.destination_qr_code_id
        ? Number(payload.destination_qr_code_id)
        : null;

    const destinationQrCodeValue = payload.destination_qr_code
        ? String(payload.destination_qr_code).trim()
        : null;

    const referenceFolio = payload.reference_folio
        ? String(payload.reference_folio).trim()
        : null;

    const totalQuantity = Number(payload.total_quantity);
    const unit = payload.unit ? String(payload.unit).trim().toUpperCase() : null;
    const notes = payload.notes ? String(payload.notes).trim() : null;

    const metadata =
        payload.metadata && typeof payload.metadata === 'object'
            ? payload.metadata
            : {};

    const inputs = Array.isArray(payload.inputs) ? payload.inputs : [];

    if (!Number.isInteger(formulaId) || formulaId <= 0) {
        const error = new Error('Debes proporcionar una fórmula válida.');
        error.statusCode = 400;
        throw error;
    }

    if (
        (!destinationQrCodeId && !destinationQrCodeValue) ||
        (destinationQrCodeId && destinationQrCodeValue)
    ) {
        const error = new Error(
            'Debes enviar destination_qr_code_id o destination_qr_code, pero no ambos.'
        );
        error.statusCode = 400;
        throw error;
    }

    if (!inputs.length) {
        const error = new Error('Debes proporcionar al menos un material de entrada.');
        error.statusCode = 400;
        throw error;
    }

    if (!Number.isFinite(totalQuantity) || totalQuantity <= 0) {
        const error = new Error('La cantidad total preparada debe ser mayor a cero.');
        error.statusCode = 400;
        throw error;
    }

    if (!unit) {
        const error = new Error('Debes proporcionar la unidad de la preparación.');
        error.statusCode = 400;
        throw error;
    }

    const userId = user?.id || null;
    const qrCodeField = getQrCodeFieldName();

    return db.sequelize.transaction(async (transaction) => {
        const formula = await db.ProcessFormula.findByPk(formulaId, {
            include: [
                {
                    model: db.Area,
                    as: 'target_area',
                    attributes: ['id', 'code', 'name', 'is_active'],
                    required: false,
                },
                {
                    model: db.ProcessFormulaItem,
                    as: 'items',
                    required: false,
                    include: [
                        {
                            model: db.Material,
                            as: 'material',
                            attributes: [
                                'id',
                                'code',
                                'name',
                                'material_type',
                                'default_unit',
                                'is_active',
                            ],
                            required: false,
                        },
                    ],
                },
            ],
            transaction,
        });

        if (!formula) {
            const error = new Error('Fórmula no encontrada.');
            error.statusCode = 404;
            throw error;
        }

        if (!formula.is_active || formula.status !== 'ACTIVA') {
            const error = new Error('La fórmula no está activa.');
            error.statusCode = 400;
            throw error;
        }

        if (!formula.target_area || formula.target_area.is_active === false) {
            const error = new Error('El área destino de la fórmula no está activa.');
            error.statusCode = 400;
            throw error;
        }

        const toAreaId = Number(formula.target_area_id);

        const destinationQr = await db.QrCode.findOne({
            where: destinationQrCodeId
                ? { id: destinationQrCodeId }
                : { [qrCodeField]: destinationQrCodeValue },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!destinationQr) {
            const error = new Error('QR destino no encontrado.');
            error.statusCode = 404;
            throw error;
        }

        if (![QR_STATUS.GENERADO, QR_STATUS.DISPONIBLE].includes(destinationQr.status)) {
            const error = new Error(
                `El QR destino no está disponible para usarse. Estado actual: ${destinationQr.status}.`
            );
            error.statusCode = 400;
            throw error;
        }

        const existingDestinationItem = await db.TraceableItem.findOne({
            where: {
                qr_code_id: destinationQr.id,
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (existingDestinationItem) {
            const error = new Error('El QR destino ya está vinculado a una unidad trazable.');
            error.statusCode = 400;
            throw error;
        }

        const destinationAssignment = await db.QrAreaAssignment.findOne({
            where: {
                qr_code_id: destinationQr.id,
                status: QR_AREA_ASSIGNMENT_STATUS.ACTIVA,
            },
            order: [['assigned_at', 'DESC']],
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!destinationAssignment) {
            const error = new Error(
                'El QR destino debe estar asignado al área destino antes de usarse.'
            );
            error.statusCode = 400;
            throw error;
        }

        if (Number(destinationAssignment.area_id) !== toAreaId) {
            const error = new Error(
                'El QR destino debe pertenecer al pool de QRs del área destino de la fórmula.'
            );
            error.statusCode = 400;
            throw error;
        }

        const formulaItems = formula.items || [];

        const requiredFormulaItems = formulaItems.filter((item) => item.is_required);

        const inputMaterialTotals = new Map();

        for (const input of inputs) {
            const materialId = Number(input.material_id);
            const quantity = Number(input.quantity);
            const inputUnit = input.unit ? String(input.unit).trim().toUpperCase() : null;

            if (!Number.isInteger(materialId) || materialId <= 0) {
                const error = new Error('Cada entrada debe tener un material válido.');
                error.statusCode = 400;
                throw error;
            }

            if (!Number.isFinite(quantity) || quantity <= 0) {
                const error = new Error('Cada entrada debe tener una cantidad mayor a cero.');
                error.statusCode = 400;
                throw error;
            }

            if (!inputUnit) {
                const error = new Error('Cada entrada debe tener unidad.');
                error.statusCode = 400;
                throw error;
            }

            const previous = inputMaterialTotals.get(materialId) || {
                quantity: 0,
                unit: inputUnit,
            };

            if (previous.unit !== inputUnit) {
                const error = new Error(
                    `El material ${materialId} tiene unidades mezcladas en la preparación.`
                );
                error.statusCode = 400;
                throw error;
            }

            inputMaterialTotals.set(materialId, {
                quantity: previous.quantity + quantity,
                unit: inputUnit,
            });
        }

        for (const requiredItem of requiredFormulaItems) {
            if (!inputMaterialTotals.has(Number(requiredItem.material_id))) {
                const error = new Error(
                    `Falta capturar el material requerido ${requiredItem.material?.code || requiredItem.material_id}.`
                );
                error.statusCode = 400;
                throw error;
            }
        }

        for (const [materialId, total] of inputMaterialTotals.entries()) {
            const formulaItem = formulaItems.find(
                (item) => Number(item.material_id) === Number(materialId)
            );

            if (!formulaItem) {
                const error = new Error(
                    `El material ${materialId} no pertenece a la fórmula seleccionada.`
                );
                error.statusCode = 400;
                throw error;
            }

            if (String(formulaItem.unit).toUpperCase() !== total.unit) {
                const error = new Error(
                    `La unidad del material ${formulaItem.material?.code || materialId} no coincide con la fórmula.`
                );
                error.statusCode = 400;
                throw error;
            }

            if (formulaItem.calculation_type === 'FIXED_QUANTITY') {
                const expectedQuantity = toNumber(formulaItem.quantity);
                const toleranceMin = toNumber(formulaItem.tolerance_min);
                const toleranceMax = toNumber(formulaItem.tolerance_max);

                const minAllowed = Number((expectedQuantity - toleranceMin).toFixed(3));
                const maxAllowed = Number((expectedQuantity + toleranceMax).toFixed(3));

                if (total.quantity < minAllowed || total.quantity > maxAllowed) {
                    const error = new Error(
                        `La cantidad del material ${formulaItem.material?.code || materialId} está fuera de tolerancia. Esperado: ${expectedQuantity} ${formulaItem.unit}. Capturado: ${total.quantity} ${total.unit}.`
                    );
                    error.statusCode = 400;
                    throw error;
                }
            }
        }

        const inputsTotal = Array.from(inputMaterialTotals.values()).reduce(
            (sum, item) => sum + item.quantity,
            0
        );

        if (Number(inputsTotal.toFixed(3)) !== Number(totalQuantity.toFixed(3))) {
            const error = new Error(
                `La suma de entradas (${inputsTotal.toFixed(3)} ${unit}) no coincide con el total preparado (${totalQuantity.toFixed(3)} ${unit}).`
            );
            error.statusCode = 400;
            throw error;
        }

        let fromAreaId = null;

        const sourceRecords = [];

        for (const input of inputs) {
            const sourceQrCodeId = input.source_qr_code_id
                ? Number(input.source_qr_code_id)
                : null;

            const sourceQrCodeValue = input.source_qr_code
                ? String(input.source_qr_code).trim()
                : null;

            const materialId = Number(input.material_id);
            const quantity = Number(input.quantity);
            const inputUnit = String(input.unit).trim().toUpperCase();

            if (
                (!sourceQrCodeId && !sourceQrCodeValue) ||
                (sourceQrCodeId && sourceQrCodeValue)
            ) {
                const error = new Error(
                    'Cada entrada debe enviar source_qr_code_id o source_qr_code, pero no ambos.'
                );
                error.statusCode = 400;
                throw error;
            }

            const sourceQr = await db.QrCode.findOne({
                where: sourceQrCodeId
                    ? { id: sourceQrCodeId }
                    : { [qrCodeField]: sourceQrCodeValue },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            if (!sourceQr) {
                const error = new Error(`QR origen no encontrado: ${sourceQrCodeValue || sourceQrCodeId}`);
                error.statusCode = 404;
                throw error;
            }

            const sourceItem = await db.TraceableItem.findOne({
                where: {
                    qr_code_id: sourceQr.id,
                },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });

            if (!sourceItem) {
                const error = new Error(
                    `El QR origen ${sourceQrCodeValue || sourceQrCodeId} no tiene material trazable asociado.`
                );
                error.statusCode = 400;
                throw error;
            }

            if (sourceItem.status !== TRACEABLE_ITEM_STATUS.DISPONIBLE) {
                const error = new Error(
                    `El material origen ${sourceQrCodeValue || sourceQrCodeId} no está disponible. Estado actual: ${sourceItem.status}.`
                );
                error.statusCode = 400;
                throw error;
            }

            if (Number(sourceItem.material_id) !== materialId) {
                const error = new Error(
                    `El material capturado no coincide con el material del QR origen ${sourceQrCodeValue || sourceQrCodeId}.`
                );
                error.statusCode = 400;
                throw error;
            }

            if (String(sourceItem.unit).toUpperCase() !== inputUnit) {
                const error = new Error(
                    `La unidad capturada no coincide con la unidad del QR origen ${sourceQrCodeValue || sourceQrCodeId}.`
                );
                error.statusCode = 400;
                throw error;
            }

            if (!fromAreaId) {
                fromAreaId = Number(sourceItem.current_area_id);
            }

            if (Number(sourceItem.current_area_id) !== fromAreaId) {
                const error = new Error(
                    'Todos los materiales de la preparación deben salir de la misma área.'
                );
                error.statusCode = 400;
                throw error;
            }

            if (Number(sourceItem.current_area_id) === toAreaId) {
                const error = new Error(
                    'El área origen y el área destino no pueden ser la misma en esta preparación.'
                );
                error.statusCode = 400;
                throw error;
            }

            const access = getBaseAccessContext({
                user,
                assignment: null,
                traceableItem: sourceItem,
            });

            if (!access.allowed_by_area) {
                const error = new Error(
                    `No puedes preparar material desde un QR que pertenece a otra área: ${sourceQrCodeValue || sourceQrCodeId}.`
                );
                error.statusCode = 403;
                throw error;
            }

            const balanceBefore = toNumber(sourceItem.quantity_current);

            if (quantity > balanceBefore) {
                const error = new Error(
                    `Cantidad insuficiente en QR ${sourceQrCodeValue || sourceQrCodeId}. Disponible: ${balanceBefore} ${sourceItem.unit}.`
                );
                error.statusCode = 400;
                throw error;
            }

            sourceRecords.push({
                input,
                sourceQr,
                sourceItem,
                quantity,
                unit: inputUnit,
                balanceBefore,
            });
        }

        const baseFormulaItem =
            formulaItems.find((item) => item.material_role === 'BASE') || formulaItems[0];

        const destinationTraceableItem = await db.TraceableItem.create(
            {
                qr_code_id: destinationQr.id,
                item_type: TRACEABLE_ITEM_TYPE.PREPARED_MIX,
                material_id: baseFormulaItem?.material_id || null,
                product_name: formula.name,
                origin_area_id: fromAreaId,
                current_area_id: toAreaId,
                quantity_initial: totalQuantity,
                quantity_current: totalQuantity,
                unit,
                status: TRACEABLE_ITEM_STATUS.TRANSFERIDO,
                reference_folio: referenceFolio,
                supplier_lot: null,
                supplier_reference: null,
                location: null,
                metadata: {
                    ...metadata,
                    formula_id: formula.id,
                    formula_code: formula.code,
                    formula_name: formula.name,
                    formula_version: formula.version,
                    formula_items: formulaItems.map((item) => ({
                        formula_item_id: item.id,
                        material_id: item.material_id,
                        material_code: item.material?.code || null,
                        material_role: item.material_role,
                        calculation_type: item.calculation_type,
                        quantity: item.quantity,
                        percentage: item.percentage,
                        unit: item.unit,
                    })),
                    composition: sourceRecords.map((record) => ({
                        source_qr_code_id: record.sourceQr.id,
                        source_qr_code: record.sourceQr[qrCodeField],
                        source_traceable_item_id: record.sourceItem.id,
                        material_id: record.sourceItem.material_id,
                        quantity: record.quantity,
                        unit: record.unit,
                    })),
                },
                notes: notes || `Preparación de fórmula ${formula.code}.`,
                created_by: userId,
                updated_by: userId,
            },
            { transaction }
        );

        const preparation = await db.ProcessPreparation.create(
            {
                folio: referenceFolio || `PREP-${Date.now()}`,
                formula_id: formula.id,
                from_area_id: fromAreaId,
                to_area_id: toAreaId,
                destination_qr_code_id: destinationQr.id,
                destination_traceable_item_id: destinationTraceableItem.id,
                target_intermediate_material_id:
                    formula.target_intermediate_material_id || null,
                total_quantity: totalQuantity,
                unit,
                status: 'TRANSFERIDA',
                notes,
                metadata,
                prepared_by: userId,
                prepared_at: new Date(),
            },
            { transaction }
        );

        const inputResults = [];

        for (const record of sourceRecords) {
            const formulaItem = formulaItems.find(
                (item) => Number(item.material_id) === Number(record.sourceItem.material_id)
            );

            const balanceAfter = Number(
                (record.balanceBefore - record.quantity).toFixed(3)
            );

            const sourceNewStatus =
                balanceAfter <= 0
                    ? TRACEABLE_ITEM_STATUS.CONSUMIDO
                    : TRACEABLE_ITEM_STATUS.DISPONIBLE;

            await record.sourceItem.update(
                {
                    quantity_current: balanceAfter,
                    status: sourceNewStatus,
                    updated_by: userId,
                },
                { transaction }
            );

            await db.ProcessPreparationInput.create(
                {
                    preparation_id: preparation.id,
                    formula_item_id: formulaItem?.id || null,
                    source_traceable_item_id: record.sourceItem.id,
                    source_qr_code_id: record.sourceQr.id,
                    material_id: record.sourceItem.material_id,
                    quantity: record.quantity,
                    unit: record.unit,
                    balance_before: record.balanceBefore,
                    balance_after: balanceAfter,
                },
                { transaction }
            );

            const sourceMovement = await db.TraceabilityMovement.create(
                {
                    traceable_item_id: record.sourceItem.id,
                    qr_code_id: record.sourceQr.id,
                    movement_type: TRACEABILITY_MOVEMENT_TYPE.PREPARACION_FORMULA,
                    from_area_id: fromAreaId,
                    to_area_id: toAreaId,
                    quantity: record.quantity,
                    unit: record.unit,
                    balance_after: balanceAfter,
                    reference_folio: preparation.folio,
                    notes:
                        notes ||
                        `Salida de material para preparación de fórmula ${formula.code}.`,
                    metadata: {
                        preparation_id: preparation.id,
                        formula_id: formula.id,
                        formula_code: formula.code,
                        destination_traceable_item_id: destinationTraceableItem.id,
                        destination_qr_code_id: destinationQr.id,
                    },
                    performed_by: userId,
                },
                { transaction }
            );

            await db.TraceabilityLink.create(
                {
                    parent_traceable_item_id: record.sourceItem.id,
                    child_traceable_item_id: destinationTraceableItem.id,
                    parent_qr_code_id: record.sourceQr.id,
                    child_qr_code_id: destinationQr.id,
                    link_type: TRACEABILITY_LINK_TYPE.PREPARACION_FORMULA,
                    quantity_used: record.quantity,
                    quantity_generated: totalQuantity,
                    scrap_quantity: 0,
                    unit: record.unit,
                    process_area_id: toAreaId,
                    notes: `Componente usado en preparación ${preparation.folio}.`,
                    metadata: {
                        preparation_id: preparation.id,
                        formula_id: formula.id,
                        formula_code: formula.code,
                        source_movement_id: sourceMovement.id,
                    },
                    created_by: userId,
                },
                { transaction }
            );

            if (balanceAfter <= 0) {
                await db.QrCode.update(
                    {
                        status: QR_STATUS.FINALIZADO,
                    },
                    {
                        where: {
                            id: record.sourceQr.id,
                        },
                        transaction,
                    }
                );
            }

            inputResults.push({
                source_qr: {
                    id: record.sourceQr.id,
                    code: record.sourceQr[qrCodeField],
                    status: balanceAfter <= 0 ? QR_STATUS.FINALIZADO : record.sourceQr.status,
                },
                source_traceable_item_id: record.sourceItem.id,
                material_id: record.sourceItem.material_id,
                quantity_used: record.quantity,
                unit: record.unit,
                balance_before: record.balanceBefore,
                balance_after: balanceAfter,
            });
        }

        const destinationMovement = await db.TraceabilityMovement.create(
            {
                traceable_item_id: destinationTraceableItem.id,
                qr_code_id: destinationQr.id,
                movement_type: TRACEABILITY_MOVEMENT_TYPE.PREPARACION_FORMULA,
                from_area_id: fromAreaId,
                to_area_id: toAreaId,
                quantity: totalQuantity,
                unit,
                balance_after: totalQuantity,
                reference_folio: preparation.folio,
                notes: notes || `Preparación transferida hacia ${formula.target_area?.name}.`,
                metadata: {
                    preparation_id: preparation.id,
                    formula_id: formula.id,
                    formula_code: formula.code,
                    movement_side: 'DESTINATION',
                },
                performed_by: userId,
            },
            { transaction }
        );

        await destinationAssignment.update(
            {
                status: QR_AREA_ASSIGNMENT_STATUS.CERRADA,
                released_at: new Date(),
                updated_by: userId,
            },
            { transaction }
        );

        await db.QrCode.update(
            {
                status: QR_STATUS.TRANSFERIDO,
            },
            {
                where: {
                    id: destinationQr.id,
                },
                transaction,
            }
        );

        const createdDestinationItem = await db.TraceableItem.findByPk(
            destinationTraceableItem.id,
            {
                include: [
                    {
                        model: db.Material,
                        as: 'material',
                        attributes: [
                            'id',
                            'code',
                            'name',
                            'material_type',
                            'default_unit',
                            'is_active',
                        ],
                        required: false,
                    },
                    {
                        model: db.Area,
                        as: 'origin_area',
                        attributes: ['id', 'code', 'name', 'is_active'],
                        required: false,
                    },
                    {
                        model: db.Area,
                        as: 'current_area',
                        attributes: ['id', 'code', 'name', 'is_active'],
                        required: false,
                    },
                ],
                transaction,
            }
        );

        const result = {
            preparation: {
                id: preparation.id,
                folio: preparation.folio,
                status: preparation.status,
                formula: {
                    id: formula.id,
                    code: formula.code,
                    name: formula.name,
                    version: formula.version,
                },
                from_area_id: fromAreaId,
                to_area: {
                    id: formula.target_area.id,
                    code: formula.target_area.code,
                    name: formula.target_area.name,
                },
                total_quantity: preparation.total_quantity,
                unit: preparation.unit,
                prepared_at: preparation.prepared_at,
            },
            destination: {
                qr: {
                    ...buildQrDto(destinationQr),
                    status: QR_STATUS.TRANSFERIDO,
                },
                traceable_item: buildTraceableItemDto(createdDestinationItem),
                movement: {
                    id: destinationMovement.id,
                    movement_type: destinationMovement.movement_type,
                    quantity: destinationMovement.quantity,
                    unit: destinationMovement.unit,
                    balance_after: destinationMovement.balance_after,
                    performed_at: destinationMovement.performed_at,
                },
            },
            inputs: inputResults,
            next_recommended_action: {
                key: TRACEABILITY_ALLOWED_ACTION.RECEIVE_IN_AREA,
                label: 'Recibir preparación en área destino',
                description:
                    'Extrusión debe escanear el QR destino y confirmar la recepción física.',
                priority: 'primary',
            },
        };

        await auditService.createAuditLog({
            user,
            action: 'PREPARE_PROCESS_FORMULA',
            entityType: 'ProcessPreparation',
            entityId: preparation.id,
            module: 'Traceability',
            description: `Preparó fórmula ${formula.code} para ${formula.target_area?.name}.`,
            beforeData: null,
            afterData: result,
            metadata: {
                preparation_id: preparation.id,
                preparation_folio: preparation.folio,
                formula_id: formula.id,
                formula_code: formula.code,
                destination_qr_code_id: destinationQr.id,
                destination_traceable_item_id: destinationTraceableItem.id,
            },
            req,
            transaction,
        });

        return result;
    });
};

const receiveInArea = async ({ payload, user, req }) => {
    const qrCodeId = payload.qr_code_id ? Number(payload.qr_code_id) : null;

    const qrCodeValue = payload.qr_code
        ? String(payload.qr_code).trim()
        : null;

    const notes = payload.notes ? String(payload.notes).trim() : null;

    const metadata =
        payload.metadata && typeof payload.metadata === 'object'
            ? payload.metadata
            : {};

    if ((!qrCodeId && !qrCodeValue) || (qrCodeId && qrCodeValue)) {
        const error = new Error(
            'Debes enviar qr_code_id o qr_code, pero no ambos.'
        );
        error.statusCode = 400;
        throw error;
    }

    const userId = user?.id || null;
    const qrCodeField = getQrCodeFieldName();

    return db.sequelize.transaction(async (transaction) => {
        const qr = await db.QrCode.findOne({
            where: qrCodeId ? { id: qrCodeId } : { [qrCodeField]: qrCodeValue },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!qr) {
            const error = new Error('QR no encontrado.');
            error.statusCode = 404;
            throw error;
        }

        if (qr.status !== QR_STATUS.TRANSFERIDO) {
            const error = new Error(
                `El QR no está pendiente de recepción. Estado actual: ${qr.status}.`
            );
            error.statusCode = 400;
            throw error;
        }

        const traceableItem = await db.TraceableItem.findOne({
            where: {
                qr_code_id: qr.id,
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!traceableItem) {
            const error = new Error(
                'El QR no tiene una unidad trazable asociada para recibir.'
            );
            error.statusCode = 400;
            throw error;
        }

        if (traceableItem.status !== TRACEABLE_ITEM_STATUS.TRANSFERIDO) {
            const error = new Error(
                `La unidad trazable no está pendiente de recepción. Estado actual: ${traceableItem.status}.`
            );
            error.statusCode = 400;
            throw error;
        }

        const currentArea = await db.Area.findByPk(traceableItem.current_area_id, {
            attributes: ['id', 'code', 'name', 'is_active'],
            transaction,
        });

        if (!currentArea) {
            const error = new Error('El área actual del material no existe.');
            error.statusCode = 404;
            throw error;
        }

        if (currentArea.is_active === false) {
            const error = new Error('El área actual del material está inactiva.');
            error.statusCode = 400;
            throw error;
        }

        const access = getBaseAccessContext({
            user,
            assignment: null,
            traceableItem,
        });

        if (!access.allowed_by_area) {
            const error = new Error(
                'No puedes recibir material asignado a otra área.'
            );
            error.statusCode = 403;
            throw error;
        }

        const preparation = await db.ProcessPreparation.findOne({
            where: {
                destination_traceable_item_id: traceableItem.id,
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (preparation && preparation.status === 'RECIBIDA') {
            const error = new Error('Esta preparación ya fue recibida anteriormente.');
            error.statusCode = 400;
            throw error;
        }

        await traceableItem.update(
            {
                status: TRACEABLE_ITEM_STATUS.RECIBIDO,
                updated_by: userId,
            },
            { transaction }
        );

        await db.QrCode.update(
            {
                status: QR_STATUS.EN_USO,
            },
            {
                where: {
                    id: qr.id,
                },
                transaction,
            }
        );

        const movement = await db.TraceabilityMovement.create(
            {
                traceable_item_id: traceableItem.id,
                qr_code_id: qr.id,
                movement_type: TRACEABILITY_MOVEMENT_TYPE.RECEPCION_AREA,
                from_area_id: traceableItem.origin_area_id,
                to_area_id: traceableItem.current_area_id,
                quantity: traceableItem.quantity_current,
                unit: traceableItem.unit,
                balance_after: traceableItem.quantity_current,
                reference_folio: traceableItem.reference_folio,
                notes:
                    notes ||
                    `Recepción confirmada en ${currentArea.name}.`,
                metadata: {
                    ...metadata,
                    received_area_id: currentArea.id,
                    received_area_code: currentArea.code,
                    preparation_id: preparation?.id || null,
                    preparation_folio: preparation?.folio || null,
                },
                performed_by: userId,
            },
            { transaction }
        );

        if (preparation) {
            await preparation.update(
                {
                    status: 'RECIBIDA',
                    received_by: userId,
                    received_at: new Date(),
                },
                { transaction }
            );
        }

        const updatedItem = await db.TraceableItem.findByPk(traceableItem.id, {
            include: [
                {
                    model: db.Material,
                    as: 'material',
                    attributes: [
                        'id',
                        'code',
                        'name',
                        'material_type',
                        'default_unit',
                        'is_active',
                    ],
                    required: false,
                },
                {
                    model: db.Area,
                    as: 'origin_area',
                    attributes: ['id', 'code', 'name', 'is_active'],
                    required: false,
                },
                {
                    model: db.Area,
                    as: 'current_area',
                    attributes: ['id', 'code', 'name', 'is_active'],
                    required: false,
                },
            ],
            transaction,
        });

        const result = {
            qr: {
                ...buildQrDto(qr),
                status: QR_STATUS.EN_USO,
            },
            traceable_item: buildTraceableItemDto(updatedItem),
            preparation: preparation
                ? {
                    id: preparation.id,
                    folio: preparation.folio,
                    status: 'RECIBIDA',
                    formula_id: preparation.formula_id,
                    from_area_id: preparation.from_area_id,
                    to_area_id: preparation.to_area_id,
                    total_quantity: preparation.total_quantity,
                    unit: preparation.unit,
                    received_at: new Date(),
                }
                : null,
            movement: {
                id: movement.id,
                movement_type: movement.movement_type,
                quantity: movement.quantity,
                unit: movement.unit,
                balance_after: movement.balance_after,
                reference_folio: movement.reference_folio,
                performed_at: movement.performed_at,
            },
            next_recommended_action: {
                key: 'START_PROCESS',
                label: 'Iniciar proceso de Extrusión',
                description:
                    'La preparación ya fue recibida y está lista para iniciar proceso interno.',
                priority: 'primary',
            },
        };

        await auditService.createAuditLog({
            user,
            action: 'RECEIVE_IN_AREA',
            entityType: 'TraceableItem',
            entityId: traceableItem.id,
            module: 'Traceability',
            description: `Recibió el QR ${qr[qrCodeField]} en ${currentArea.name}.`,
            beforeData: {
                qr_status: QR_STATUS.TRANSFERIDO,
                traceable_item_status: TRACEABLE_ITEM_STATUS.TRANSFERIDO,
                preparation_status: preparation?.status || null,
            },
            afterData: result,
            metadata: {
                qr_code_id: qr.id,
                qr_code: qr[qrCodeField],
                traceable_item_id: traceableItem.id,
                preparation_id: preparation?.id || null,
                area_id: currentArea.id,
            },
            req,
            transaction,
        });

        return result;
    });
};

const calculateIntermediateStockStatus = ({
    quantityPrimary,
    minStockPrimary,
    maxStockPrimary,
}) => {
    const quantity = toNumber(quantityPrimary);
    const min = toNumber(minStockPrimary);
    const max =
        maxStockPrimary === null || maxStockPrimary === undefined
            ? null
            : toNumber(maxStockPrimary);

    if (min > 0 && quantity <= min) {
        return 'BAJO_MINIMO';
    }

    if (max !== null && max > 0 && quantity >= max) {
        return 'SOBRE_MAXIMO';
    }

    return 'OK';
};

const startProcessRun = async ({ payload, user, req }) => {
    const qrCodeId = payload.qr_code_id ? Number(payload.qr_code_id) : null;

    const qrCodeValue = payload.qr_code
        ? String(payload.qr_code).trim()
        : null;

    const quantity = payload.quantity !== undefined
        ? Number(payload.quantity)
        : null;

    const notes = payload.notes ? String(payload.notes).trim() : null;

    const metadata =
        payload.metadata && typeof payload.metadata === 'object'
            ? payload.metadata
            : {};

    if ((!qrCodeId && !qrCodeValue) || (qrCodeId && qrCodeValue)) {
        const error = new Error(
            'Debes enviar qr_code_id o qr_code, pero no ambos.'
        );
        error.statusCode = 400;
        throw error;
    }

    const userId = user?.id || null;
    const qrCodeField = getQrCodeFieldName();

    return db.sequelize.transaction(async (transaction) => {
        const qr = await db.QrCode.findOne({
            where: qrCodeId ? { id: qrCodeId } : { [qrCodeField]: qrCodeValue },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!qr) {
            const error = new Error('QR no encontrado.');
            error.statusCode = 404;
            throw error;
        }

        if (qr.status !== QR_STATUS.EN_USO) {
            const error = new Error(
                `El QR debe estar en uso para iniciar proceso. Estado actual: ${qr.status}.`
            );
            error.statusCode = 400;
            throw error;
        }

        const traceableItem = await db.TraceableItem.findOne({
            where: {
                qr_code_id: qr.id,
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!traceableItem) {
            const error = new Error(
                'El QR no tiene una unidad trazable asociada.'
            );
            error.statusCode = 400;
            throw error;
        }

        if (traceableItem.status !== TRACEABLE_ITEM_STATUS.RECIBIDO) {
            const error = new Error(
                `La unidad trazable debe estar RECIBIDA para iniciar proceso. Estado actual: ${traceableItem.status}.`
            );
            error.statusCode = 400;
            throw error;
        }

        if (
            ![
                TRACEABLE_ITEM_TYPE.PREPARED_MIX,
                TRACEABLE_ITEM_TYPE.PROCESS_INPUT,
            ].includes(traceableItem.item_type)
        ) {
            const error = new Error(
                `El tipo ${traceableItem.item_type} no puede iniciar una corrida de proceso.`
            );
            error.statusCode = 400;
            throw error;
        }

        const processArea = await db.Area.findByPk(traceableItem.current_area_id, {
            attributes: ['id', 'code', 'name', 'is_active'],
            transaction,
        });

        if (!processArea) {
            const error = new Error('El área de proceso no existe.');
            error.statusCode = 404;
            throw error;
        }

        if (processArea.is_active === false) {
            const error = new Error('El área de proceso está inactiva.');
            error.statusCode = 400;
            throw error;
        }

        const access = getBaseAccessContext({
            user,
            assignment: null,
            traceableItem,
        });

        if (!access.allowed_by_area) {
            const error = new Error(
                'No puedes iniciar proceso con material asignado a otra área.'
            );
            error.statusCode = 403;
            throw error;
        }

        const currentQuantity = toNumber(traceableItem.quantity_current);
        const quantityToProcess = quantity || currentQuantity;

        if (!Number.isFinite(quantityToProcess) || quantityToProcess <= 0) {
            const error = new Error('La cantidad a procesar debe ser mayor a cero.');
            error.statusCode = 400;
            throw error;
        }

        if (quantityToProcess > currentQuantity) {
            const error = new Error(
                `Cantidad insuficiente. Disponible: ${currentQuantity} ${traceableItem.unit}.`
            );
            error.statusCode = 400;
            throw error;
        }

        const existingOpenRun = await db.ProcessRun.findOne({
            where: {
                source_traceable_item_id: traceableItem.id,
                status: 'EN_PROCESO',
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (existingOpenRun) {
            const error = new Error(
                `Ya existe una corrida en proceso para este QR: ${existingOpenRun.folio}.`
            );
            error.statusCode = 400;
            throw error;
        }

        const areaPart = processArea.code || `AREA-${processArea.id}`;
        const folio = `RUN-${areaPart}-${Date.now()}`;

        const processRun = await db.ProcessRun.create(
            {
                folio,
                process_area_id: processArea.id,
                station_id: null,
                status: 'EN_PROCESO',
                source_traceable_item_id: traceableItem.id,
                source_qr_code_id: qr.id,
                started_by: userId,
                started_at: new Date(),
                notes,
                metadata: {
                    ...metadata,
                    source_item_type: traceableItem.item_type,
                    source_reference_folio: traceableItem.reference_folio,
                    formula_id: traceableItem.metadata?.formula_id || null,
                    formula_code: traceableItem.metadata?.formula_code || null,
                    formula_name: traceableItem.metadata?.formula_name || null,
                    composition: traceableItem.metadata?.composition || null,
                },
            },
            { transaction }
        );

        await db.ProcessRunInput.create(
            {
                process_run_id: processRun.id,
                traceable_item_id: traceableItem.id,
                qr_code_id: qr.id,
                material_id: traceableItem.material_id || null,
                input_type: 'MAIN_INPUT',
                quantity_planned: quantityToProcess,
                quantity_used: null,
                unit: traceableItem.unit,
                balance_before: currentQuantity,
                balance_after: currentQuantity,
                created_by: userId,
            },
            { transaction }
        );

        await traceableItem.update(
            {
                status: TRACEABLE_ITEM_STATUS.EN_PROCESO,
                updated_by: userId,
                metadata: {
                    ...(traceableItem.metadata || {}),
                    current_process_run_id: processRun.id,
                    current_process_run_folio: processRun.folio,
                    process_started_at: new Date(),
                },
            },
            { transaction }
        );

        const movement = await db.TraceabilityMovement.create(
            {
                traceable_item_id: traceableItem.id,
                qr_code_id: qr.id,
                movement_type: TRACEABILITY_MOVEMENT_TYPE.CONSUMO_PROCESO,
                from_area_id: processArea.id,
                to_area_id: processArea.id,
                quantity: quantityToProcess,
                unit: traceableItem.unit,
                balance_after: currentQuantity,
                reference_folio: processRun.folio,
                notes:
                    notes ||
                    `Inicio de corrida de proceso en ${processArea.name}.`,
                metadata: {
                    process_run_id: processRun.id,
                    process_run_folio: processRun.folio,
                    movement_phase: 'START_PROCESS_RUN',
                },
                performed_by: userId,
            },
            { transaction }
        );

        const updatedItem = await db.TraceableItem.findByPk(traceableItem.id, {
            include: [
                {
                    model: db.Material,
                    as: 'material',
                    attributes: [
                        'id',
                        'code',
                        'name',
                        'material_type',
                        'default_unit',
                        'is_active',
                    ],
                    required: false,
                },
                {
                    model: db.Area,
                    as: 'origin_area',
                    attributes: ['id', 'code', 'name', 'is_active'],
                    required: false,
                },
                {
                    model: db.Area,
                    as: 'current_area',
                    attributes: ['id', 'code', 'name', 'is_active'],
                    required: false,
                },
            ],
            transaction,
        });

        const result = {
            process_run: {
                id: processRun.id,
                folio: processRun.folio,
                status: processRun.status,
                process_area: {
                    id: processArea.id,
                    code: processArea.code,
                    name: processArea.name,
                },
                started_at: processRun.started_at,
            },
            qr: {
                ...buildQrDto(qr),
                status: QR_STATUS.EN_USO,
            },
            traceable_item: buildTraceableItemDto(updatedItem),
            input: {
                traceable_item_id: traceableItem.id,
                qr_code_id: qr.id,
                quantity_planned: quantityToProcess,
                unit: traceableItem.unit,
                balance_before: currentQuantity,
                balance_after: currentQuantity,
            },
            movement: {
                id: movement.id,
                movement_type: movement.movement_type,
                quantity: movement.quantity,
                unit: movement.unit,
                balance_after: movement.balance_after,
                reference_folio: movement.reference_folio,
                performed_at: movement.performed_at,
            },
            next_recommended_action: {
                key: 'REGISTER_PROCESS_OUTPUT',
                label: 'Registrar salida de proceso',
                description:
                    'Registrar producto intermedio generado y merma asociada a la corrida.',
                priority: 'primary',
            },
        };

        await auditService.createAuditLog({
            user,
            action: 'START_PROCESS_RUN',
            entityType: 'ProcessRun',
            entityId: processRun.id,
            module: 'Traceability',
            description: `Inició la corrida ${processRun.folio} en ${processArea.name}.`,
            beforeData: {
                traceable_item_status: TRACEABLE_ITEM_STATUS.RECIBIDO,
            },
            afterData: result,
            metadata: {
                process_run_id: processRun.id,
                process_run_folio: processRun.folio,
                qr_code_id: qr.id,
                qr_code: qr[qrCodeField],
                traceable_item_id: traceableItem.id,
            },
            req,
            transaction,
        });

        return result;
    });
};

const registerProcessOutputToRack = async ({ payload, user, req }) => {
    const processRunId = payload.process_run_id
        ? Number(payload.process_run_id)
        : null;

    const intermediateMaterialId = payload.intermediate_material_id
        ? Number(payload.intermediate_material_id)
        : null;

    const rackId = payload.rack_id ? Number(payload.rack_id) : null;

    const quantityPrimary = Number(payload.quantity_primary);
    const quantitySecondary =
        payload.quantity_secondary === undefined ||
            payload.quantity_secondary === null ||
            payload.quantity_secondary === ''
            ? null
            : Number(payload.quantity_secondary);

    const notes = payload.notes ? String(payload.notes).trim() : null;

    const metadata =
        payload.metadata && typeof payload.metadata === 'object'
            ? payload.metadata
            : {};

    if (!processRunId || !intermediateMaterialId || !rackId) {
        const error = new Error(
            'process_run_id, intermediate_material_id y rack_id son obligatorios.'
        );
        error.statusCode = 400;
        throw error;
    }

    if (!Number.isFinite(quantityPrimary) || quantityPrimary <= 0) {
        const error = new Error('quantity_primary debe ser mayor a cero.');
        error.statusCode = 400;
        throw error;
    }

    if (
        quantitySecondary !== null &&
        (!Number.isFinite(quantitySecondary) || quantitySecondary < 0)
    ) {
        const error = new Error(
            'quantity_secondary debe ser mayor o igual a cero.'
        );
        error.statusCode = 400;
        throw error;
    }

    const userId = user?.id || null;

    return db.sequelize.transaction(async (transaction) => {
        const processRun = await db.ProcessRun.findByPk(processRunId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!processRun) {
            const error = new Error('La corrida de proceso no existe.');
            error.statusCode = 404;
            throw error;
        }

        if (processRun.status !== 'EN_PROCESO') {
            const error = new Error(
                `La corrida no está en proceso. Estado actual: ${processRun.status}.`
            );
            error.statusCode = 400;
            throw error;
        }

        const sourceTraceableItem = await db.TraceableItem.findByPk(
            processRun.source_traceable_item_id,
            {
                transaction,
                lock: transaction.LOCK.UPDATE,
            }
        );

        if (!sourceTraceableItem) {
            const error = new Error(
                'La corrida no tiene una unidad trazable origen válida.'
            );
            error.statusCode = 400;
            throw error;
        }

        if (sourceTraceableItem.status !== TRACEABLE_ITEM_STATUS.EN_PROCESO) {
            const error = new Error(
                `La unidad origen debe estar EN_PROCESO. Estado actual: ${sourceTraceableItem.status}.`
            );
            error.statusCode = 400;
            throw error;
        }

        const access = getBaseAccessContext({
            user,
            assignment: null,
            traceableItem: sourceTraceableItem,
        });

        if (!access.allowed_by_area) {
            const error = new Error(
                'No puedes registrar salida de una corrida asignada a otra área.'
            );
            error.statusCode = 403;
            throw error;
        }

        const intermediateMaterial = await db.IntermediateMaterial.findByPk(
            intermediateMaterialId,
            {
                transaction,
            }
        );

        if (!intermediateMaterial) {
            const error = new Error('El MI/PTI no existe.');
            error.statusCode = 404;
            throw error;
        }

        if (intermediateMaterial.is_active === false) {
            const error = new Error('El MI/PTI está inactivo.');
            error.statusCode = 400;
            throw error;
        }

        if (intermediateMaterial.production_area_id !== processRun.process_area_id) {
            const error = new Error(
                'El MI/PTI no pertenece al área productiva de esta corrida.'
            );
            error.statusCode = 400;
            throw error;
        }

        const rack = await db.StorageRack.findByPk(rackId, {
            transaction,
        });

        if (!rack) {
            const error = new Error('El rack no existe.');
            error.statusCode = 404;
            throw error;
        }

        if (rack.is_active === false) {
            const error = new Error('El rack está inactivo.');
            error.statusCode = 400;
            throw error;
        }

        if (rack.area_id !== processRun.process_area_id) {
            const error = new Error(
                'El rack no pertenece al área de la corrida.'
            );
            error.statusCode = 400;
            throw error;
        }

        let stock = await db.IntermediateStock.findOne({
            where: {
                intermediate_material_id: intermediateMaterial.id,
                rack_id: rack.id,
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!stock) {
            stock = await db.IntermediateStock.create(
                {
                    intermediate_material_id: intermediateMaterial.id,
                    area_id: rack.area_id,
                    rack_id: rack.id,
                    quantity_primary: 0,
                    primary_unit: intermediateMaterial.primary_unit || 'CARRETE',
                    quantity_secondary: 0,
                    secondary_unit: intermediateMaterial.secondary_unit || 'KG',
                    min_stock_primary: intermediateMaterial.min_stock_primary || 0,
                    max_stock_primary: intermediateMaterial.max_stock_primary || null,
                    status: 'BAJO_MINIMO',
                    last_movement_at: null,
                    metadata: {
                        creado_automaticamente: true,
                        motivo: 'Registro de salida parcial de proceso.',
                    },
                },
                { transaction }
            );
        }

        const balanceBeforePrimary = toNumber(stock.quantity_primary);
        const balanceBeforeSecondary = toNumber(stock.quantity_secondary);

        const balanceAfterPrimary = balanceBeforePrimary + quantityPrimary;
        const balanceAfterSecondary =
            quantitySecondary === null
                ? balanceBeforeSecondary
                : balanceBeforeSecondary + quantitySecondary;

        const nextStatus = calculateIntermediateStockStatus({
            quantityPrimary: balanceAfterPrimary,
            minStockPrimary: stock.min_stock_primary,
            maxStockPrimary: stock.max_stock_primary,
        });

        const areaPart = intermediateMaterial.production_area_id
            ? `AREA-${intermediateMaterial.production_area_id}`
            : 'AREA';

        const outputFolio = `OUT-${areaPart}-${Date.now()}`;

        const output = await db.ProcessRunOutput.create(
            {
                folio: outputFolio,
                process_run_id: processRun.id,
                source_traceable_item_id: sourceTraceableItem.id,
                source_qr_code_id: processRun.source_qr_code_id,
                intermediate_material_id: intermediateMaterial.id,
                rack_id: rack.id,
                intermediate_stock_id: stock.id,
                output_type: 'GOOD_OUTPUT',
                quantity_primary: quantityPrimary,
                primary_unit: intermediateMaterial.primary_unit || 'CARRETE',
                quantity_secondary: quantitySecondary,
                secondary_unit: intermediateMaterial.secondary_unit || 'KG',
                status: 'REGISTRADO',
                produced_at: new Date(),
                notes,
                metadata: {
                    ...metadata,
                    process_run_folio: processRun.folio,
                    source_traceable_item_id: sourceTraceableItem.id,
                    source_qr_code_id: processRun.source_qr_code_id,
                    rack_code: rack.code,
                    intermediate_material_code: intermediateMaterial.code,
                },
                created_by: userId,
            },
            { transaction }
        );

        await stock.update(
            {
                quantity_primary: balanceAfterPrimary,
                quantity_secondary: balanceAfterSecondary,
                status: nextStatus,
                last_movement_at: new Date(),
            },
            { transaction }
        );

        const stockMovement = await db.IntermediateStockMovement.create(
            {
                intermediate_stock_id: stock.id,
                intermediate_material_id: intermediateMaterial.id,
                area_id: rack.area_id,
                rack_id: rack.id,
                movement_type: 'ENTRADA_PRODUCCION',
                quantity_primary: quantityPrimary,
                primary_unit: intermediateMaterial.primary_unit || 'CARRETE',
                quantity_secondary: quantitySecondary,
                secondary_unit: intermediateMaterial.secondary_unit || 'KG',
                balance_before_primary: balanceBeforePrimary,
                balance_after_primary: balanceAfterPrimary,
                balance_before_secondary: balanceBeforeSecondary,
                balance_after_secondary: balanceAfterSecondary,
                reference_type: 'PROCESS_RUN_OUTPUT',
                reference_id: output.id,
                reference_folio: output.folio,
                notes:
                    notes ||
                    `Entrada de producción al rack ${rack.code}.`,
                metadata: {
                    process_run_id: processRun.id,
                    process_run_folio: processRun.folio,
                    output_folio: output.folio,
                },
                created_by: userId,
            },
            { transaction }
        );

        const traceabilityMovement = await db.TraceabilityMovement.create(
            {
                traceable_item_id: sourceTraceableItem.id,
                qr_code_id: processRun.source_qr_code_id,
                movement_type: TRACEABILITY_MOVEMENT_TYPE.GENERACION_INTERMEDIA,
                from_area_id: processRun.process_area_id,
                to_area_id: processRun.process_area_id,
                quantity:
                    quantitySecondary === null
                        ? quantityPrimary
                        : quantitySecondary,
                unit:
                    quantitySecondary === null
                        ? intermediateMaterial.primary_unit || 'CARRETE'
                        : intermediateMaterial.secondary_unit || 'KG',
                balance_after: sourceTraceableItem.quantity_current,
                reference_folio: output.folio,
                notes:
                    notes ||
                    `Salida parcial de ${intermediateMaterial.name} hacia ${rack.code}.`,
                metadata: {
                    process_run_id: processRun.id,
                    process_run_folio: processRun.folio,
                    process_output_id: output.id,
                    process_output_folio: output.folio,
                    intermediate_material_id: intermediateMaterial.id,
                    intermediate_material_code: intermediateMaterial.code,
                    rack_id: rack.id,
                    rack_code: rack.code,
                    quantity_primary: quantityPrimary,
                    primary_unit: intermediateMaterial.primary_unit || 'CARRETE',
                    quantity_secondary: quantitySecondary,
                    secondary_unit: intermediateMaterial.secondary_unit || 'KG',
                    stock_balance_after_primary: balanceAfterPrimary,
                    stock_balance_after_secondary: balanceAfterSecondary,
                    stock_status: nextStatus,
                },
                performed_by: userId,
            },
            { transaction }
        );

        const updatedStock = await db.IntermediateStock.findByPk(stock.id, {
            include: [
                {
                    model: db.IntermediateMaterial,
                    as: 'intermediate_material',
                    required: false,
                },
                {
                    model: db.Area,
                    as: 'area',
                    attributes: ['id', 'code', 'name', 'is_active'],
                    required: false,
                },
                {
                    model: db.StorageRack,
                    as: 'rack',
                    required: false,
                },
            ],
            transaction,
        });

        const result = {
            process_run: {
                id: processRun.id,
                folio: processRun.folio,
                status: processRun.status,
            },
            output: {
                id: output.id,
                folio: output.folio,
                output_type: output.output_type,
                status: output.status,
                quantity_primary: output.quantity_primary,
                primary_unit: output.primary_unit,
                quantity_secondary: output.quantity_secondary,
                secondary_unit: output.secondary_unit,
                produced_at: output.produced_at,
            },
            intermediate_material: {
                id: intermediateMaterial.id,
                code: intermediateMaterial.code,
                name: intermediateMaterial.name,
                presentation: intermediateMaterial.presentation,
                primary_unit: intermediateMaterial.primary_unit,
                secondary_unit: intermediateMaterial.secondary_unit,
            },
            rack: {
                id: rack.id,
                code: rack.code,
                name: rack.name,
                area_id: rack.area_id,
            },
            stock: {
                id: updatedStock.id,
                quantity_primary: updatedStock.quantity_primary,
                primary_unit: updatedStock.primary_unit,
                quantity_secondary: updatedStock.quantity_secondary,
                secondary_unit: updatedStock.secondary_unit,
                min_stock_primary: updatedStock.min_stock_primary,
                max_stock_primary: updatedStock.max_stock_primary,
                status: updatedStock.status,
                last_movement_at: updatedStock.last_movement_at,
            },
            stock_movement: {
                id: stockMovement.id,
                movement_type: stockMovement.movement_type,
                balance_before_primary: stockMovement.balance_before_primary,
                balance_after_primary: stockMovement.balance_after_primary,
                balance_before_secondary: stockMovement.balance_before_secondary,
                balance_after_secondary: stockMovement.balance_after_secondary,
            },
            traceability_movement: {
                id: traceabilityMovement.id,
                movement_type: traceabilityMovement.movement_type,
                reference_folio: traceabilityMovement.reference_folio,
            },
            next_recommended_action: {
                key: 'REGISTER_MORE_OUTPUT_OR_SCRAP',
                label: 'Registrar otra salida o merma',
                description:
                    'La corrida sigue activa; puedes registrar más carretes o merma sin cerrar producción.',
                priority: 'primary',
            },
        };

        await auditService.createAuditLog({
            user,
            action: 'REGISTER_PROCESS_OUTPUT_TO_RACK',
            entityType: 'ProcessRunOutput',
            entityId: output.id,
            module: 'Traceability',
            description: `Registró salida parcial ${output.folio} hacia ${rack.code}.`,
            beforeData: {
                stock_quantity_primary: balanceBeforePrimary,
                stock_quantity_secondary: balanceBeforeSecondary,
            },
            afterData: result,
            metadata: {
                process_run_id: processRun.id,
                process_run_folio: processRun.folio,
                output_id: output.id,
                output_folio: output.folio,
                stock_id: stock.id,
                rack_id: rack.id,
                intermediate_material_id: intermediateMaterial.id,
            },
            req,
            transaction,
        });

        return result;
    });
};

module.exports = {
    scanQrCode,
    assignQrCodesToArea,
    registerRawMaterialEntry,
    warehouseTransfer,
    prepareProcessFormula,
    receiveInArea,
    startProcessRun,
    registerProcessOutputToRack,
};