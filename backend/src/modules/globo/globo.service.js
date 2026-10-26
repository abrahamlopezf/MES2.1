const { Op } = require('sequelize');
const {
  sequelize,
  GloboSpecification,
  GloboSpecificationMaterial,
  ProductionBom,
  Material,
  ViajeroRoll,
  ViajeroRoutingLog,
  WipInventory,
  Lote,
  QrCode,
  QrBatch,
  Role,
  Notification,
  Loom,
  User,
} = require('../../database/models');
const { canViewCosts } = require('../../shared/security/accessRules');
const normalizeViajeroQr = require('../../shared/utils/normalizeViajeroQr');
const consumptionOrderService = require('../warehouse/consumptionOrder.service');
const rollTransformation = require('../wip/rollTransformation');

class GloboService {
  /**
   * Catálogo de Especificaciones / Fórmulas de Globo
   */
  async getSpecifications(currentUser = null) {
    const allowCosts = canViewCosts(currentUser);

    const specs = await GloboSpecification.findAll({
      order: [['code', 'ASC']],
      include: [
        {
          model: GloboSpecificationMaterial,
          as: 'materials',
          include: [
            {
              model: Material,
              as: 'material',
              attributes: ['id', 'internal_code', 'name', 'status'],
            },
          ],
        },
      ],
    });

    // Obtener todos los BOMs de telares para mapear allowed_bom_ids
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
      } else {
        data.estimated_cost_mxn = null; // Can be enhanced with material batch cost
      }
      return data;
    });
  }

  async getSpecificationById(id, currentUser = null) {
    const spec = await GloboSpecification.findByPk(id, {
      include: [
        {
          model: GloboSpecificationMaterial,
          as: 'materials',
          include: [
            {
              model: Material,
              as: 'material',
              attributes: ['id', 'internal_code', 'name', 'status'],
            },
          ],
        },
      ],
    });

    if (!spec) {
      const err = new Error(`Especificación de Globo #${id} no encontrada.`);
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
    const {
      code,
      name,
      description,
      process_type,
      target_width_cm,
      target_grammage_g_per_m,
      output_product_name,
      expected_output_quantity,
      expected_output_unit,
      standard_output_meters,
      standard_waste_percentage,
      cost_transformation_index,
      loom_roll_requirements,
      materials = [],
    } = payload;

    rollTransformation.validateSpecificationPayload(payload, 'GLOBO');
    await rollTransformation.validateRecipeMaterialUnits(payload.materials || []);
    const allowedBomIds = [...new Set(payload.loom_roll_requirements.allowed_bom_ids.map(Number))];
    const activeBomCount = await ProductionBom.count({ where: { id: { [Op.in]: allowedBomIds }, is_active: true } });
    if (activeBomCount !== allowedBomIds.length) throw Object.assign(new Error('La receta incluye un BOM inexistente o inactivo.'), { statusCode: 400, code: 'INVALID_SPECIFICATION_BOM' });

    if (!code || !name) {
      const err = new Error('Código y Nombre de especificación son obligatorios.');
      err.statusCode = 400;
      throw err;
    }

    const existing = await GloboSpecification.findOne({ where: { code: String(code).trim().toUpperCase() } });
    if (existing) {
      const err = new Error(`El código "${code}" ya está en uso en otra especificación de Globo.`);
      err.statusCode = 409;
      throw err;
    }

    const t = await sequelize.transaction();
    try {
      const spec = await GloboSpecification.create(
        {
          code: String(code).trim().toUpperCase(),
          name: String(name).trim(),
          description: description || null,
          process_type: process_type || 'EXPANSION',
          target_width_cm: target_width_cm ?? 60.0,
          target_grammage_g_per_m: target_grammage_g_per_m ?? 70.0,
          output_product_name: output_product_name || 'Rollo Globo Calibrado',
          expected_output_quantity: expected_output_quantity ?? 1.0,
          expected_output_unit: expected_output_unit || 'ROLLO',
          standard_output_meters: standard_output_meters ?? 1000.0,
          standard_waste_percentage: standard_waste_percentage ?? 1.5,
          cost_transformation_index: canViewCosts(currentUser) ? (cost_transformation_index || 1.0) : 1.0,
          loom_roll_requirements: loom_roll_requirements || {
            allowed_bom_ids: [],
            min_width_cm: 45.0,
            max_width_cm: 65.0,
            fabric_type: 'TUBULAR',
            meters_per_output: 1000,
            notes: '',
          },
          is_active: true,
        },
        { transaction: t }
      );

      if (Array.isArray(materials) && materials.length > 0) {
        for (const item of materials) {
          if (item.material_id) {
            await GloboSpecificationMaterial.create(
              {
                globo_spec_id: spec.id,
                material_id: item.material_id,
                quantity: item.quantity || 0,
                unit: item.unit || 'KG',
                notes: item.notes || null,
              },
              { transaction: t }
            );
          }
        }
      }

      await t.commit();
      return this.getSpecificationById(spec.id, currentUser);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async updateSpecification(id, payload, currentUser = null) {
    const spec = await GloboSpecification.findByPk(id);
    if (!spec) {
      const err = new Error(`Especificación de Globo #${id} no encontrada.`);
      err.statusCode = 404;
      throw err;
    }

    rollTransformation.validateSpecificationPayload({ ...spec.toJSON(), ...payload, loom_roll_requirements: payload.loom_roll_requirements ?? spec.loom_roll_requirements }, 'GLOBO');
    if (Array.isArray(payload.materials)) await rollTransformation.validateRecipeMaterialUnits(payload.materials);
    const allowedBomIds = [...new Set((payload.loom_roll_requirements ?? spec.loom_roll_requirements).allowed_bom_ids.map(Number))];
    const activeBomCount = await ProductionBom.count({ where: { id: { [Op.in]: allowedBomIds }, is_active: true } });
    if (activeBomCount !== allowedBomIds.length) throw Object.assign(new Error('La receta incluye un BOM inexistente o inactivo.'), { statusCode: 400, code: 'INVALID_SPECIFICATION_BOM' });

    const t = await sequelize.transaction();
    try {
      const {
        code,
        name,
        description,
        process_type,
        target_width_cm,
        target_grammage_g_per_m,
        output_product_name,
        expected_output_quantity,
        expected_output_unit,
        standard_output_meters,
        standard_waste_percentage,
        cost_transformation_index,
        loom_roll_requirements,
        materials,
      } = payload;

      if (code && code.trim().toUpperCase() !== spec.code) {
        const existing = await GloboSpecification.findOne({
          where: { code: code.trim().toUpperCase(), id: { [Op.ne]: id } },
        });
        if (existing) {
          const err = new Error(`El código "${code}" ya está en uso.`);
          err.statusCode = 409;
          throw err;
        }
        spec.code = code.trim().toUpperCase();
      }

      if (name) spec.name = name.trim();
      if (description !== undefined) spec.description = description;
      if (process_type) spec.process_type = process_type;
      if (target_width_cm !== undefined) spec.target_width_cm = target_width_cm;
      if (target_grammage_g_per_m !== undefined) spec.target_grammage_g_per_m = target_grammage_g_per_m;
      if (output_product_name) spec.output_product_name = output_product_name;
      if (expected_output_quantity !== undefined) spec.expected_output_quantity = expected_output_quantity;
      if (expected_output_unit) spec.expected_output_unit = expected_output_unit;
      if (standard_output_meters !== undefined) spec.standard_output_meters = standard_output_meters;
      if (standard_waste_percentage !== undefined) spec.standard_waste_percentage = standard_waste_percentage;
      if (canViewCosts(currentUser) && cost_transformation_index !== undefined) {
        spec.cost_transformation_index = cost_transformation_index;
      }
      if (loom_roll_requirements) spec.loom_roll_requirements = loom_roll_requirements;

      await spec.save({ transaction: t });

      if (Array.isArray(materials)) {
        await GloboSpecificationMaterial.destroy({ where: { globo_spec_id: id }, transaction: t });
        for (const item of materials) {
          if (item.material_id) {
            await GloboSpecificationMaterial.create(
              {
                globo_spec_id: id,
                material_id: item.material_id,
                quantity: item.quantity || 0,
                unit: item.unit || 'KG',
                notes: item.notes || null,
              },
              { transaction: t }
            );
          }
        }
      }

      await t.commit();
      return this.getSpecificationById(id, currentUser);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  async toggleSpecification(id) {
    const spec = await GloboSpecification.findByPk(id);
    if (!spec) {
      const err = new Error(`Especificación de Globo #${id} no encontrada.`);
      err.statusCode = 404;
      throw err;
    }
    spec.is_active = !spec.is_active;
    await spec.save();
    return { id: spec.id, is_active: spec.is_active, message: `Especificación ${spec.code} ${spec.is_active ? 'activada' : 'desactivada'}.` };
  }

  /**
   * WIP Interno de Globo: Rollos en custodia/espera + Insumos de Almacén + Métricas
   */
  async getWipSummary(currentUser = null) {
    const allowCosts = canViewCosts(currentUser);

    // 1. Rollos en custodia de Globo (current_stage = 'GLOBO' o next_allowed_stage = 'GLOBO')
    const rolls = await ViajeroRoll.findAll({
      where: {
        [Op.or]: [
          { current_stage: 'GLOBO', status: { [Op.ne]: 'TRANSFORMADO' } },
          { next_allowed_stage: 'GLOBO', status: 'DISPONIBLE' },
        ],
      },
      include: [
        { model: Loom, as: 'loom', attributes: ['id', 'code', 'name', 'type'] },
        { model: ProductionBom, as: 'bom', attributes: ['id', 'code', 'name', 'target_width_cm', 'target_weight_g_per_m', 'fabric_type'] },
        { model: User, as: 'operator', attributes: ['id', 'first_name', 'last_name', 'username'] },
      ],
      order: [['created_at', 'DESC']],
    });

    const rollsInFloor = rolls.filter((r) => r.current_stage === 'GLOBO');
    const rollsIncoming = rolls.filter((r) => r.current_stage !== 'GLOBO' && r.next_allowed_stage === 'GLOBO');

    // 2. Materiales de Almacén en Custodia de Globo (area_id = 5)
    const warehouseWip = await WipInventory.findAll({
      where: { area_id: 5, amount: { [Op.gt]: 0 } },
      include: [
        {
          model: Material,
          as: 'material',
          attributes: ['id', 'internal_code', 'name', 'status'],
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
    });

    // 3. Rollos procesados recientemente en Globo
    const recentTransformed = await ViajeroRoutingLog.findAll({
      where: { to_stage: 'GLOBO', action: 'PROCESO_FINALIZADO' },
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
      // Valuación de insumos de almacén
      const warehouseVal = warehouseWip.reduce((sum, w) => {
        const unitCost = Number(w.lote?.unit_cost || 0);
        return sum + Number(w.amount || 0) * unitCost;
      }, 0);
      // Valuación aproximada de rollos de tela en piso ($35.00 MXN/kg de rafia procesada base)
      const fabricVal = totalWeightFabricKg * 38.5;
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
      recent_transformed: recentTransformed.map((log) => ({
        id: log.id,
        roll_code: log.roll?.roll_code || 'N/A',
        qr_code: log.roll?.qr_code || 'N/A',
        bom_name: log.roll?.bom?.name || 'N/A',
        meters_out: Number(log.meters_out || 0),
        weight_out_kg: Number(log.weight_out_kg || 0),
        operator: log.operator ? `${log.operator.first_name || ''} ${log.operator.last_name || ''}`.trim() : 'N/A',
        notes: log.notes,
        finished_at: log.created_at,
      })),
      specifications,
    };
  }

  /**
   * Evaluar materiales requeridos para procesar un rollo en Globo vs Stock en WIP
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
    if (!roll.route?.includes('GLOBO') || roll.next_allowed_stage !== 'GLOBO') {
      throw Object.assign(new Error('Este rollo no está encaminado a Globo como siguiente etapa.'), { statusCode: 409, code: 'AREA_NOT_IN_ROUTE' });
    }

    const allSpecs = await GloboSpecification.findAll({
      where: { is_active: true },
      include: [
        {
          model: GloboSpecificationMaterial,
          as: 'materials',
          include: [{ model: Material, as: 'material', attributes: ['id', 'internal_code', 'name'] }],
        },
      ],
      order: [['code', 'ASC']],
    });

    const compatibleSpecs = allSpecs.filter((s) => rollTransformation.compatibility(s, roll, 'GLOBO'));

    let selectedSpec = null;
    if (specification_id) {
      selectedSpec = compatibleSpecs.find((s) => s.id === Number(specification_id));
      if (!selectedSpec) throw Object.assign(new Error('La especificación elegida no es compatible con el rollo.'), { statusCode: 409, code: 'SPEC_NOT_COMPATIBLE' });
    }
    if (!selectedSpec) {
      selectedSpec = compatibleSpecs[0];
    }

    if (!selectedSpec) {
      throw Object.assign(new Error('No hay especificaciones activas configuradas para Globo.'), { statusCode: 400 });
    }

    if (!selectedSpec.is_active) throw Object.assign(new Error('La especificación seleccionada está inactiva.'), { statusCode: 400 });
    const rollMeters = Number(roll.meters || 0);
    const rollWeight = Number(roll.weight_kg || 0);
    const assessment = await rollTransformation.assessWip({ spec: selectedSpec, meters: rollMeters, areaId: 5 });

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
        target_width_cm: Number(selectedSpec.target_width_cm),
        target_caliber_um: Number(selectedSpec.target_caliber_um),
        cost_transformation_index: Number(selectedSpec.cost_transformation_index),
      },
      compatible_specifications: compatibleSpecs.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        process_type: s.process_type,
      })),
      ...assessment,
    };
  }

  /**
   * Generar Orden de Consumo (ODC) a Almacén para los materiales faltantes de un rollo
   */
  async createOdcForRoll({ roll_id, specification_id, missing_materials, user_id, notes }) {
    const roll = await ViajeroRoll.findByPk(roll_id, { include: [{ model: ProductionBom, as: 'bom' }] });
    if (!roll) {
      throw Object.assign(new Error(`El rollo con ID ${roll_id} no existe.`), { statusCode: 404 });
    }

    const spec = await GloboSpecification.findByPk(specification_id, { include: [{ model: GloboSpecificationMaterial, as: 'materials' }] });
    if (!spec) {
      throw Object.assign(new Error(`La especificación con ID ${specification_id} no existe.`), { statusCode: 404 });
    }

    if (!Array.isArray(missing_materials) || missing_materials.length === 0) {
      throw Object.assign(new Error('No se enviaron materiales para solicitar a Almacén.'), { statusCode: 400 });
    }

    if (!spec.is_active || !rollTransformation.compatibility(spec, roll, 'GLOBO') || !roll.route?.includes('GLOBO') || roll.next_allowed_stage !== 'GLOBO') {
      throw Object.assign(new Error('El rollo no está autorizado para Globo o la especificación no es compatible.'), { statusCode: 409 });
    }
    const assessment = await rollTransformation.assessWip({ spec, meters: Number(roll.meters), areaId: 5 });
    const requested = new Map(missing_materials.map((item) => [Number(item.material_id), Number(item.missing_kg)]));
    if (!assessment.missing_materials.length || requested.size !== assessment.missing_materials.length || assessment.missing_materials.some((item) => Math.abs((requested.get(item.material_id) ?? -1) - item.missing_kg) > 0.001)) {
      throw Object.assign(new Error('Los faltantes enviados cambiaron. Actualiza la evaluación WIP antes de solicitar a Almacén.'), { statusCode: 409, code: 'WIP_ASSESSMENT_STALE' });
    }
    const items = assessment.missing_materials.map((item) => ({ material_id: item.material_id, quantity: item.missing_kg }));

    const orderNotes = notes || `ODC generada para Rollo ${roll.roll_code} en Globo (Espec: ${spec.code})`;

    const order = await consumptionOrderService.createOrder({
      requested_by: user_id,
      requesting_area_id: 5, // Globo
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
   * Validar escaneo de QR en estación Globo
   * 1. Verifica si fue encaminado a Globo y la secuencia de ruta
   * 2. Prepara datos para producción y preview de nuevo QR
   */
  async verifyScan({ qr_code, operator_id, currentUser = null }) {
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
        { model: ProductionBom, as: 'bom', attributes: ['id', 'code', 'name', 'target_width_cm', 'target_weight_g_per_m', 'fabric_type'] },
      ],
    });

    if (!roll) {
      return {
        is_allowed: false,
        error_code: 'ROLL_NOT_FOUND',
        message: `El código QR '${qr_code}' no corresponde a ningún rollo registrado o activo.`,
      };
    }

    const targetArea = 'GLOBO';
    const route = roll.route || [];

    // Verificación 1: ¿Fue encaminado a esta área?
    if (!route.includes(targetArea)) {
      await ViajeroRoutingLog.create({
        viajero_roll_id: roll.id,
        from_stage: roll.current_stage,
        to_stage: targetArea,
        area_id: 5,
        operator_id: operator_id || null,
        action: 'BLOQUEO_RUTEO_INVALIDO',
        notes: `Intento de escaneo no autorizado en GLOBO. Ruta oficial: ${route.join(' -> ')}`,
      });

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
        message: `⛔ ACCESO DENEGADO: El rollo (${roll.roll_code}) no tiene configurado el paso por GLOBO. Su siguiente estación requerida es: ${roll.next_allowed_stage}.`,
      };
    }

    // Verificación de secuencia
    if (roll.next_allowed_stage !== targetArea) {
      await ViajeroRoutingLog.create({
        viajero_roll_id: roll.id,
        from_stage: roll.current_stage,
        to_stage: targetArea,
        area_id: 5,
        operator_id: operator_id || null,
        action: 'BLOQUEO_RUTEO_INVALIDO',
        notes: `Intento de salto de etapa a GLOBO. Se requería antes: ${roll.next_allowed_stage}`,
      });

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
        message: `⛔ SECUENCIA INVÁLIDA: Este rollo debe procesarse primero en '${roll.next_allowed_stage}' antes de poder ingresar a GLOBO.`,
      };
    }

    // Rollo válido para recibir y procesar en Globo
    const allSpecs = await GloboSpecification.findAll({
      where: { is_active: true },
      order: [['code', 'ASC']],
    });
    const compatibleSpecs = allSpecs.filter((s) => rollTransformation.compatibility(s, roll, 'GLOBO'));

    if (compatibleSpecs.length === 0) {
      return {
        is_allowed: false,
        error_code: 'NO_COMPATIBLE_SPECIFICATION',
        roll: { roll_code: roll.roll_code, qr_code: roll.qr_code, route, current_stage: roll.current_stage, next_allowed_stage: roll.next_allowed_stage },
        message: 'El rollo llegó a Globo, pero no hay una especificación activa compatible con su BOM y ancho. Pide al administrador de Globo configurar la receta antes de procesarlo.',
      };
    }

    const previewNewQr = `${roll.roll_code}-GLO`;
    const allowCosts = canViewCosts(currentUser);

    return {
      is_allowed: true,
      message: `✔ Rollo ${roll.roll_code} verificado correctamente para proceso en GLOBO.`,
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
        cost_transformation_index: allowCosts ? Number(s.cost_transformation_index) : null,
      })),
      preview_new_qr: previewNewQr,
    };
  }

  /**
   * Ejecutar Transformación de Rollo en Globo:
   * - Descuenta insumos del WIP de piso (FIFO)
   * - Calcula nuevo costo transformado (Costo Base + Insumos) * Factor
   * - Genera y asigna el NUEVO QR al rollo (${roll_code}-GLO)
   * - Actualiza etapa y Kardex de enrutamiento
   */
  async transformRoll({ roll_id, specification_id, meters_out, weight_out_kg, operator_id, currentUser = null, notes }) {
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

      if (roll.next_allowed_stage !== 'GLOBO' || roll.status === 'TRANSFORMADO' || !roll.is_active || !roll.route?.includes('GLOBO')) {
        throw Object.assign(new Error(`El rollo no está autorizado para transformación en GLOBO. Siguiente etapa oficial: ${roll.next_allowed_stage}`), { statusCode: 400 });
      }

      const spec = await GloboSpecification.findByPk(specification_id, {
        include: [
          {
            model: GloboSpecificationMaterial,
            as: 'materials',
            include: [{ model: Material, as: 'material' }],
          },
        ],
        transaction: t,
      });

      if (!spec) throw Object.assign(new Error(`La especificación con ID ${specification_id} no existe.`), { statusCode: 404 });
      if (!spec.is_active || !rollTransformation.compatibility(spec, roll, 'GLOBO')) {
        throw Object.assign(new Error('La especificación está inactiva o no es compatible con el rollo.'), { statusCode: 409, code: 'SPEC_NOT_COMPATIBLE' });
      }

      const outMeters = Number(meters_out || roll.meters);
      const outWeight = Number(weight_out_kg || roll.weight_kg);

      if (!(outMeters > 0) || !(outWeight > 0) || outMeters > Number(roll.meters) + 0.001) {
        throw Object.assign(new Error('Los metros y el peso resultantes deben ser mayores a cero y los metros no pueden superar la entrada.'), { statusCode: 400 });
      }
      const { consumed: consumedMaterialsSummary, materialCost: totalStageMaterialCost } = await rollTransformation.consumeWip({ spec, meters: outMeters, areaId: 5, transaction: t });

      // 2. Calcular Nuevo Costo Transformado
      const previousCost = Number(roll.calculated_roll_cost || 0);
      const transformationIndex = Number(spec.cost_transformation_index || 1.0);
      const newTransformedCost = Number(((previousCost + totalStageMaterialCost) * transformationIndex).toFixed(4));

      // 3. Generar Nuevo QR para el Rollo Transformado
      const newQrCodeString = `${roll.roll_code}-GLO`;

      let batch = await QrBatch.findOne({ transaction: t });
      if (!batch) {
        batch = await QrBatch.create(
          {
            batch_number: 'BATCH-GLOBO-001',
            total_qrs: 5000,
            type: 'GLOBO_PTI_TRANSFORM',
            created_by: operator_id || roll.operator_id || 1,
          },
          { transaction: t }
        );
      }

      const duplicateQr = await QrCode.findOne({ where: { qr_code: newQrCodeString }, transaction: t, lock: t.LOCK.UPDATE });
      if (duplicateQr) throw Object.assign(new Error(`El QR ${newQrCodeString} ya existe; se bloqueó la transformación para evitar reutilizarlo.`), { statusCode: 409, code: 'QR_ALREADY_ASSIGNED' });
      const qrRecord = await QrCode.create(
          {
            serial: Date.now() + Math.floor(Math.random() * 100000),
            qr_code: newQrCodeString,
            batch_id: batch.id,
            purpose: 'TRANSFORMED_GLOBO_PTI',
            assigned_area_id: 5,
            status: 'ACTIVE',
            created_by: operator_id || roll.operator_id || 1,
            is_active: true,
          },
          { transaction: t }
        );

      // 4. Determinar siguiente estación oficial
      const route = Array.isArray(roll.route) && roll.route.length > 0 ? roll.route : ['TELARES', 'GLOBO', 'CORTE'];
      const globoIdx = route.indexOf('GLOBO');
      const nextStage = globoIdx >= 0 && globoIdx + 1 < route.length ? route[globoIdx + 1] : 'CORTE';

      // 5. Actualizar Historial y Rollo
      const history = Array.isArray(roll.stages_history) ? [...roll.stages_history] : [];
      history.push({
        stage: 'GLOBO',
        action: 'TRANSFORMADO',
        previous_qr: roll.qr_code,
        new_qr_code: newQrCodeString,
        specification_id: spec.id,
        specification_code: spec.code,
        meters_in: Number(roll.meters),
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
          current_stage: 'GLOBO',
          next_allowed_stage: nextStage,
          qr_code: newQrCodeString,
          meters: outMeters,
          weight_kg: outWeight,
          calculated_roll_cost: newTransformedCost,
          stages_history: history,
        },
        { transaction: t }
      );

      const previousQr = await QrCode.findOne({ where: { qr_code: history.at(-1)?.previous_qr }, transaction: t, lock: t.LOCK.UPDATE });
      if (previousQr) await previousQr.update({ status: 'TRANSFORMED', is_active: false }, { transaction: t });
      await qrRecord.update({ status: 'ACTIVE', assigned_area_id: 5 }, { transaction: t });

      // 6. Registrar en Kardex de Enrutamiento
      await ViajeroRoutingLog.create(
        {
          viajero_roll_id: roll.id,
          from_stage: 'TELARES',
          to_stage: 'GLOBO',
          area_id: 5,
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

      // 7. Si la siguiente estación es LAMINADO, notificar a sus supervisores
      if (nextStage === 'LAMINADO') {
        {
          const targetRole = await Role.findOne({ where: { code: 'SUPERVISOR_LAMINADO' } });
          const adminRole = await Role.findOne({ where: { code: 'ADMIN_LAMINADO' } });
          const roleIds = [targetRole?.id, adminRole?.id].filter(Boolean);
          if (roleIds.length > 0) {
            const supervisors = await User.findAll({ where: { role_id: { [Op.in]: roleIds }, is_active: true } });
            for (const sup of supervisors) {
              await Notification.create({
                recipient_id: sup.id,
                sender_id: operator_id,
                type: 'INFO',
                title: 'Rollo de Globo Encaminado a Laminado',
                message: `El Rollo ${newQrCodeString} (${outMeters} m, ${outWeight} kg) ha completado Globo y avanza a Laminado.`,
              });
            }
          }
        }
      }

      return {
        success: true,
        roll: {
          id: roll.id,
          roll_code: roll.roll_code,
          qr_code: newQrCodeString,
          meters: outMeters,
          weight_kg: outWeight,
          current_stage: 'GLOBO',
          next_allowed_stage: nextStage,
          route: roll.route,
          calculated_roll_cost: allowCosts ? newTransformedCost : null,
        },
        new_qr_code: newQrCodeString,
        new_transformed_cost: allowCosts ? newTransformedCost : null,
        consumed_materials: consumedMaterialsSummary,
        message: `✔ Rollo transformado exitosamente en GLOBO. Nuevo QR asignado: ${newQrCodeString}`,
      };
    });
  }
}

module.exports = new GloboService();
