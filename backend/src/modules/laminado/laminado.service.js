const { Op } = require('sequelize');
const {
  sequelize,
  LaminadoSpecification,
  LaminadoSpecificationMaterial,
  ProductionBom,
  Material,
  ViajeroRoll,
  ViajeroRoutingLog,
  WipInventory,
  Lote,
  QrCode,
  Role,
  Notification,
  Loom,
  User,
  AreaProcessScrapLog,
  TelaresScrapObservation,
  TraceableItem,
  TraceabilityLink,
  TraceabilityMovement,
  CorteLaminadoOrderItem,
  CorteLaminadoOrder,
  Area,
} = require('../../database/models');
const { canViewCosts } = require('../../shared/security/accessRules');
const normalizeViajeroQr = require('../../shared/utils/normalizeViajeroQr');
const consumptionOrderService = require('../warehouse/consumptionOrder.service');
const rollTransformation = require('../wip/rollTransformation');
const specificationCatalog = require('../wip/specificationCatalog');
const telaresScrapObservationService = require('../wip/telaresScrapObservation.service');
const { normalizeProductionRoute, normalizeStageName } = require('../telares/productionRules');

const ensureWarehouseRecipe = (spec) => {
  if (!Array.isArray(spec?.materials) || spec.materials.length === 0) {
    throw Object.assign(new Error(`La ficha ${spec?.code || ''} no tiene materiales de Almacén configurados. Un administrador debe completar su receta antes de operar.`), {
      statusCode: 409,
      code: 'LAMINADO_MATERIALS_REQUIRED',
    });
  }
};

const directTelaresOnly = (payload = {}) => ({
  ...payload,
  target_width_cm: null,
  loom_roll_requirements: {
    ...Object.fromEntries(Object.entries(payload.loom_roll_requirements || {}).filter(([key]) => !['min_width_cm', 'max_width_cm', 'fabric_type'].includes(key))),
    accepts_from_globo: false,
    accepted_input_stages: ['TELARES'],
  },
});

async function validateCompatibleTelaresBoms(requirements = {}) {
  const ids = [...new Set((requirements.allowed_bom_ids || []).map(Number))];
  if (!ids.length) throw Object.assign(new Error('Agrega al menos un rollo compatible del catálogo de Telares.'), { statusCode: 400, code: 'LAMINADO_ROLLS_REQUIRED' });
  const boms = await ProductionBom.findAll({ where: { id: { [Op.in]: ids }, is_active: true } });
  if (boms.length !== ids.length) throw Object.assign(new Error('Uno o más PTI seleccionados de Telares no existen o están inactivos.'), { statusCode: 400, code: 'LAMINADO_INVALID_TELARES_ROLL' });
  for (const bom of boms) {
    if (String(bom.product_kind || '').toUpperCase() !== 'ROLLO_TELA') throw Object.assign(new Error(`${bom.code} no es un rollo de tela. Solo se admiten rollos (no banda ni cinta) en Laminado.`), { statusCode: 400, code: 'LAMINADO_ROLL_KIND_INVALID' });
    if (!(Number(bom.target_width_cm) > 0)) throw Object.assign(new Error(`${bom.code} no tiene ancho registrado en su ficha de Telares; no puede vincularse a Laminado hasta completarlo.`), { statusCode: 400, code: 'LAMINADO_ROLL_WIDTH_REQUIRED' });
    const routes = Array.isArray(bom.allowed_routes) && bom.allowed_routes.length ? bom.allowed_routes : [bom.default_route];
    const routesToLaminado = routes.some((route) => {
      try { const normalized = normalizeProductionRoute(route, bom.product_kind); return normalized[0] === 'TELARES' && normalized[1] === 'LAMINADO'; }
      catch (_error) { return false; }
    });
    if (!routesToLaminado) throw Object.assign(new Error(`${bom.code} no tiene una ruta autorizada directamente de Telares a Laminado.`), { statusCode: 400, code: 'LAMINADO_ROLL_ROUTE_MISMATCH' });
  }
}

function getLaminadoRouteState(roll) {
  try {
    const route = normalizeProductionRoute(roll.route, roll.bom?.product_kind || 'ROLLO_TELA');
    const stageIndex = route.indexOf('LAMINADO');
    if (stageIndex < 1) return null;
    return {
      route,
      previousStage: route[stageIndex - 1],
      isNext: normalizeStageName(roll.next_allowed_stage) === 'LAMINADO',
      isAtPreviousStage: normalizeStageName(roll.current_stage) === route[stageIndex - 1],
    };
  } catch (_error) {
    return null;
  }
}

class LaminadoService {
  /**
   * Catálogo de Especificaciones / Fórmulas de Recubrimiento de Laminado
   */
  async getSpecifications(currentUser = null) {
    const allowCosts = canViewCosts(currentUser);

    const specs = await LaminadoSpecification.findAll({
      where: { is_catalog_master: true },
      order: [['code', 'ASC']],
      include: [
        {
          model: LaminadoSpecificationMaterial,
          as: 'materials',
          include: [
            {
              model: Material,
              as: 'material',
              attributes: ['id', 'internal_code', 'name', 'status', 'family_id', 'base_unit_id'],
            },
          ],
        },
      ],
    });

    const allBoms = await ProductionBom.findAll({
      attributes: ['id', 'code', 'name', 'target_width_cm', 'target_weight_g_per_m', 'output_product_name'],
      where: { is_active: true },
    });
    const bomsMap = new Map(allBoms.map((b) => [b.id, b.toJSON()]));

    return specs.map((s) => {
      const data = s.toJSON();
      const allowedBomIds = data.loom_roll_requirements?.allowed_bom_ids || [];
      data.allowed_boms = allowedBomIds.map((id) => bomsMap.get(Number(id))).filter(Boolean);

      if (!allowCosts) {
        data.cost_transformation_index = 1.0;
        data.estimated_cost_mxn = null;
      }
      return data;
    });
  }

  async getSpecificationById(id, currentUser = null) {
    const spec = await LaminadoSpecification.findByPk(id, {
      include: [
        {
          model: LaminadoSpecificationMaterial,
          as: 'materials',
          include: [
            {
              model: Material,
              as: 'material',
              attributes: ['id', 'internal_code', 'name', 'status', 'family_id', 'base_unit_id'],
            },
          ],
        },
      ],
    });

    if (!spec) {
      const err = new Error(`Especificación de Laminado #${id} no encontrada.`);
      err.statusCode = 404;
      throw err;
    }

    const data = spec.toJSON();
    const allowCosts = canViewCosts(currentUser);
    if (!allowCosts) {
      data.cost_transformation_index = 1.0;
    }

    const allowedBomIds = data.loom_roll_requirements?.allowed_bom_ids || [];
    if (allowedBomIds.length > 0) {
      data.allowed_boms = await ProductionBom.findAll({
        where: { id: { [Op.in]: allowedBomIds } },
        attributes: ['id', 'code', 'name', 'target_width_cm', 'target_weight_g_per_m'],
      });
    } else {
      data.allowed_boms = [];
    }

    return data;
  }

  async createSpecification(payload, currentUser = null) {
    const normalizedPayload = directTelaresOnly(payload);
    await validateCompatibleTelaresBoms(normalizedPayload.loom_roll_requirements);
    const created = await specificationCatalog.create({ Model: LaminadoSpecification, MaterialModel: LaminadoSpecificationMaterial, foreignKey: 'laminado_spec_id', area: 'LAMINADO', payload: normalizedPayload, user: currentUser, canViewCosts });
    return this.getSpecificationById(created.id, currentUser);
  }

  async updateSpecification(id, payload, currentUser = null) {
    const normalizedPayload = payload.loom_roll_requirements === undefined ? payload : directTelaresOnly(payload);
    if (normalizedPayload.loom_roll_requirements) await validateCompatibleTelaresBoms(normalizedPayload.loom_roll_requirements);
    await specificationCatalog.update({ Model: LaminadoSpecification, MaterialModel: LaminadoSpecificationMaterial, foreignKey: 'laminado_spec_id', id, area: 'LAMINADO', payload: normalizedPayload, user: currentUser, canViewCosts });
    return this.getSpecificationById(id, currentUser);
  }

  async toggleSpecification(id) {
    return specificationCatalog.activate({ Model: LaminadoSpecification, MaterialModel: LaminadoSpecificationMaterial, id, area: 'LAMINADO' });
  }
  /**
   * WIP Interno de Laminado: Rollos en custodia/espera + Resinas e Insumos en Piso + Métricas
   */
  async getWipSummary(currentUser = null, { transaction } = {}) {
    const allowCosts = canViewCosts(currentUser);

    // 1. Rollos pendientes de Laminado. La etapa actual por sí sola no basta:
    // los rollos transformados conservan current_stage='LAMINADO', pero ya
    // avanzaron next_allowed_stage (por ejemplo, a CORTE).
    const rolls = await ViajeroRoll.findAll({
      where: {
        next_allowed_stage: 'LAMINADO',
        status: 'DISPONIBLE',
        is_active: true,
      },
      include: [
        { model: Loom, as: 'loom', attributes: ['id', 'code', 'name', 'type'] },
        { model: ProductionBom, as: 'bom', attributes: ['id', 'code', 'name', 'product_kind', 'target_width_cm', 'target_weight_g_per_m', 'fabric_type'] },
        { model: User, as: 'operator', attributes: ['id', 'first_name', 'last_name', 'username'] },
      ],
      order: [['created_at', 'DESC']],
      transaction,
    });

    const pickedOrderItems = await CorteLaminadoOrderItem.findAll({
      where: { status: 'PICKED' }, attributes: ['roll_id'], transaction,
    });
    const pickedRollIds = new Set(pickedOrderItems.map((item) => Number(item.roll_id)));
    const requestedOrderItems = await CorteLaminadoOrderItem.findAll({ where: { status: 'REQUESTED' }, attributes: ['roll_id'], transaction });
    const requestedRollIds = new Set(requestedOrderItems.map((item) => Number(item.roll_id)));
    // A pickup is the custody handoff: these source rolls now belong to Laminado WIP,
    // even though current_stage remains Telares until the transformation is committed.
    const rollsInFloor = rolls.filter((r) => r.current_stage === 'LAMINADO' || pickedRollIds.has(Number(r.id)));
    const rollsIncoming = rolls.filter((r) => r.current_stage !== 'LAMINADO' && requestedRollIds.has(Number(r.id)));

    // 2. Materiales de Almacén en Custodia de Laminado (area_id = 4)
    const warehouseWip = await WipInventory.findAll({
      where: { area_id: 4, amount: { [Op.gt]: 0 } },
      include: [
        {
          model: Material,
          as: 'material',
          attributes: ['id', 'internal_code', 'name', 'status', 'family_id', 'base_unit_id'],
        },
        {
          model: Lote,
          as: 'lote',
          attributes: ['id', 'folio', 'unit_cost', 'total_cost'],
        },
        {
          model: QrCode,
          as: 'qr_code',
          attributes: ['id', 'qr_code'],
        },
      ],
      order: [['created_at', 'ASC']],
      transaction,
    });

    // 3. Rollos procesados recientemente en Laminado
    const recentTransformed = await ViajeroRoutingLog.findAll({
      where: {
        to_stage: 'LAMINADO',
        action: { [Op.in]: ['PROCESO_FINALIZADO', 'TRANSFORMACION_AREA'] },
      },
      include: [
        {
          model: ViajeroRoll,
          as: 'roll',
          include: [
            { model: ProductionBom, as: 'bom', attributes: ['id', 'code', 'name'] },
            { model: Loom, as: 'loom', attributes: ['id', 'code', 'name'] },
          ],
        },
        { model: User, as: 'operator', attributes: ['id', 'first_name', 'last_name'] },
      ],
      order: [['created_at', 'DESC']],
      limit: 15,
      transaction,
    });

    // 4. Catálogo de Especificaciones para compatibilidad rápida
    const specifications = await this.getSpecifications(currentUser);

    // 5. Métricas Macro
    const totalRollsInFloor = rollsInFloor.length;
    const totalMetersInFloor = rollsInFloor.reduce((sum, r) => sum + Number(r.meters || 0), 0);
    const totalWeightFabricKg = rollsInFloor.reduce((sum, r) => sum + Number(r.weight_kg || 0), 0);
    const totalWarehouseKg = warehouseWip.reduce((sum, w) => sum + Number(w.amount || 0), 0);

    let totalValuationMxn = null;
    if (allowCosts) {
      const warehouseVal = warehouseWip.reduce((sum, w) => {
        const unitCost = Number(w.lote?.unit_cost || 0);
        return sum + Number(w.amount || 0) * unitCost;
      }, 0);
      const fabricVal = rollsInFloor.reduce((sum, roll) => sum + Number(roll.calculated_roll_cost || 0), 0);
      totalValuationMxn = Number((warehouseVal + fabricVal).toFixed(2));
    }

    return {
      macro: {
        total_rolls_in_floor: totalRollsInFloor,
        total_rolls_incoming: rollsIncoming.length,
        total_meters_in_floor: Number(totalMetersInFloor.toFixed(2)),
        total_weight_fabric_kg: Number(totalWeightFabricKg.toFixed(2)),
        total_warehouse_materials_kg: Number(totalWarehouseKg.toFixed(3)),
        total_valuation_mxn: totalValuationMxn,
      },
      rolls_in_floor: rollsInFloor.map((r) => ({
        id: r.id,
        roll_code: r.roll_code,
        qr_code: r.qr_code,
        loom: r.loom ? { id: r.loom.id, code: r.loom.code, name: r.loom.name } : null,
        bom: r.bom ? { id: r.bom.id, code: r.bom.code, name: r.bom.name } : null,
        meters: Number(r.meters),
        weight_kg: Number(r.weight_kg),
        width_cm: Number(r.width_cm),
        grammage_g_per_m: Number(r.grammage_g_per_m),
        current_stage: r.current_stage,
        next_allowed_stage: r.next_allowed_stage,
        route: r.route,
        status: r.status,
        operator: r.operator ? `${r.operator.first_name || ''} ${r.operator.last_name || ''}`.trim() : 'N/A',
        created_at: r.created_at,
      })),
      rolls_incoming: rollsIncoming.map((r) => ({
        id: r.id,
        roll_code: r.roll_code,
        qr_code: r.qr_code,
        loom: r.loom ? { id: r.loom.id, code: r.loom.code, name: r.loom.name } : null,
        bom: r.bom ? { id: r.bom.id, code: r.bom.code, name: r.bom.name } : null,
        meters: Number(r.meters),
        weight_kg: Number(r.weight_kg),
        current_stage: r.current_stage,
        next_allowed_stage: r.next_allowed_stage,
        route: r.route,
        status: r.status,
        created_at: r.created_at,
      })),
      warehouse_materials: warehouseWip.map((w) => {
        const item = {
          id: w.id,
          material_id: w.material_id,
          internal_code: w.material?.internal_code || 'N/A',
          name: w.material?.name || 'Insumo',
          folio_lote: w.lote?.folio || 'N/A',
          qr_code: w.qr_code?.qr_code || 'N/A',
          amount_kg: Number(w.amount),
          received_at: w.created_at,
        };
        if (allowCosts) {
          item.unit_cost_mxn = Number(w.lote?.unit_cost || 0);
          item.total_cost_mxn = Number((item.amount_kg * item.unit_cost_mxn).toFixed(2));
        }
        return item;
      }),
      scrap_logs: (await AreaProcessScrapLog.findAll({
        where: { area_id: 4 },
        include: [
          { model: QrCode, as: 'sourceQr', attributes: ['qr_code'] },
          { model: QrCode, as: 'outputQr', attributes: ['qr_code'] },
          { model: User, as: 'recorder', attributes: ['id', 'first_name', 'last_name'] },
        ],
        order: [['created_at', 'DESC']], limit: 100,
        transaction,
      })).map((log) => ({ id: log.id, roll_id: log.viajero_roll_id, source_qr: log.sourceQr?.qr_code || 'N/A', output_qr: log.outputQr?.qr_code || 'N/A', output_pti_code: log.output_pti_code, specification_code: log.specification_code, processed_meters: Number(log.processed_meters), good_meters: Number(log.good_meters), scrap_meters: Number(log.scrap_meters), good_weight_kg: Number(log.good_weight_kg), scrap_weight_kg: log.scrap_weight_kg == null ? null : Number(log.scrap_weight_kg), reason: log.reason, notes: log.notes, recorded_by: log.recorder ? `${log.recorder.first_name || ''} ${log.recorder.last_name || ''}`.trim() : 'N/A', created_at: log.created_at })),
      telares_scrap_observations: (await TelaresScrapObservation.findAll({ where: { destination_area_code: 'LAMINADO' }, include: [{ model: QrCode, as: 'sourceQr', attributes: ['qr_code'] }, { model: User, as: 'recorder', attributes: ['first_name', 'last_name'] }], order: [['created_at', 'DESC']], limit: 100 })).map((row) => ({ id: row.id, roll_id: row.viajero_roll_id, source_qr: row.sourceQr?.qr_code || 'N/A', meter_start: Number(row.meter_start), meter_end: Number(row.meter_end), scrap_meters: Number(row.scrap_meters), estimated_weight_kg: Number(row.estimated_weight_kg), reason: row.reason, recorded_by: row.recorder ? `${row.recorder.first_name || ''} ${row.recorder.last_name || ''}`.trim() : 'N/A', created_at: row.created_at })),
      recent_transformed: recentTransformed.map((log) => ({
        id: log.id,
        roll_code: log.roll?.roll_code || 'N/A',
        qr_code: log.roll?.qr_code || 'N/A',
        bom_name: log.roll?.bom?.name || 'N/A',
        meters_out: Number(log.meters_out || 0),
        weight_out_kg: Number(log.weight_out_kg || 0),
        status: log.roll?.status || 'DISPONIBLE',
        next_allowed_stage: log.roll?.next_allowed_stage || null,
        operator: log.operator ? `${log.operator.first_name || ''} ${log.operator.last_name || ''}`.trim() : 'N/A',
        notes: log.notes,
        finished_at: log.created_at,
      })),
      specifications,
    };
  }

  /**
   * Evaluar materiales requeridos para procesar un rollo en Laminado vs Stock en WIP
   */
  async assessRollMaterials({ roll_id, specification_id }) {
    const roll = await ViajeroRoll.findByPk(roll_id, {
      include: [
        { model: ProductionBom, as: 'bom', attributes: ['id', 'code', 'name', 'target_width_cm', 'target_weight_g_per_m'] },
        { model: Loom, as: 'loom', attributes: ['id', 'code', 'name'] },
      ],
    });

    if (!roll) {
      throw Object.assign(new Error(`El rollo con ID ${roll_id} no existe.`), { statusCode: 404 });
    }
    if (roll.current_stage === 'TELARES') {
      const picked = await CorteLaminadoOrderItem.findOne({ where: { roll_id: roll.id, status: 'PICKED' } });
      if (!picked) throw Object.assign(new Error('Primero Laminado debe confirmar con el QR la recogida del rollo solicitado por Corte.'), { statusCode: 409, code: 'CORTE_ORDER_PICKUP_REQUIRED' });
    }
    if (!roll.route?.includes('LAMINADO') || roll.next_allowed_stage !== 'LAMINADO') {
      throw Object.assign(new Error('Este rollo no está encaminado a Laminado como siguiente etapa.'), { statusCode: 409, code: 'AREA_NOT_IN_ROUTE' });
    }

    const allSpecs = await LaminadoSpecification.findAll({
      where: { is_active: true },
      include: [
        {
          model: LaminadoSpecificationMaterial,
          as: 'materials',
          include: [{ model: Material, as: 'material', attributes: ['id', 'internal_code', 'name', 'family_id', 'base_unit_id'] }],
        },
      ],
      order: [['code', 'ASC']],
    });

    const compatibleSpecs = allSpecs.filter((s) => s.materials?.length > 0 && rollTransformation.compatibility(s, roll, 'LAMINADO'));

    let selectedSpec = null;
    if (specification_id) {
      selectedSpec = compatibleSpecs.find((s) => s.id === Number(specification_id));
      if (!selectedSpec) throw Object.assign(new Error('La especificación elegida no es compatible con el rollo.'), { statusCode: 409, code: 'SPEC_NOT_COMPATIBLE' });
    }
    if (!selectedSpec) {
      selectedSpec = compatibleSpecs[0];
    }

    if (!selectedSpec) {
      throw Object.assign(new Error('No hay especificaciones activas configuradas para Laminado.'), { statusCode: 400 });
    }

    if (!selectedSpec.is_active) throw Object.assign(new Error('La especificación seleccionada está inactiva.'), { statusCode: 400 });
    const rollMeters = Number(roll.meters || 0);
    const rollWeight = Number(roll.weight_kg || 0);
    const assessment = await rollTransformation.assessWip({ spec: selectedSpec, meters: rollMeters, areaId: 4 });

    return {
      roll: {
        id: roll.id,
        roll_code: roll.roll_code,
        qr_code: roll.qr_code,
        meters: rollMeters,
        weight_kg: rollWeight,
        bom: roll.bom ? { id: roll.bom.id, code: roll.bom.code, name: roll.bom.name } : null,
        loom: roll.loom ? { id: roll.loom.id, code: roll.loom.code, name: roll.loom.name } : null,
        current_stage: roll.current_stage,
        next_allowed_stage: roll.next_allowed_stage,
        route: roll.route,
      },
      specification: {
        id: selectedSpec.id,
        code: selectedSpec.code,
        name: selectedSpec.name,
        process_type: selectedSpec.process_type,
        coating_type: selectedSpec.coating_type,
        coating_grammage_g_per_m2: Number(selectedSpec.coating_grammage_g_per_m2),
        cost_transformation_index: Number(selectedSpec.cost_transformation_index),
      },
      compatible_specifications: compatibleSpecs.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        process_type: s.process_type,
        coating_grammage_g_per_m2: Number(s.coating_grammage_g_per_m2),
      })),
      ...assessment,
    };
  }

  /**
   * Generar Orden de Consumo (ODC) a Almacén para los materiales faltantes de un rollo en Laminado
   */
  async createOdcForRoll({ roll_id, specification_id, missing_materials = [], additional_materials = [], user_id, notes }) {
    const roll = await ViajeroRoll.findByPk(roll_id, { include: [{ model: ProductionBom, as: 'bom' }] });
    if (!roll) {
      throw Object.assign(new Error(`El rollo con ID ${roll_id} no existe.`), { statusCode: 404 });
    }

    const spec = await LaminadoSpecification.findByPk(specification_id, {
      include: [{ model: LaminadoSpecificationMaterial, as: 'materials', include: [{ model: Material, as: 'material', attributes: ['id', 'name', 'internal_code', 'family_id', 'base_unit_id'] }] }],
    });
    if (!spec) {
      throw Object.assign(new Error(`La especificación con ID ${specification_id} no existe.`), { statusCode: 404 });
    }
    ensureWarehouseRecipe(spec);

    if (!Array.isArray(missing_materials) || !Array.isArray(additional_materials)) {
      throw Object.assign(new Error('La solicitud debe incluir listas válidas de faltantes y materiales adicionales.'), { statusCode: 400 });
    }

    if (!spec.is_active || !rollTransformation.compatibility(spec, roll, 'LAMINADO') || !roll.route?.includes('LAMINADO') || roll.next_allowed_stage !== 'LAMINADO') {
      throw Object.assign(new Error('El rollo no está encaminado a Laminado como siguiente etapa o la especificación no es compatible.'), { statusCode: 409 });
    }
    if (roll.current_stage === 'TELARES') {
      const picked = await CorteLaminadoOrderItem.findOne({ where: { roll_id: roll.id, status: 'PICKED' } });
      if (!picked) throw Object.assign(new Error('Primero confirma la recogida física del rollo en Laminado.'), { statusCode: 409, code: 'CORTE_ORDER_PICKUP_REQUIRED' });
    }
    const assessment = await rollTransformation.assessWip({ spec, meters: Number(roll.meters), areaId: 4 });
    const requested = new Map(missing_materials.map((item) => [Number(item.material_id), Number(item.missing_kg)]));
    if (requested.size !== assessment.missing_materials.length || assessment.missing_materials.some((item) => Math.abs((requested.get(item.material_id) ?? -1) - item.missing_kg) > 0.001)) {
      throw Object.assign(new Error('Los faltantes enviados cambiaron. Actualiza la evaluación WIP antes de solicitar a Almacén.'), { statusCode: 409, code: 'WIP_ASSESSMENT_STALE' });
    }
    const itemQuantities = new Map(assessment.missing_materials.map((item) => [Number(item.material_id), Number(item.missing_kg)]));
    for (const item of additional_materials) {
      const materialId = Number(item?.material_id);
      const quantity = Number(item?.quantity);
      if (!Number.isInteger(materialId) || materialId <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
        throw Object.assign(new Error('Cada material adicional debe pertenecer al catálogo y tener una cantidad mayor a cero.'), { statusCode: 400 });
      }
      const material = await Material.findByPk(materialId);
      if (!material || material.is_active === false) {
        throw Object.assign(new Error(`El material adicional ${materialId} no existe o no está activo en el catálogo.`), { statusCode: 400 });
      }
      itemQuantities.set(materialId, Number(((itemQuantities.get(materialId) || 0) + quantity).toFixed(3)));
    }
    if (itemQuantities.size === 0) {
      throw Object.assign(new Error('Agrega un faltante de receta o al menos un material adicional para crear la ODC.'), { statusCode: 400 });
    }
    const items = [...itemQuantities].map(([material_id, quantity]) => ({ material_id, quantity }));

    const orderNotes = notes || `ODC generada para Rollo ${roll.roll_code} en Laminado (Espec: ${spec.code})`;

    const order = await consumptionOrderService.createOrder({
      requested_by: user_id,
      requesting_area_id: 4, // Laminado
      items,
      notes: orderNotes,
    });

    return {
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        requested_by: order.requested_by,
        notes: order.notes,
      },
      message: `Orden de Consumo ${order.order_number} generada exitosamente dirigida a Almacén.`,
    };
  }

  /**
   * Validar escaneo de QR en estación Laminado
   * 1. Verifica si fue encaminado a Laminado y la secuencia de ruta
   * 2. Prepara datos para producción y preview de nuevo QR
   */
  async verifyScan({ qr_code, operator_id, currentUser = null, transaction }) {
    const clean = normalizeViajeroQr(qr_code);
    const roll = await ViajeroRoll.findOne({
      where: {
        [Op.or]: [
          { qr_code: clean },
          { roll_code: clean },
          { qr_code: `VIAJERO-${clean}` },
          { roll_code: clean.replace(/^VIAJERO-/, '') },
        ],
        is_active: true,
      },
      include: [
        { model: Loom, as: 'loom', attributes: ['id', 'code', 'name'] },
        { model: ProductionBom, as: 'bom', attributes: ['id', 'code', 'name', 'product_kind', 'target_width_cm', 'target_weight_g_per_m', 'fabric_type'] },
      ],
      transaction,
    });

    if (!roll) {
      return {
        is_allowed: false,
        error_code: 'ROLL_NOT_FOUND',
        message: `El código QR '${qr_code}' no corresponde a ningún rollo registrado o activo.`,
      };
    }

    const targetArea = 'LAMINADO';
    const routeState = getLaminadoRouteState(roll);
    const route = routeState?.route || roll.route || [];

    // Every Telares-to-Laminado transfer is authorized by a Corte order and
    // recorded pickup. Knowing the route alone must never allow direct intake.
    if (roll.current_stage === 'TELARES') {
      const pickedOrderItem = await CorteLaminadoOrderItem.findOne({ where: { roll_id: roll.id, status: 'PICKED' }, include: [{ model: CorteLaminadoOrder, as: 'order', where: { destination_area_code: 'LAMINADO' }, attributes: ['id', 'order_number'] }], transaction });
      if (!pickedOrderItem) {
        return {
          is_allowed: false,
          error_code: 'CORTE_ORDER_PICKUP_REQUIRED',
          roll: { roll_code: roll.roll_code, qr_code: roll.qr_code, route, current_stage: roll.current_stage, next_allowed_stage: roll.next_allowed_stage },
          message: 'Este rollo requiere una orden de Corte y que Laminado confirme su recogida física en Telares antes de recibirlo.',
        };
      }
      const laminadoArea = await Area.findOne({ where: { code: 'LAMINADO' }, transaction });
      const sourceQr = await QrCode.findByPk(roll.virgin_qr_code_id, { transaction });
      const sourceTraceable = sourceQr ? await TraceableItem.findOne({ where: { qr_code_id: sourceQr.id }, transaction }) : null;
      if (!laminadoArea || Number(sourceTraceable?.current_area_id) !== Number(laminadoArea.id)) return { is_allowed: false, error_code: 'ROLL_NOT_IN_LAMINADO_WIP', message: 'La custodia del QR no está en el WIP de Laminado. Confirma la recogida del rollo desde Telares.' };
    }

    if (!routeState) {
      return {
        is_allowed: false,
        error_code: 'INVALID_PRODUCTION_ROUTE',
        roll: { roll_code: roll.roll_code, qr_code: roll.qr_code, route, current_stage: roll.current_stage, next_allowed_stage: roll.next_allowed_stage },
        message: 'La ruta del QR no es válida para Laminado. Solicita al administrador corregir la ficha técnica de Telares.',
      };
    }

    // Verificación 1: ¿Fue encaminado a esta área?
    if (!route.includes(targetArea)) {
      await ViajeroRoutingLog.create({
        viajero_roll_id: roll.id,
        from_stage: roll.current_stage,
        to_stage: targetArea,
        area_id: 4,
        operator_id: operator_id || null,
        action: 'BLOQUEO_RUTEO_INVALIDO',
        notes: `Intento de escaneo no autorizado en LAMINADO. Ruta oficial: ${route.join(' -> ')}`,
      }, { transaction });

      return {
        is_allowed: false,
        error_code: 'AREA_NOT_IN_ROUTE',
        roll: {
          roll_code: roll.roll_code,
          qr_code: roll.qr_code,
          route,
          current_stage: roll.current_stage,
          next_allowed_stage: roll.next_allowed_stage,
        },
        message: `⛔ ACCESO DENEGADO: El rollo (${roll.roll_code}) no tiene configurado el paso por LAMINADO. Su siguiente estación requerida es: ${roll.next_allowed_stage}.`,
      };
    }

    // Verificación de secuencia
    if (!routeState.isNext || !routeState.isAtPreviousStage) {
      await ViajeroRoutingLog.create({
        viajero_roll_id: roll.id,
        from_stage: roll.current_stage,
        to_stage: targetArea,
        area_id: 4,
        operator_id: operator_id || null,
        action: 'BLOQUEO_RUTEO_INVALIDO',
        notes: `Intento fuera de secuencia a LAMINADO. Estado actual: ${roll.current_stage}; se esperaba ${routeState.previousStage} → LAMINADO.`,
      }, { transaction });

      return {
        is_allowed: false,
        error_code: 'OUT_OF_SEQUENCE',
        roll: {
          roll_code: roll.roll_code,
          qr_code: roll.qr_code,
          route,
          current_stage: roll.current_stage,
          next_allowed_stage: roll.next_allowed_stage,
        },
        message: `⛔ SECUENCIA INVÁLIDA: Este rollo debe estar en '${routeState.previousStage}' y tener Laminado como siguiente estación.`,
      };
    }

    // Rollo válido para recibir y procesar en Laminado
    const allSpecs = await LaminadoSpecification.findAll({
      where: { is_active: true },
      include: [{ model: LaminadoSpecificationMaterial, as: 'materials', include: [{ model: Material, as: 'material', attributes: ['id', 'name', 'internal_code', 'family_id', 'base_unit_id'] }] }],
      order: [['code', 'ASC']],
      transaction,
    });
    const compatibleSpecs = allSpecs.filter((s) => s.materials?.length > 0 && rollTransformation.compatibility(s, roll, 'LAMINADO'));

    if (compatibleSpecs.length === 0) {
      return {
        is_allowed: false,
        error_code: 'NO_COMPATIBLE_SPECIFICATION',
        roll: { roll_code: roll.roll_code, qr_code: roll.qr_code, route, current_stage: roll.current_stage, next_allowed_stage: roll.next_allowed_stage },
        message: 'El rollo llegó a Laminado, pero no hay una especificación activa compatible con su BOM, ancho y etapa de origen. Pide al administrador de Laminado configurar la receta antes de procesarlo.',
      };
    }

    const previewNewQr = `${roll.roll_code}-LAM`;
    const allowCosts = canViewCosts(currentUser);

    return {
      is_allowed: true,
      message: `✔ Rollo ${roll.roll_code} verificado correctamente para proceso en LAMINADO.`,
      roll: {
        id: roll.id,
        roll_code: roll.roll_code,
        qr_code: roll.qr_code,
        meters: Number(roll.meters),
        weight_kg: Number(roll.weight_kg),
        bom: roll.bom ? { id: roll.bom.id, code: roll.bom.code, name: roll.bom.name } : null,
        loom: roll.loom ? { id: roll.loom.id, code: roll.loom.code, name: roll.loom.name } : null,
        current_stage: roll.current_stage,
        next_allowed_stage: roll.next_allowed_stage,
        route: roll.route,
        calculated_roll_cost: allowCosts ? Number(roll.calculated_roll_cost || 0) : null,
      },
      compatible_specifications: compatibleSpecs.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        process_type: s.process_type,
        coating_grammage_g_per_m2: Number(s.coating_grammage_g_per_m2 || 0),
        cost_transformation_index: allowCosts ? Number(s.cost_transformation_index) : null,
      })),
      preview_new_qr: previewNewQr,
    };
  }

  /**
   * Ejecutar Transformación de Rollo en Laminado:
   * - Descuenta insumos del WIP de piso (FIFO)
   * - Calcula nuevo costo transformado (Costo Base + Insumos) * Factor
   * - Genera y asigna el NUEVO QR al rollo (${roll_code}-LAM)
   * - Actualiza etapa y Kardex de enrutamiento
   */
  async transformRoll({ roll_id, specification_id, meters_out, weight_out_kg, scrap_meters = 0, scrap_weight_kg, scrap_reason, virgin_qr_code, operator_id, currentUser = null, notes }) {
    const allowCosts = canViewCosts(currentUser);

    return await sequelize.transaction(async (t) => {
      const roll = await ViajeroRoll.findByPk(roll_id, {
        include: [{ model: ProductionBom, as: 'bom' }],
        transaction: t,
        lock: { level: t.LOCK.UPDATE, of: ViajeroRoll },
      });

      if (!roll) {
        throw Object.assign(new Error(`El rollo con ID ${roll_id} no existe.`), { statusCode: 404 });
      }

      const routeState = getLaminadoRouteState(roll);
      if (!routeState || !routeState.isNext || !routeState.isAtPreviousStage || roll.status === 'TRANSFORMADO' || !roll.is_active) {
        throw Object.assign(new Error(`El rollo no está autorizado para transformación en LAMINADO. Siguiente etapa oficial: ${roll.next_allowed_stage}`), { statusCode: 400 });
      }
      let pickedOrderItem = null;
      if (roll.current_stage === 'TELARES') {
        pickedOrderItem = await CorteLaminadoOrderItem.findOne({
          where: { roll_id: roll.id, status: 'PICKED' },
          include: [{ model: CorteLaminadoOrder, as: 'order', where: { destination_area_code: 'LAMINADO' } }],
          transaction: t,
          // The order is an optional joined association; lock the picked item
          // only and lock the parent order explicitly when its status changes.
          lock: { level: t.LOCK.UPDATE, of: CorteLaminadoOrderItem },
        });
        if (!pickedOrderItem) throw Object.assign(new Error('Laminado no puede transformar este rollo hasta que exista una orden de Corte y se confirme su recogida en Telares.'), { statusCode: 409, code: 'CORTE_ORDER_PICKUP_REQUIRED' });
        const laminadoArea = await Area.findOne({ where: { code: 'LAMINADO' }, transaction: t });
        const sourceQr = await QrCode.findByPk(roll.virgin_qr_code_id, { transaction: t, lock: t.LOCK.UPDATE });
        const sourceTraceable = sourceQr ? await TraceableItem.findOne({ where: { qr_code_id: sourceQr.id }, transaction: t, lock: t.LOCK.UPDATE }) : null;
        if (!laminadoArea || Number(sourceTraceable?.current_area_id) !== Number(laminadoArea.id)) throw Object.assign(new Error('El QR debe estar bajo custodia del WIP de Laminado antes de transformar.'), { statusCode: 409, code: 'ROLL_NOT_IN_LAMINADO_WIP' });
      }

      const spec = await LaminadoSpecification.findByPk(specification_id, {
        include: [
          {
            model: LaminadoSpecificationMaterial,
            as: 'materials',
            include: [{ model: Material, as: 'material' }],
          },
        ],
        transaction: t,
      });

      if (!spec) throw Object.assign(new Error(`La especificación con ID ${specification_id} no existe.`), { statusCode: 404 });
      ensureWarehouseRecipe(spec);
      if (pickedOrderItem?.order?.target_specification_id && Number(pickedOrderItem.order.target_specification_id) !== Number(spec.id)) {
        throw Object.assign(new Error(`La orden de Corte solicitó el PTI ${pickedOrderItem.order.target_specification_id}; selecciona la especificación correspondiente.`), { statusCode: 409, code: 'CORTE_ORDER_SPECIFICATION_MISMATCH' });
      }
      rollTransformation.validateSpecificationPayload(spec.toJSON(), 'LAMINADO');
      if (!spec.is_active || !rollTransformation.compatibility(spec, roll, 'LAMINADO')) {
        throw Object.assign(new Error('La especificación está inactiva o no es compatible con el rollo.'), { statusCode: 409, code: 'SPEC_NOT_COMPATIBLE' });
      }

      const outMeters = Number(meters_out || roll.meters);
      const outWeight = Number(weight_out_kg || roll.weight_kg);
      const scrapMeters = Number(scrap_meters || 0);
      const processedMeters = Number((outMeters + scrapMeters).toFixed(2));
      const telaresScrapObservations = await telaresScrapObservationService.listForRoll(roll.id, t);
      const telaresScrapMeters = Number(telaresScrapObservations.reduce((sum, item) => sum + Number(item.scrap_meters), 0).toFixed(2));
      const telaresScrapWeightKg = Number(telaresScrapObservations.reduce((sum, item) => sum + Number(item.estimated_weight_kg), 0).toFixed(3));

      const scrapWeight = scrap_weight_kg === undefined || scrap_weight_kg === '' ? null : Number(scrap_weight_kg);
      if (!(outMeters > 0) || !(outWeight > 0) || !Number.isFinite(scrapMeters) || scrapMeters < 0 || (scrapWeight !== null && (!Number.isFinite(scrapWeight) || scrapWeight < 0 || scrapWeight > Number(roll.weight_kg) + 0.01)) || Math.abs(processedMeters + telaresScrapMeters - Number(roll.meters)) > 0.02) {
        throw Object.assign(new Error(`La producción buena (${outMeters} m), merma de proceso (${scrapMeters} m) y defecto de Telares (${telaresScrapMeters} m) deben cubrir ${roll.meters} m de entrada.`), { statusCode: 400, code: 'PROCESS_METER_BALANCE' });
      }
      const { consumed: consumedMaterialsSummary, sourceQrConsumptions, materialCost: totalStageMaterialCost } = await rollTransformation.consumeWip({ spec, meters: processedMeters, areaId: 4, transaction: t, performedBy: operator_id });

      // 2. Calcular Nuevo Costo Transformado
      const previousCost = Number(roll.calculated_roll_cost || 0);
      const transformationIndex = Number(spec.cost_transformation_index || 1.0);
      const newTransformedCost = Number(((previousCost + totalStageMaterialCost) * transformationIndex).toFixed(4));

      // 3. Generar Nuevo QR para el Rollo Transformado
      const newQrCodeString = String(virgin_qr_code || '').trim().toUpperCase();
      if (!newQrCodeString) throw Object.assign(new Error('Escanea un QR virgen de Laminado para identificar el rollo terminado.'), { statusCode: 400, code: 'LAMINADO_OUTPUT_VIRGIN_QR_REQUIRED' });
      const route = routeState.route;
      const lamIdx = route.indexOf('LAMINADO');
      const nextStage = lamIdx >= 0 && lamIdx + 1 < route.length ? route[lamIdx + 1] : 'TERMINADO';
      const isAwaitingCutDispatch = nextStage === 'CORTE';
      const isAwaitingSale = nextStage === 'VENTA';
      const isRouteComplete = nextStage === 'TERMINADO' || isAwaitingSale;

      const laminadoArea = await Area.findOne({ where: { code: 'LAMINADO' }, transaction: t });
      const corteArea = await Area.findOne({ where: { code: 'CORTE' }, transaction: t });
      if (!laminadoArea) throw Object.assign(new Error('No está configurada el área Laminado.'), { statusCode: 500 });
      const outputArea = laminadoArea;
      if (isAwaitingCutDispatch && !corteArea) throw Object.assign(new Error('No está configurada el área Corte para recibir el PTI laminado.'), { statusCode: 500 });
      const qrRecord = await QrCode.findOne({ where: { qr_code: newQrCodeString }, transaction: t, lock: t.LOCK.UPDATE });
      const virginStatuses = new Set(['UNASSIGNED', 'ASSIGNED', 'GENERATED', 'AVAILABLE']);
      if (!qrRecord || !qrRecord.is_active || Number(qrRecord.assigned_area_id) !== Number(laminadoArea.id) || !virginStatuses.has(String(qrRecord.status || '').toUpperCase()) || qrRecord.entity_type || qrRecord.entity_id) {
        throw Object.assign(new Error('El QR escaneado no existe, no está virgen o no pertenece al lote de Laminado. Solicita una etiqueta nueva a Almacén.'), { statusCode: 409, code: 'LAMINADO_OUTPUT_VIRGIN_QR_INVALID' });
      }
      const preexistingTraceable = await TraceableItem.findOne({ where: { qr_code_id: qrRecord.id }, transaction: t, lock: t.LOCK.UPDATE });
      if (preexistingTraceable) throw Object.assign(new Error('El QR ya tiene trazabilidad y no puede reutilizarse.'), { statusCode: 409, code: 'LAMINADO_OUTPUT_QR_ALREADY_USED' });

      const outputTraceable = await TraceableItem.create({
        qr_code_id: qrRecord.id,
        item_type: isRouteComplete ? 'FINISHED_PRODUCT' : 'INTERMEDIATE_PRODUCT',
        product_name: spec.output_product_name,
        origin_area_id: 4,
        current_area_id: outputArea.id,
        quantity_initial: outWeight,
        quantity_current: outWeight,
        unit: 'KG',
        status: isAwaitingSale ? 'PENDIENTE_VENTA' : isAwaitingCutDispatch ? 'PENDIENTE_TRANSFERENCIA' : 'DISPONIBLE',
        location: isAwaitingSale ? 'En espera de Venta' : isAwaitingCutDispatch ? 'Laminado · pendiente de despacho a Corte' : 'WIP Laminado',
        metadata: { output_pti_code: spec.output_pti_code, specification_id: spec.id, specification_code: spec.code, meters: outMeters, scrap_meters: scrapMeters, commercial_status: isAwaitingSale ? 'EN_ESPERA_DE_VENTA' : null },
        created_by: operator_id || null,
      }, { transaction: t });
      await TraceabilityMovement.create({ traceable_item_id: outputTraceable.id, qr_code_id: qrRecord.id, movement_type: 'GENERACION_INTERMEDIA', from_area_id: laminadoArea.id, to_area_id: laminadoArea.id, quantity: outWeight, unit: 'KG', balance_after: outWeight, reference_folio: spec.code, notes: isAwaitingSale ? `PTI laminado generado; queda bloqueado en espera de Venta: ${spec.output_pti_code}` : isAwaitingCutDispatch ? `PTI laminado generado; requiere confirmación de despacho y recepción en Corte: ${spec.output_pti_code}` : `Generación de PTI ${spec.output_pti_code} en Laminado`, metadata: { output_qr: newQrCodeString, meters: outMeters, specification_code: spec.code, next_allowed_stage: nextStage, commercial_status: isAwaitingSale ? 'EN_ESPERA_DE_VENTA' : null }, performed_by: operator_id || null }, { transaction: t });
      const consumedKg = sourceQrConsumptions.reduce((sum, row) => sum + row.quantity_used_kg, 0);
      for (const source of sourceQrConsumptions) await TraceabilityLink.create({
        parent_traceable_item_id: source.traceable_item_id,
        child_traceable_item_id: outputTraceable.id,
        parent_qr_code_id: source.qr_code_id,
        child_qr_code_id: qrRecord.id,
        link_type: 'TRANSFORMACION',
        quantity_used: source.quantity_used_kg,
        quantity_generated: Number((outWeight * source.quantity_used_kg / Math.max(consumedKg, 0.001)).toFixed(3)),
        scrap_quantity: scrapWeight > 0 ? Number((scrapWeight * source.quantity_used_kg / Math.max(consumedKg, 0.001)).toFixed(3)) : 0,
        unit: 'KG', process_area_id: 4,
        notes: `Consumo de ${source.qr_code} para ${spec.output_pti_code}`,
        metadata: { material_id: source.material_id, specification_code: spec.code, processed_meters: processedMeters },
        created_by: operator_id || null,
      }, { transaction: t });
      const previousQr = await QrCode.findOne({ where: { qr_code: roll.qr_code }, transaction: t, lock: t.LOCK.UPDATE });
      if (previousQr) {
        const previousTraceable = await TraceableItem.findOne({ where: { qr_code_id: previousQr.id }, transaction: t, lock: t.LOCK.UPDATE });
        if (previousTraceable) {
          await TraceabilityLink.create({ parent_traceable_item_id: previousTraceable.id, child_traceable_item_id: outputTraceable.id, parent_qr_code_id: previousQr.id, child_qr_code_id: qrRecord.id, link_type: 'TRANSFORMACION', quantity_used: Number(roll.weight_kg), quantity_generated: outWeight, scrap_quantity: Number((Number(scrap_weight_kg || 0) + telaresScrapWeightKg).toFixed(3)), unit: 'KG', process_area_id: 4, notes: `Transformación de rollo en LAMINADO; PTI ${spec.output_pti_code}`, metadata: { input_meters: Number(roll.meters), good_meters: outMeters, process_scrap_meters: scrapMeters, telares_scrap_meters: telaresScrapMeters, telares_scrap_observation_ids: telaresScrapObservations.map((item) => item.id), scrap_reason: scrap_reason || null }, created_by: operator_id || null }, { transaction: t });
          previousTraceable.quantity_current = 0;
          previousTraceable.status = 'CONSUMIDO';
          await previousTraceable.save({ transaction: t });
          await TraceabilityMovement.create({ traceable_item_id: previousTraceable.id, qr_code_id: previousQr.id, movement_type: 'CONSUMO_PROCESO', from_area_id: 4, to_area_id: 4, quantity: Number(roll.weight_kg), unit: 'KG', balance_after: 0, reference_folio: spec.code, notes: `Transformado a PTI ${spec.output_pti_code}`, metadata: { output_qr: newQrCodeString, good_meters: outMeters, process_scrap_meters: scrapMeters, telares_scrap_meters: telaresScrapMeters, telares_scrap_weight_estimated_kg: telaresScrapWeightKg }, performed_by: operator_id || null }, { transaction: t });
        }
      }
      if (scrapMeters > 0 || Number(scrap_weight_kg || 0) > 0) {
        if (!previousQr) throw Object.assign(new Error('No se pudo identificar el QR de origen para registrar la merma.'), { statusCode: 409 });
        await AreaProcessScrapLog.create({ area_id: 4, viajero_roll_id: roll.id, source_qr_code_id: previousQr.id, output_qr_code_id: qrRecord.id, output_pti_code: spec.output_pti_code, specification_code: spec.code, processed_meters: processedMeters, good_meters: outMeters, scrap_meters: scrapMeters, good_weight_kg: outWeight, scrap_weight_kg: scrapWeight, reason: scrap_reason || null, notes: notes || null, recorded_by: operator_id || null }, { transaction: t });
      }

      // 4. Determinar siguiente estación oficial

      // 5. Actualizar Historial y Rollo
      const history = Array.isArray(roll.stages_history) ? [...roll.stages_history] : [];
      const fromStage = roll.current_stage || 'TELARES';
      history.push({
        stage: 'LAMINADO',
        action: 'TRANSFORMADO',
        previous_qr: roll.qr_code,
        new_qr_code: newQrCodeString,
        specification_id: spec.id,
        specification_code: spec.code,
        meters_in: Number(roll.meters),
        processed_meters: processedMeters,
        scrap_meters: scrapMeters,
        telares_scrap_meters: telaresScrapMeters,
        telares_scrap_weight_estimated_kg: telaresScrapWeightKg,
        telares_scrap_observation_ids: telaresScrapObservations.map((item) => item.id),
        scrap_weight_kg: scrap_weight_kg == null ? null : Number(scrap_weight_kg),
        meters_out: outMeters,
        weight_in_kg: Number(roll.weight_kg),
        weight_out_kg: outWeight,
        previous_cost: previousCost,
        stage_material_cost: totalStageMaterialCost,
        transformation_index: transformationIndex,
        new_transformed_cost: newTransformedCost,
        operator_id: operator_id,
        timestamp: new Date().toISOString(),
      });

      await roll.update(
        {
          current_stage: 'LAMINADO',
          next_allowed_stage: nextStage,
          status: isAwaitingSale ? 'PENDIENTE_VENTA' : isAwaitingCutDispatch ? 'PENDIENTE_TRANSFERENCIA' : isRouteComplete ? 'TRANSFORMADO' : 'DISPONIBLE',
          qr_code: newQrCodeString,
          virgin_qr_code_id: qrRecord.id,
          meters: outMeters,
          weight_kg: outWeight,
          calculated_roll_cost: newTransformedCost,
          stages_history: history,
        },
        { transaction: t }
      );
      await CorteLaminadoOrderItem.update(
        { status: isAwaitingCutDispatch ? 'AWAITING_DISPATCH' : 'PROCESSED', processed_at: new Date() },
        { where: { roll_id: roll.id, status: 'PICKED' }, transaction: t },
      );
      await qrRecord.update({ status: 'ACTIVE', assigned_area_id: outputArea.id, current_area_id: outputArea.id, entity_type: 'VIAJERO_ROLL', entity_id: roll.id, used_by: operator_id || null, used_at: new Date() }, { transaction: t });
      if (previousQr) await previousQr.update({ status: 'TRANSFORMED', is_active: false }, { transaction: t });

      const completedOrderItems = await CorteLaminadoOrderItem.findAll({ where: { roll_id: roll.id, status: { [Op.in]: ['PROCESSED', 'AWAITING_DISPATCH'] } }, attributes: ['order_id'], transaction: t });
      for (const completedItem of completedOrderItems) {
        const order = await CorteLaminadoOrder.findByPk(completedItem.order_id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!order) continue;
        const pending = await CorteLaminadoOrderItem.count({ where: { order_id: order.id, status: { [Op.in]: ['REQUESTED', 'PICKED'] } }, transaction: t });
        const awaitingDispatch = await CorteLaminadoOrderItem.count({ where: { order_id: order.id, status: 'AWAITING_DISPATCH' }, transaction: t });
        if (pending === 0) await order.update({ status: awaitingDispatch ? 'AWAITING_DISPATCH' : 'PROCESSED' }, { transaction: t });
      }

      // 6. Registrar en Kardex de Enrutamiento
      await ViajeroRoutingLog.create(
        {
          viajero_roll_id: roll.id,
          from_stage: fromStage,
          to_stage: 'LAMINADO',
          area_id: 4,
          operator_id: operator_id,
          action: 'TRANSFORMACION_AREA',
          meters_in: roll.meters,
          meters_out: outMeters,
          weight_in_kg: roll.weight_kg,
          weight_out_kg: outWeight,
          notes: notes || `Rollo transformado bajo especificación ${spec.code}. Nuevo QR generado: ${newQrCodeString}`,
        },
        { transaction: t }
      );
      if (isAwaitingSale) await ViajeroRoutingLog.create({
        viajero_roll_id: roll.id, from_stage: 'LAMINADO', to_stage: 'VENTA', area_id: laminadoArea.id, operator_id,
        action: 'LISTO_PARA_VENTA', meters_in: outMeters, meters_out: outMeters,
        weight_in_kg: outWeight, weight_out_kg: outWeight,
        notes: `PTI laminado ${spec.output_pti_code} queda en custodia de Laminado, bloqueado en espera de Venta. QR ${newQrCodeString}.`,
      }, { transaction: t });

      return {
        success: true,
        roll: {
          id: roll.id,
          roll_code: roll.roll_code,
          qr_code: newQrCodeString,
          meters: outMeters,
          weight_kg: outWeight,
          current_stage: 'LAMINADO',
          next_allowed_stage: nextStage,
          route: roll.route,
          calculated_roll_cost: allowCosts ? newTransformedCost : null,
        },
        new_qr_code: newQrCodeString,
        new_transformed_cost: allowCosts ? newTransformedCost : null,
        consumed_materials: consumedMaterialsSummary,
        scrap: { processed_meters: processedMeters, good_meters: outMeters, scrap_meters: scrapMeters, scrap_weight_kg: scrap_weight_kg == null ? null : Number(scrap_weight_kg) },
        message: isAwaitingCutDispatch
          ? `Rollo laminado. Escanea ${newQrCodeString} para confirmar la salida a Corte; Corte deberá escanearlo al recibirlo.`
          : isAwaitingSale
            ? `Rollo laminado y bloqueado en espera de Venta. QR asignado: ${newQrCodeString}. No puede transferirse a otra área.`
            : `✔ Rollo transformado exitosamente en LAMINADO. Nuevo QR asignado: ${newQrCodeString}`,
      };
    });
  }
}

module.exports = new LaminadoService();
