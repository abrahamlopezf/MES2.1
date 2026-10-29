'use strict';

const { randomUUID } = require('crypto');
const catalog = require('../seed-data/extrusion-formula-catalog.json');
const seededRecordsTable = '_20261028190000_seeded_records';

const softDeleteCatalogs = new Set([
  'material_families',
  'material_codes',
  'material_types',
  'material_brands',
]);

async function selectOne(sequelize, sql, replacements, transaction) {
  const [rows] = await sequelize.query(sql, { replacements, transaction });
  return rows[0] || null;
}

async function lookupId(sequelize, table, column, value, transaction) {
  if (!value) return null;
  // Identifiers are constants at the call sites; values always use replacements.
  const softDeleteClause = softDeleteCatalogs.has(table) ? ' AND deleted_at IS NULL' : '';
  const row = await selectOne(
    sequelize,
    `SELECT id FROM ${table} WHERE ${column} = :value${softDeleteClause} LIMIT 1;`,
    { value },
    transaction
  );
  return row?.id ?? null;
}

async function getOrCreateFormulaMaterial(sequelize, source, transaction) {
  const existing = await selectOne(
    sequelize,
    'SELECT id FROM materials WHERE internal_code = :code AND deleted_at IS NULL LIMIT 1;',
    { code: source.internal_code },
    transaction
  );
  if (existing) return { id: existing.id, created: false };

  const familyId = await lookupId(sequelize, 'material_families', 'code', source.family_code, transaction);
  const materialCodeId = await lookupId(sequelize, 'material_codes', 'code', source.material_code, transaction);
  const typeId = await lookupId(sequelize, 'material_types', 'code', source.type_code, transaction);
  const brandId = await lookupId(sequelize, 'material_brands', 'code', source.brand_code, transaction);
  const baseUnitId = await lookupId(sequelize, 'material_units', 'code', source.base_unit_code, transaction);
  const stockUnitId = await lookupId(sequelize, 'material_units', 'code', source.stock_unit_code, transaction);

  const missing = [
    !familyId && `familia ${source.family_code}`,
    !materialCodeId && `código de material ${source.material_code}`,
    source.type_code && !typeId && `tipo ${source.type_code}`,
    source.brand_code && !brandId && `marca ${source.brand_code}`,
    source.base_unit_code && !baseUnitId && `unidad ${source.base_unit_code}`,
    source.stock_unit_code && !stockUnitId && `unidad de stock ${source.stock_unit_code}`,
  ].filter(Boolean);
  if (missing.length) {
    throw new Error(`No se puede importar ${source.internal_code}: faltan catálogos ${missing.join(', ')}.`);
  }

  const [nextRows] = await sequelize.query(`
    SELECT COALESCE(MAX(CASE WHEN internal_consecutive ~ '^[0-9]+$'
      THEN internal_consecutive::INTEGER ELSE 0 END), 0)::INTEGER AS max_consecutive
    FROM materials
    WHERE family_id = :familyId AND material_code_id = :materialCodeId AND deleted_at IS NULL;
  `, { replacements: { familyId, materialCodeId }, transaction });
  const sourceConsecutive = Number.parseInt(source.internal_consecutive, 10) || 0;
  const consecutive = String(Math.max(sourceConsecutive, Number(nextRows[0].max_consecutive) + 1)).padStart(3, '0');

  const [inserted] = await sequelize.query(`
    INSERT INTO materials (
      uuid, family_id, material_code_id, internal_consecutive, internal_code,
      name, description, brand_id, type_id, base_unit_id, stock_unit_id,
      traceability_level, minimum_stock, maximum_stock, reorder_point,
      status, version, is_active, created_at, updated_at
    ) VALUES (
      :uuid, :familyId, :materialCodeId, :consecutive, :internalCode,
      :name, :description, :brandId, :typeId, :baseUnitId, :stockUnitId,
      :traceabilityLevel, :minimumStock, :maximumStock, :reorderPoint,
      :status, :version, :isActive, NOW(), NOW()
    ) RETURNING id;
  `, {
    replacements: {
      uuid: randomUUID(), familyId, materialCodeId, consecutive,
      internalCode: source.internal_code, name: source.name,
      description: source.description, brandId, typeId, baseUnitId, stockUnitId,
      traceabilityLevel: source.traceability_level || 'NONE',
      minimumStock: source.minimum_stock ?? 0,
      maximumStock: source.maximum_stock,
      reorderPoint: source.reorder_point ?? 0,
      status: source.status || 'ACTIVE', version: source.version || 1,
      isActive: source.is_active !== false,
    },
    transaction,
  });
  return { id: inserted[0].id, created: true };
}

async function recordSeeded(sequelize, recordType, code, id, transaction) {
  await sequelize.query(`
    INSERT INTO ${seededRecordsTable} (record_type, record_code, record_id)
    VALUES (:recordType, :code, :id)
    ON CONFLICT (record_type, record_code) DO NOTHING;
  `, { replacements: { recordType, code, id }, transaction });
}

async function insertIfEmpty(sequelize, table, foreignKey, foreignId, expectedCount, insertRows, transaction, code) {
  const existing = await selectOne(
    sequelize,
    `SELECT COUNT(*)::INTEGER AS count FROM ${table} WHERE ${foreignKey} = :id;`,
    { id: foreignId },
    transaction
  );
  const count = Number(existing.count);
  if (count === expectedCount) return;
  if (count !== 0) {
    throw new Error(`${code} ya tiene ${count} renglones de detalle; se esperaban ${expectedCount}. No se sobrescribieron datos existentes.`);
  }
  for (const row of insertRows) await row();
}

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS ${seededRecordsTable} (
          record_type VARCHAR(30) NOT NULL,
          record_code VARCHAR(100) NOT NULL,
          record_id INTEGER NOT NULL,
          PRIMARY KEY (record_type, record_code)
        );
      `, { transaction });

      const materialIdByCode = new Map();
      for (const material of catalog.materials) {
        const result = await getOrCreateFormulaMaterial(sequelize, material, transaction);
        materialIdByCode.set(material.internal_code, result.id);
      }

      const extrusionArea = await selectOne(
        sequelize,
        "SELECT id FROM areas WHERE code = 'EXTRUSION' AND is_active = TRUE LIMIT 1;",
        {},
        transaction
      );
      if (!extrusionArea) throw new Error('No existe el área EXTRUSION requerida por las fórmulas.');

      const formulaIdByCode = new Map();
      const processFormulaIdByCode = new Map();
      for (const formula of catalog.formulas) {
        let formulaRow = await selectOne(
          sequelize,
          'SELECT id FROM formulas WHERE code = :code LIMIT 1;',
          { code: formula.code },
          transaction
        );
        if (!formulaRow) {
          formulaRow = await selectOne(sequelize, `
            INSERT INTO formulas (
              code, name, description, batch_size_kg, expected_yield_pieces,
              expected_yield_kg, allowed_extruders, restricted_extruders,
              is_active, cost_index, extruder_assignment_mode, created_at, updated_at
            ) VALUES (
              :code, :name, :description, :batchSize, :yieldPieces,
              :yieldKg, CAST(:allowedExtruders AS JSON), CAST(:restrictedExtruders AS JSON),
              :isActive, :costIndex, :assignmentMode, NOW(), NOW()
            ) RETURNING id;
          `, {
            code: formula.code,
            name: formula.name,
            description: formula.description,
            batchSize: formula.batch_size_kg,
            yieldPieces: formula.expected_yield_pieces,
            yieldKg: formula.expected_yield_kg,
            allowedExtruders: JSON.stringify(formula.allowed_extruders || []),
            restrictedExtruders: JSON.stringify(formula.restricted_extruders || []),
            isActive: formula.is_active,
            costIndex: formula.cost_index,
            assignmentMode: formula.extruder_assignment_mode,
          }, transaction);
          await recordSeeded(sequelize, 'formula', formula.code, formulaRow.id, transaction);
        }
        formulaIdByCode.set(formula.code, formulaRow.id);

        const processFormula = formula.process_formula;
        let processRow = await selectOne(
          sequelize,
          'SELECT id FROM process_formulas WHERE code = :code LIMIT 1;',
          { code: formula.code },
          transaction
        );
        if (!processRow) {
          processRow = await selectOne(sequelize, `
            INSERT INTO process_formulas (
              code, name, description, target_area_id, version, status,
              is_active, created_at, updated_at
            ) VALUES (
              :code, :name, :description, :areaId, :version, :status,
              :isActive, NOW(), NOW()
            ) RETURNING id;
          `, {
            code: formula.code,
            name: formula.name,
            description: processFormula.description || formula.description,
            areaId: extrusionArea.id,
            version: processFormula.version || 1,
            status: processFormula.status || 'ACTIVA',
            isActive: processFormula.is_active !== false,
          }, transaction);
          await recordSeeded(sequelize, 'process_formula', formula.code, processRow.id, transaction);
        }
        processFormulaIdByCode.set(formula.code, processRow.id);
      }

      for (const formula of catalog.formulas) {
        const formulaId = formulaIdByCode.get(formula.code);
        const processFormulaId = processFormulaIdByCode.get(formula.code);
        await insertIfEmpty(
          sequelize,
          'formula_ingredients',
          'formula_id',
          formulaId,
          formula.ingredients.length,
          formula.ingredients.map((ingredient) => async () => {
            const materialId = materialIdByCode.get(ingredient.internal_code);
            if (!materialId) throw new Error(`Falta el material ${ingredient.internal_code} para ${formula.code}.`);
            await sequelize.query(`
              INSERT INTO formula_ingredients (
                formula_id, material_id, quantity, percentage, unit,
                is_restricted_on_machine_4, restricted_machine_ids, created_at, updated_at
              ) VALUES (
                :formulaId, :materialId, :quantity, :percentage, :unit,
                :restricted, CAST(:restrictedMachines AS JSON), NOW(), NOW()
              );
            `, {
              replacements: {
                formulaId, materialId, quantity: ingredient.quantity,
                percentage: ingredient.percentage, unit: ingredient.unit,
                restricted: ingredient.is_restricted_on_machine_4,
                restrictedMachines: JSON.stringify(ingredient.restricted_machine_ids || []),
              },
              transaction,
            });
          }),
          transaction,
          formula.code
        );

        const items = formula.process_formula.items;
        await insertIfEmpty(
          sequelize,
          'process_formula_items',
          'formula_id',
          processFormulaId,
          items.length,
          items.map((item) => async () => {
            const materialId = materialIdByCode.get(item.internal_code);
            if (!materialId) throw new Error(`Falta el material ${item.internal_code} para el proceso ${formula.code}.`);
            await sequelize.query(`
              INSERT INTO process_formula_items (
                formula_id, material_id, material_role, calculation_type,
                quantity, percentage, unit, tolerance_min, tolerance_max,
                sort_order, is_required, created_at, updated_at
              ) VALUES (
                :formulaId, :materialId, :materialRole, :calculationType,
                :quantity, :percentage, :unit, :toleranceMin, :toleranceMax,
                :sortOrder, :isRequired, NOW(), NOW()
              );
            `, {
              replacements: {
                formulaId: processFormulaId, materialId,
                materialRole: item.material_role,
                calculationType: item.calculation_type,
                quantity: item.quantity, percentage: item.percentage,
                unit: item.unit, toleranceMin: item.tolerance_min,
                toleranceMax: item.tolerance_max, sortOrder: item.sort_order,
                isRequired: item.is_required,
              },
              transaction,
            });
          }),
          transaction,
          formula.code
        );
      }

      const polypropyleneTag = await selectOne(sequelize, `
        SELECT id FROM tags
        WHERE deleted_at IS NULL AND is_active = TRUE AND upper(trim(name)) = 'POLIPROPILENO'
        ORDER BY id LIMIT 1;
      `, {}, transaction);
      if (!polypropyleneTag) throw new Error('No existe la etiqueta POLIPROPILENO creada por la migración de silos.');

      const polypropyleneIds = catalog.materials
        .filter((material) => material.name.toUpperCase().startsWith('POLIPROPILENO'))
        .map((material) => materialIdByCode.get(material.internal_code));
      if (polypropyleneIds.length) {
        for (const materialId of polypropyleneIds) {
          await sequelize.query(`
            INSERT INTO material_tags (material_id, tag_id)
            VALUES (:materialId, :tagId)
            ON CONFLICT (material_id, tag_id) DO NOTHING;
          `, { replacements: { materialId, tagId: polypropyleneTag.id }, transaction });
        }
      }
    });
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;
    await sequelize.transaction(async (transaction) => {
      const [createdProcessRows] = await sequelize.query(`
        SELECT record_id AS id FROM ${seededRecordsTable} WHERE record_type = 'process_formula';
      `, { transaction });
      const [createdFormulaRows] = await sequelize.query(`
        SELECT record_id AS id FROM ${seededRecordsTable} WHERE record_type = 'formula';
      `, { transaction });
      const processIds = createdProcessRows.map((row) => row.id);
      const formulaIds = createdFormulaRows.map((row) => row.id);
      if (processIds.length) {
        await sequelize.query('DELETE FROM process_formula_items WHERE formula_id IN (:ids);', {
          replacements: { ids: processIds }, transaction,
        });
        await sequelize.query('DELETE FROM process_formulas WHERE id IN (:ids);', {
          replacements: { ids: processIds }, transaction,
        });
      }
      if (formulaIds.length) {
        await sequelize.query('DELETE FROM formula_ingredients WHERE formula_id IN (:ids);', {
          replacements: { ids: formulaIds }, transaction,
        });
        await sequelize.query('DELETE FROM formulas WHERE id IN (:ids);', {
          replacements: { ids: formulaIds }, transaction,
        });
      }
      await sequelize.query(`DROP TABLE IF EXISTS ${seededRecordsTable};`, { transaction });
      // Material master rows and polypropylene tags are intentionally retained:
      // they are catalog data, independent from the recipe records.
    });
  },
};
