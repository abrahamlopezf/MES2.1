'use strict';

const { Op } = require('sequelize');
const { WipInventory, Lote, Material, MaterialUnit } = require('../../database/models');

const requirementsFor = (spec, meters) => {
  const standardMeters = Number(spec.standard_output_meters || 0);
  if (!(standardMeters > 0)) {
    throw Object.assign(new Error(`La especificación ${spec.code} requiere metros estándar mayores a cero.`), { statusCode: 400 });
  }
  const wastePct = Number(spec.standard_waste_percentage || 0);
  if (!Number.isFinite(wastePct) || wastePct < 0 || !Number.isFinite(Number(meters)) || Number(meters) <= 0) {
    throw Object.assign(new Error(`La receta ${spec.code} contiene merma o metros inválidos.`), { statusCode: 400 });
  }
  const aggregated = new Map();
  for (const material of spec.materials || []) {
    if (String(material.unit || 'KG').toUpperCase() !== 'KG') {
      throw Object.assign(new Error(`El material ${material.material_id} debe tener su unidad de receta expresada en KG.`), { statusCode: 400 });
    }
    const quantity = Number(material.quantity || 0);
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw Object.assign(new Error(`La cantidad del material ${material.material_id} en ${spec.code} es inválida.`), { statusCode: 400 });
    }
    const item = aggregated.get(Number(material.material_id)) || {
      material_id: Number(material.material_id),
      name: material.material?.name || 'Insumo',
      internal_code: material.material?.internal_code || 'N/A',
      quantity: 0,
    };
    item.quantity += quantity;
    aggregated.set(item.material_id, item);
  }
  return [...aggregated.values()].sort((left, right) => left.material_id - right.material_id).map((material) => {
    const quantity = material.quantity;
    const requiredKg = Number((quantity * Number(meters) / standardMeters * (1 + wastePct / 100)).toFixed(3));
    return {
      material_id: material.material_id,
      name: material.name,
      internal_code: material.internal_code,
      consumption_per_unit: Number((quantity / standardMeters).toFixed(8)),
      waste_percentage: wastePct,
      required_kg: requiredKg,
    };
  });
};

const compatibility = (spec, roll, area) => {
  const requirements = spec.loom_roll_requirements || {};
  const allowedBomIds = (requirements.allowed_bom_ids || []).map(Number);
  if (!allowedBomIds.length || !allowedBomIds.includes(Number(roll.bom_id))) return false;
  if (area === 'LAMINADO') {
    const acceptedStages = Array.isArray(requirements.accepted_input_stages)
      ? requirements.accepted_input_stages.map((stage) => String(stage).toUpperCase())
      : ['TELARES', ...(requirements.accepts_from_globo === false ? [] : ['GLOBO'])];
    if (!acceptedStages.includes(String(roll.current_stage || '').toUpperCase())) return false;
  }
  const minWidth = Number(requirements.min_width_cm || 0);
  const maxWidth = Number(requirements.max_width_cm || Infinity);
  const width = Number(roll.width_cm || roll.bom?.target_width_cm || 0);
  if (width && (width < minWidth || width > maxWidth)) return false;
  const requiredFabricType = String(requirements.fabric_type || '').toUpperCase();
  if (requiredFabricType && requiredFabricType !== 'CUALQUIERA' && roll.bom?.fabric_type && String(roll.bom.fabric_type).toUpperCase() !== requiredFabricType) return false;
  return true;
};

const validateSpecificationPayload = (payload, area, { partial = false } = {}) => {
  const errors = [];
  const label = area === 'GLOBO' ? 'Globo' : 'Laminado';
  const requiredNumbers = [
    ['target_width_cm', 'El ancho de salida'],
    [area === 'GLOBO' ? 'target_grammage_g_per_m' : 'coating_grammage_g_per_m2', area === 'GLOBO' ? 'El gramaje de salida' : 'El gramaje de recubrimiento'],
    ['expected_output_quantity', 'La cantidad de salida estándar'],
    ['standard_output_meters', 'Los metros de salida estándar'],
  ];

  for (const [field, description] of requiredNumbers) {
    const value = Number(payload[field]);
    if ((!partial || payload[field] !== undefined) && (!Number.isFinite(value) || value <= 0)) errors.push(`${description} debe ser mayor que cero.`);
  }
  const waste = Number(payload.standard_waste_percentage);
  if ((!partial || payload.standard_waste_percentage !== undefined) && (!Number.isFinite(waste) || waste < 0)) errors.push('La merma estándar no puede ser negativa.');
  if ((!partial || payload.code !== undefined) && !String(payload.code || '').trim()) errors.push(`El código de ${label} es obligatorio.`);
  if ((!partial || payload.name !== undefined) && !String(payload.name || '').trim()) errors.push(`El nombre de ${label} es obligatorio.`);
  if ((!partial || payload.output_product_name !== undefined) && !String(payload.output_product_name || '').trim()) errors.push('El nombre del producto de salida es obligatorio.');
  if ((!partial || payload.expected_output_unit !== undefined) && !String(payload.expected_output_unit || '').trim()) errors.push('La unidad de salida estándar es obligatoria.');
  const typeField = area === 'GLOBO' ? 'process_type' : 'lamination_type';
  if ((!partial || payload[typeField] !== undefined) && (!String(payload[typeField] || '').trim() || String(payload[typeField]).trim().length > 50)) errors.push(`Captura un tipo de ${label} válido (máximo 50 caracteres).`);
  if (payload.cost_transformation_index !== undefined && (!Number.isFinite(Number(payload.cost_transformation_index)) || Number(payload.cost_transformation_index) <= 0)) errors.push('El factor de costo debe ser mayor que cero.');

  const input = payload.loom_roll_requirements || {};
  const bomIds = Array.isArray(input.allowed_bom_ids) ? input.allowed_bom_ids : [];
  if ((!partial || payload.loom_roll_requirements !== undefined) && !bomIds.length) errors.push('Selecciona al menos un BOM de entrada compatible.');
  if (bomIds.some((id) => !Number.isInteger(Number(id)) || Number(id) <= 0)) errors.push('La selección de BOM contiene un identificador inválido.');
  const minWidth = Number(input.min_width_cm);
  const maxWidth = Number(input.max_width_cm);
  if ((!partial || payload.loom_roll_requirements !== undefined) && (!Number.isFinite(minWidth) || minWidth <= 0 || !Number.isFinite(maxWidth) || maxWidth <= 0 || minWidth > maxWidth)) {
    errors.push('Define un rango de ancho válido: el mínimo debe ser mayor que cero y no superar el máximo.');
  }
  if ((!partial || payload.loom_roll_requirements !== undefined) && !['TUBULAR', 'PLANA', 'CUALQUIERA'].includes(String(input.fabric_type || '').toUpperCase())) {
    errors.push('Selecciona el tipo de tela compatible con la receta.');
  }
  if (area === 'LAMINADO' && (!Array.isArray(input.accepted_input_stages) || !input.accepted_input_stages.length || input.accepted_input_stages.some((stage) => !['TELARES', 'GLOBO'].includes(String(stage).toUpperCase())))) {
    errors.push('Selecciona si esta receta acepta rollos directos de Telares, de Globo o de ambas etapas.');
  }

  if (Array.isArray(payload.materials)) {
    payload.materials.forEach((material, index) => {
      if (!material.material_id || !Number.isFinite(Number(material.quantity)) || Number(material.quantity) <= 0) {
        errors.push(`Completa el material y la cantidad en KG de la línea ${index + 1}, o elimínala.`);
      } else if (String(material.unit || 'KG').toUpperCase() !== 'KG') {
        errors.push(`La línea ${index + 1} debe expresar el consumo en KG.`);
      }
    });
  }

  if (errors.length) {
    throw Object.assign(new Error(errors.join(' ')), { statusCode: 400, code: 'INVALID_SPECIFICATION', details: errors });
  }
};

const validateRecipeMaterialUnits = async (materials = []) => {
  if (!materials.length) return;
  const ids = [...new Set(materials.map((material) => Number(material.material_id)).filter(Number.isInteger))];
  const rows = await Material.findAll({
    where: { id: { [Op.in]: ids } },
    attributes: ['id', 'base_unit_id', 'status', 'is_active'],
    include: [{ model: MaterialUnit, as: 'base_unit', attributes: ['code', 'name'], required: false }],
  });
  const byId = new Map(rows.map((row) => [Number(row.id), row]));
  for (const id of ids) {
    const material = byId.get(id);
    if (!material || material.status !== 'ACTIVE' || material.is_active === false) {
      throw Object.assign(new Error(`El material ${id} no existe o no está activo en el catálogo.`), { statusCode: 400, code: 'INVALID_RECIPE_MATERIAL' });
    }
    const unitCode = String(material.base_unit?.code || '').toUpperCase();
    const unitName = String(material.base_unit?.name || '').toUpperCase();
    if (unitCode !== 'KG' && !['KILOGRAMO', 'KILOGRAMOS'].includes(unitName)) {
      throw Object.assign(new Error(`El material ${material.name || id} no tiene unidad base en KG. La receta/WIP de esta área solo opera en kilogramos.`), { statusCode: 400, code: 'RECIPE_UNIT_UNSUPPORTED' });
    }
  }
};

const assessWip = async ({ spec, meters, areaId }) => {
  const requirements = requirementsFor(spec, meters);
  const materials = [];
  for (const requirement of requirements) {
    const rows = await WipInventory.findAll({
      where: { area_id: areaId, material_id: requirement.material_id, amount: { [Op.gt]: 0 } },
    });
    const available = Number(rows.reduce((sum, row) => sum + Number(row.amount), 0).toFixed(3));
    const missing = Number(Math.max(0, requirement.required_kg - available).toFixed(3));
    materials.push({
      ...requirement,
      available_wip_kg: available,
      missing_kg: missing,
      is_sufficient: missing <= 0.001,
      status: missing <= 0.001 ? 'SUFICIENTE' : 'FALTANTE',
    });
  }
  const missingMaterials = materials.filter((material) => !material.is_sufficient);
  return {
    materials,
    all_materials_sufficient: missingMaterials.length === 0,
    missing_materials: missingMaterials,
    total_missing_kg: Number(missingMaterials.reduce((sum, material) => sum + material.missing_kg, 0).toFixed(3)),
  };
};

const consumeWip = async ({ spec, meters, areaId, transaction }) => {
  const requirements = requirementsFor(spec, meters);
  const lockedRowsByMaterial = new Map();

  // Lock every required material first, then check the full recipe before changing balances.
  for (const requirement of requirements) {
    const rows = await WipInventory.findAll({
      where: { area_id: areaId, material_id: requirement.material_id, amount: { [Op.gt]: 0 } },
      include: [{ model: Lote, as: 'lote' }],
      order: [['created_at', 'ASC'], ['id', 'ASC']],
      transaction,
      lock: { level: transaction.LOCK.UPDATE, of: WipInventory },
    });
    const available = Number(rows.reduce((sum, row) => sum + Number(row.amount), 0).toFixed(3));
    if (available + 0.001 < requirement.required_kg) {
      throw Object.assign(new Error(`WIP insuficiente para ${requirement.name}: requiere ${requirement.required_kg} kg y hay ${available} kg.`), {
        statusCode: 409,
        code: 'WIP_INSUFFICIENT',
        details: { material_id: requirement.material_id, required_kg: requirement.required_kg, available_wip_kg: available, missing_kg: Number((requirement.required_kg - available).toFixed(3)) },
      });
    }
    lockedRowsByMaterial.set(requirement.material_id, rows);
  }

  const consumed = [];
  let materialCost = 0;
  for (const requirement of requirements) {
    let remaining = requirement.required_kg;
    let lineCost = 0;
    for (const row of lockedRowsByMaterial.get(requirement.material_id) || []) {
      if (remaining <= 0.001) break;
      const take = Number(Math.min(Number(row.amount), remaining).toFixed(3));
      row.amount = Number((Number(row.amount) - take).toFixed(3));
      await row.save({ transaction });
      const unitCost = Number(row.lote?.unit_cost || 0);
      lineCost += take * unitCost;
      remaining = Number((remaining - take).toFixed(3));
    }
    materialCost += lineCost;
    consumed.push({
      material_id: requirement.material_id,
      name: requirement.name,
      consumed_kg: requirement.required_kg,
      remaining_needed_kg: 0,
      material_cost: Number(lineCost.toFixed(4)),
    });
  }
  return { consumed, materialCost: Number(materialCost.toFixed(4)) };
};

module.exports = { requirementsFor, compatibility, validateSpecificationPayload, validateRecipeMaterialUnits, assessWip, consumeWip };
