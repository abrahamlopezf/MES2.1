const { Op } = require('sequelize');

const db = require('../../database/models');

const toNumber = (value) => Number.parseFloat(value || 0);

const calculateStockStatus = ({ quantityPrimary, minStockPrimary, maxStockPrimary }) => {
    const quantity = toNumber(quantityPrimary);
    const min = toNumber(minStockPrimary);
    const max = maxStockPrimary === null || maxStockPrimary === undefined
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

const buildIntermediateMaterialDto = (item) => {
    if (!item) return null;

    return {
        id: item.id,
        code: item.code,
        name: item.name,
        description: item.description,
        production_area_id: item.production_area_id,
        production_area: item.production_area || null,
        base_material_id: item.base_material_id,
        base_material: item.base_material || null,
        material_family: item.material_family,
        color: item.color,
        color_code: item.color_code,
        caliber_value: item.caliber_value,
        caliber_unit: item.caliber_unit,
        thread_type: item.thread_type,
        presentation: item.presentation,
        primary_unit: item.primary_unit,
        secondary_unit: item.secondary_unit,
        min_stock_primary: item.min_stock_primary,
        max_stock_primary: item.max_stock_primary,
        min_stock_secondary: item.min_stock_secondary,
        max_stock_secondary: item.max_stock_secondary,
        is_active: item.is_active,
        metadata: item.metadata,
        created_at: item.created_at,
        updated_at: item.updated_at,
    };
};

const buildRackDto = (rack) => {
    if (!rack) return null;

    return {
        id: rack.id,
        code: rack.code,
        name: rack.name,
        area_id: rack.area_id,
        area: rack.area || null,
        rack_type: rack.rack_type,
        qr_code_id: rack.qr_code_id,
        qr_code: rack.qr_code
            ? {
                id: rack.qr_code.id,
                code: rack.qr_code.qr_code,
                status: rack.qr_code.status,
            }
            : null,
        location_description: rack.location_description,
        capacity_primary: rack.capacity_primary,
        primary_unit: rack.primary_unit,
        is_active: rack.is_active,
        metadata: rack.metadata,
        created_at: rack.created_at,
        updated_at: rack.updated_at,
    };
};

const buildStockDto = (stock) => {
    if (!stock) return null;

    return {
        id: stock.id,
        intermediate_material_id: stock.intermediate_material_id,
        intermediate_material: stock.intermediate_material || null,
        area_id: stock.area_id,
        area: stock.area || null,
        rack_id: stock.rack_id,
        rack: stock.rack || null,
        quantity_primary: stock.quantity_primary,
        primary_unit: stock.primary_unit,
        quantity_secondary: stock.quantity_secondary,
        secondary_unit: stock.secondary_unit,
        min_stock_primary: stock.min_stock_primary,
        max_stock_primary: stock.max_stock_primary,
        status: stock.status,
        last_movement_at: stock.last_movement_at,
        metadata: stock.metadata,
        created_at: stock.created_at,
        updated_at: stock.updated_at,
    };
};

const listIntermediateMaterials = async ({ query = {} }) => {
    const where = {};

    if (query.search) {
        where[Op.or] = [
            { code: { [Op.iLike]: `%${query.search}%` } },
            { name: { [Op.iLike]: `%${query.search}%` } },
            { color: { [Op.iLike]: `%${query.search}%` } },
        ];
    }

    if (query.production_area_id) {
        where.production_area_id = Number(query.production_area_id);
    }

    if (query.is_active !== undefined) {
        where.is_active = String(query.is_active) === 'true';
    }

    const items = await db.IntermediateMaterial.findAll({
        where,
        include: [
            {
                model: db.Area,
                as: 'production_area',
                attributes: ['id', 'code', 'name', 'is_active'],
                required: false,
            },
            {
                model: db.Material,
                as: 'base_material',
                attributes: ['id', 'code', 'name', 'material_type', 'default_unit', 'is_active'],
                required: false,
            },
        ],
        order: [['code', 'ASC']],
    });

    return items.map(buildIntermediateMaterialDto);
};

const createIntermediateMaterial = async ({ payload, user }) => {
    const userId = user?.id || null;

    if (!payload.code || !payload.name || !payload.production_area_id) {
        const error = new Error('code, name y production_area_id son obligatorios.');
        error.statusCode = 400;
        throw error;
    }

    const area = await db.Area.findByPk(Number(payload.production_area_id));

    if (!area) {
        const error = new Error('El área de producción no existe.');
        error.statusCode = 404;
        throw error;
    }

    if (area.is_active === false) {
        const error = new Error('El área de producción está inactiva.');
        error.statusCode = 400;
        throw error;
    }

    const exists = await db.IntermediateMaterial.findOne({
        where: { code: String(payload.code).trim().toUpperCase() },
    });

    if (exists) {
        const error = new Error('Ya existe un MI/PTI con ese código.');
        error.statusCode = 409;
        throw error;
    }

    const item = await db.IntermediateMaterial.create({
        code: String(payload.code).trim().toUpperCase(),
        name: String(payload.name).trim(),
        description: payload.description || null,
        production_area_id: Number(payload.production_area_id),
        base_material_id: payload.base_material_id ? Number(payload.base_material_id) : null,
        material_family: payload.material_family || 'HILO',
        color: payload.color || null,
        color_code: payload.color_code || null,
        caliber_value: payload.caliber_value ?? null,
        caliber_unit: payload.caliber_unit || null,
        thread_type: payload.thread_type || null,
        presentation: payload.presentation || 'CARRETE',
        primary_unit: payload.primary_unit || 'CARRETE',
        secondary_unit: payload.secondary_unit || 'KG',
        min_stock_primary: payload.min_stock_primary ?? 0,
        max_stock_primary: payload.max_stock_primary ?? null,
        min_stock_secondary: payload.min_stock_secondary ?? null,
        max_stock_secondary: payload.max_stock_secondary ?? null,
        is_active: payload.is_active === undefined ? true : Boolean(payload.is_active),
        metadata: payload.metadata || null,
        created_by: userId,
        updated_by: userId,
    });

    const created = await db.IntermediateMaterial.findByPk(item.id, {
        include: [
            {
                model: db.Area,
                as: 'production_area',
                attributes: ['id', 'code', 'name', 'is_active'],
                required: false,
            },
            {
                model: db.Material,
                as: 'base_material',
                attributes: ['id', 'code', 'name', 'material_type', 'default_unit', 'is_active'],
                required: false,
            },
        ],
    });

    return buildIntermediateMaterialDto(created);
};

const listRacks = async ({ query = {} }) => {
    const where = {};

    if (query.search) {
        where[Op.or] = [
            { code: { [Op.iLike]: `%${query.search}%` } },
            { name: { [Op.iLike]: `%${query.search}%` } },
        ];
    }

    if (query.area_id) {
        where.area_id = Number(query.area_id);
    }

    if (query.is_active !== undefined) {
        where.is_active = String(query.is_active) === 'true';
    }

    const racks = await db.StorageRack.findAll({
        where,
        include: [
            {
                model: db.Area,
                as: 'area',
                attributes: ['id', 'code', 'name', 'is_active'],
                required: false,
            },
            {
                model: db.QrCode,
                as: 'qr_code',
                attributes: ['id', 'qr_code', 'status'],
                required: false,
            },
        ],
        order: [['code', 'ASC']],
    });

    return racks.map(buildRackDto);
};

const createRack = async ({ payload, user }) => {
    const userId = user?.id || null;

    if (!payload.code || !payload.name || !payload.area_id) {
        const error = new Error('code, name y area_id son obligatorios.');
        error.statusCode = 400;
        throw error;
    }

    const area = await db.Area.findByPk(Number(payload.area_id));

    if (!area) {
        const error = new Error('El área del rack no existe.');
        error.statusCode = 404;
        throw error;
    }

    if (area.is_active === false) {
        const error = new Error('El área del rack está inactiva.');
        error.statusCode = 400;
        throw error;
    }

    const exists = await db.StorageRack.findOne({
        where: { code: String(payload.code).trim().toUpperCase() },
    });

    if (exists) {
        const error = new Error('Ya existe un rack con ese código.');
        error.statusCode = 409;
        throw error;
    }

    const rack = await db.StorageRack.create({
        code: String(payload.code).trim().toUpperCase(),
        name: String(payload.name).trim(),
        area_id: Number(payload.area_id),
        rack_type: payload.rack_type || 'MI_BUFFER',
        qr_code_id: payload.qr_code_id ? Number(payload.qr_code_id) : null,
        location_description: payload.location_description || null,
        capacity_primary: payload.capacity_primary ?? null,
        primary_unit: payload.primary_unit || 'CARRETE',
        is_active: payload.is_active === undefined ? true : Boolean(payload.is_active),
        metadata: payload.metadata || null,
        created_by: userId,
        updated_by: userId,
    });

    const created = await db.StorageRack.findByPk(rack.id, {
        include: [
            {
                model: db.Area,
                as: 'area',
                attributes: ['id', 'code', 'name', 'is_active'],
                required: false,
            },
            {
                model: db.QrCode,
                as: 'qr_code',
                attributes: ['id', 'qr_code', 'status'],
                required: false,
            },
        ],
    });

    return buildRackDto(created);
};

const listStocks = async ({ query = {} }) => {
    const where = {};

    if (query.intermediate_material_id) {
        where.intermediate_material_id = Number(query.intermediate_material_id);
    }

    if (query.area_id) {
        where.area_id = Number(query.area_id);
    }

    if (query.rack_id) {
        where.rack_id = Number(query.rack_id);
    }

    if (query.status) {
        where.status = String(query.status).trim().toUpperCase();
    }

    const stocks = await db.IntermediateStock.findAll({
        where,
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
        order: [
            ['status', 'ASC'],
            ['updated_at', 'DESC'],
        ],
    });

    return stocks.map(buildStockDto);
};

const ensureStock = async ({ payload }) => {
    if (!payload.intermediate_material_id || !payload.rack_id) {
        const error = new Error('intermediate_material_id y rack_id son obligatorios.');
        error.statusCode = 400;
        throw error;
    }

    const intermediateMaterial = await db.IntermediateMaterial.findByPk(
        Number(payload.intermediate_material_id)
    );

    if (!intermediateMaterial) {
        const error = new Error('El MI/PTI no existe.');
        error.statusCode = 404;
        throw error;
    }

    const rack = await db.StorageRack.findByPk(Number(payload.rack_id));

    if (!rack) {
        const error = new Error('El rack no existe.');
        error.statusCode = 404;
        throw error;
    }

    if (rack.area_id !== intermediateMaterial.production_area_id) {
        const error = new Error(
            'El rack no pertenece al área productiva configurada para este MI/PTI.'
        );
        error.statusCode = 400;
        throw error;
    }

    const minStockPrimary =
        payload.min_stock_primary ?? intermediateMaterial.min_stock_primary ?? 0;

    const maxStockPrimary =
        payload.max_stock_primary ?? intermediateMaterial.max_stock_primary ?? null;

    const [stock] = await db.IntermediateStock.findOrCreate({
        where: {
            intermediate_material_id: intermediateMaterial.id,
            rack_id: rack.id,
        },
        defaults: {
            intermediate_material_id: intermediateMaterial.id,
            area_id: rack.area_id,
            rack_id: rack.id,
            quantity_primary: payload.quantity_primary ?? 0,
            primary_unit: intermediateMaterial.primary_unit || 'CARRETE',
            quantity_secondary: payload.quantity_secondary ?? 0,
            secondary_unit: intermediateMaterial.secondary_unit || 'KG',
            min_stock_primary: minStockPrimary,
            max_stock_primary: maxStockPrimary,
            status: calculateStockStatus({
                quantityPrimary: payload.quantity_primary ?? 0,
                minStockPrimary,
                maxStockPrimary,
            }),
            last_movement_at: null,
            metadata: payload.metadata || null,
        },
    });

    const loaded = await db.IntermediateStock.findByPk(stock.id, {
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
    });

    return buildStockDto(loaded);
};

module.exports = {
    listIntermediateMaterials,
    createIntermediateMaterial,
    listRacks,
    createRack,
    listStocks,
    ensureStock,
    calculateStockStatus,
};