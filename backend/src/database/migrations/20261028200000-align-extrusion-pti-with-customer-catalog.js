'use strict';

const catalog = [
  [1, 'Rafia', 'Blanco, Amarillo, Verde, Azul, Naranja, Rojo, Negro', 4600, 28, 12],
  [1, 'Rafia', 'Blanco, Azul', 3000, 28, 12],
  [1, 'Rafia', 'Negro', 5190, 23, 14],
  [2, 'Trama', 'Blanco', 2000, 94, 5],
  [2, 'Trama', 'Blanco', 1800, 94, 5],
  [2, 'Trama', 'Verde óptico', 2200, 94, 5],
  [2, 'Trama', 'Blanco, Antiestático', 2000, 94, 5],
  [2, 'Trama', 'Rojo', 2200, 94, 5],
  [2, 'Trama - Urdimbre', 'Blanco', 1200, 140, 3],
  [2, 'Trama - Urdimbre', 'Amarillo antiestático', 1200, 140, 3],
  [2, 'Trama - Urdimbre', 'Verde óptico y negro', 1200, 140, 3],
  [2, 'Urdimbre', 'Blanco', 2300, 140, 3],
  [2, 'Urdimbre', 'Rojo', 2300, 140, 3],
  [2, 'Urdimbre', 'Negro', 2300, 140, 3],
  [4, 'Urdimbre', 'Blanco, Natural', 1800, 146, 2.5],
  [4, 'Urdimbre', 'Blanco', 2100, 146, 2.5],
  [4, 'Urdimbre', 'Blanco, Verde Óptico', 2300, 146, 2.5],
  [4, 'Urdimbre', 'Rojo, Negro, Azul,Verde, Morado', 2300, 117, 3.0],
  [5, 'Trama', 'Blanco', 1800, 106, 5.0],
  [5, 'Trama', 'Blanco', 2000, 106, 5.0],
  [5, 'Trama', 'Blanco', 2300, 106, 5.0],
  [5, 'Trama', 'Verde Óptico', 2000, 106, 5.0],
  [5, 'Trama', 'Rojo', 2300, 106, 5.0],
].map(([machine, tapeType, color, denier, tapeCount, width], index) => ({
  code: `PTI-CINTA-${String(index + 1).padStart(3, '0')}`,
  name: `${tapeType} ${denier}D ${width} mm - ${color}`,
  machine,
  tapeType,
  color,
  denier,
  tapeCount,
  width,
}));

// Solo relaciones con coincidencia identificable de máquina, tipo y color.
// Las variantes sin fórmula inequívoca permanecen activas, pero sin enlace.
const formulaLinks = [
  ['PTI-CINTA-001', 'F-EXT-1-NARANJA'],
  ['PTI-CINTA-002', 'F-EXT-1-AZUL'],
  ['PTI-CINTA-003', 'F-EXT-1-NEGRO'],
  ['PTI-CINTA-004', 'F-EXT-2-BLANCA'],
  ['PTI-CINTA-006', 'F-EXT-VERDE-OPT'],
  ['PTI-CINTA-008', 'F-EXT-ROJO'],
  ['PTI-CINTA-010', 'F-EXT-AMARILLO-ANTI'],
  ['PTI-CINTA-014', 'F-EXT-NEGRO'],
  ['PTI-CINTA-015', 'F-EXT-NATURAL'],
  ['PTI-CINTA-016', 'F-EXT-4-BLANCA'],
  ['PTI-CINTA-018', 'F-EXT-MORADO'],
  ['PTI-CINTA-019', 'F-EXT-5-BLANCA'],
];

const clientCodes = catalog.map((item) => item.code);
const formulaCodes = [...new Set(formulaLinks.map(([, formulaCode]) => formulaCode))];
const backupTable = '_20261028200000_pti_catalog_backup';
const cleanupBackupTable = '_20261028200000_pti_cleanup_backup';
const legacyCodes = ['PTI-RAF-AMARILLA-01', 'PTI-RAF-BLANCA-01', 'PTI-CINT-NEGRO-01'];

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    await sequelize.transaction(async (transaction) => {
      const [existingProducts] = await sequelize.query(
        'SELECT code FROM pti_products WHERE code IN (:codes);',
        { replacements: { codes: clientCodes }, transaction }
      );
      const existingProductCodes = new Set(existingProducts.map((row) => row.code));
      const missingProducts = clientCodes.filter((code) => !existingProductCodes.has(code));
      if (missingProducts.length) {
        throw new Error(`Faltan PTI del catálogo oficial del cliente: ${missingProducts.join(', ')}. Verifica que la migración del catálogo de cintas se haya ejecutado.`);
      }

      const [existingFormulas] = await sequelize.query(
        'SELECT id, code FROM formulas WHERE code IN (:codes);',
        { replacements: { codes: formulaCodes }, transaction }
      );
      const formulaIdByCode = new Map(existingFormulas.map((formula) => [formula.code, formula.id]));
      const missingFormulas = formulaCodes.filter((code) => !formulaIdByCode.has(code));
      if (missingFormulas.length) {
        throw new Error(`No se pudo completar el enlace del catálogo PTI: faltan fórmulas ${missingFormulas.join(', ')}.`);
      }

      const mappedFormulaIds = [...formulaIdByCode.values()];

      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS ${backupTable} (
          pti_product_id INTEGER PRIMARY KEY,
          row_data JSONB NOT NULL
        );
      `, { transaction });
      await sequelize.query(`
        INSERT INTO ${backupTable} (pti_product_id, row_data)
        SELECT id, to_jsonb(pti_products) FROM pti_products
        ON CONFLICT (pti_product_id) DO NOTHING;
      `, { transaction });
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS ${cleanupBackupTable} (
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          row_data JSONB NOT NULL,
          PRIMARY KEY (table_name, record_id)
        );
      `, { transaction });
      const backupRows = [
        ['pti_racks', `SELECT r.* FROM pti_racks r WHERE r.rack_code LIKE 'DEMO-EXT-RACK-%' OR r.current_pti_product_id IN (SELECT id FROM pti_products WHERE code LIKE 'DEMO-EXT-%')`],
        ['extrusion_production_entries', `SELECT e.* FROM extrusion_production_entries e WHERE e.pti_product_id IN (SELECT id FROM pti_products WHERE code LIKE 'DEMO-EXT-%') OR e.rack_id IN (SELECT id FROM pti_racks WHERE rack_code LIKE 'DEMO-EXT-RACK-%')`],
        ['extruder_queues', `SELECT q.* FROM extruder_queues q WHERE q.formula_id IN (SELECT formula_id FROM pti_products WHERE code LIKE 'DEMO-EXT-%' AND formula_id IS NOT NULL)`],
        ['process_preparations', `SELECT pp.* FROM process_preparations pp WHERE pp.formula_id IN (SELECT formula_id FROM pti_products WHERE code LIKE 'DEMO-EXT-%' AND formula_id IS NOT NULL)`],
        ['qr_codes', `SELECT q.* FROM qr_codes q WHERE q.id IN (SELECT pp.destination_qr_code_id FROM process_preparations pp WHERE pp.formula_id IN (SELECT formula_id FROM pti_products WHERE code LIKE 'DEMO-EXT-%' AND formula_id IS NOT NULL)) OR q.qr_code IN (SELECT r.qr_code FROM pti_racks r WHERE r.rack_code LIKE 'DEMO-EXT-RACK-%')`],
      ];
      for (const [tableName, selectSql] of backupRows) {
        await sequelize.query(`
          INSERT INTO ${cleanupBackupTable} (table_name, record_id, row_data)
          SELECT :tableName, records.id::TEXT, to_jsonb(records) FROM (${selectSql}) records
          ON CONFLICT (table_name, record_id) DO NOTHING;
        `, { replacements: { tableName }, transaction });
      }

      // Purga exclusivamente las pruebas sintéticas identificadas DEMO-EXT.
      // Conserva QRs y preparaciones como auditoría, pero cancela su uso futuro.
      await sequelize.query(`
        UPDATE extruder_queues q SET status = 'CANCELADA', updated_at = NOW()
        FROM pti_products p
        WHERE p.formula_id = q.formula_id AND p.code LIKE 'DEMO-EXT-%'
          AND q.status IN ('ACTIVA', 'EN_ESPERA', 'PAUSADA');
      `, { transaction });
      await sequelize.query(`
        UPDATE process_preparations pp
        SET status = 'CANCELADA',
            notes = CONCAT_WS(E'\\n', NULLIF(pp.notes, ''), 'Cancelada durante limpieza de datos sintéticos DEMO de Extrusión.'),
            updated_at = NOW()
        WHERE pp.formula_id IN (
          SELECT formula_id FROM pti_products WHERE code LIKE 'DEMO-EXT-%' AND formula_id IS NOT NULL
        );
      `, { transaction });
      await sequelize.query(`
        UPDATE qr_codes q SET is_active = FALSE,
          cancel_reason = COALESCE(q.cancel_reason, 'QR sintético DEMO retirado del catálogo de Extrusión.')
        WHERE q.id IN (
          SELECT pp.destination_qr_code_id FROM process_preparations pp
          WHERE pp.formula_id IN (SELECT formula_id FROM pti_products WHERE code LIKE 'DEMO-EXT-%')
            AND pp.destination_qr_code_id IS NOT NULL
        ) OR q.qr_code IN (
          SELECT r.qr_code FROM pti_racks r WHERE r.rack_code LIKE 'DEMO-EXT-RACK-%'
        );
      `, { transaction });
      await sequelize.query(`
        DELETE FROM extrusion_production_entries e
        WHERE e.pti_product_id IN (SELECT id FROM pti_products WHERE code LIKE 'DEMO-EXT-%')
           OR e.rack_id IN (SELECT id FROM pti_racks WHERE rack_code LIKE 'DEMO-EXT-RACK-%');
      `, { transaction });
      await sequelize.query(`
        UPDATE pti_racks SET current_pti_product_id = NULL, current_pti_type_id = NULL,
          current_quantity = 0, status = 'VACIO', unit_price = 0, unit_cost_per_kg = NULL,
          unit_weight_kg = NULL, updated_at = NOW()
        WHERE current_pti_product_id IN (SELECT id FROM pti_products WHERE code LIKE 'DEMO-EXT-%')
          AND rack_code NOT LIKE 'DEMO-EXT-RACK-%';
      `, { transaction });
      await sequelize.query(`DELETE FROM pti_racks WHERE rack_code LIKE 'DEMO-EXT-RACK-%';`, { transaction });
      const [pendingQueues] = await sequelize.query(`
        SELECT DISTINCT q.id, q.status, f.code AS formula_code, p.code AS current_pti_code
        FROM extruder_queues q
        JOIN formulas f ON f.id = q.formula_id
        LEFT JOIN pti_products p ON p.formula_id = f.id
        WHERE f.code IN (:formulaCodes)
          AND q.status IN ('ACTIVA', 'EN_ESPERA', 'PAUSADA');
      `, { replacements: { formulaCodes }, transaction });
      const targetPtiByFormula = new Map(formulaLinks.map(([ptiCode, formulaCode]) => [formulaCode, ptiCode]));
      const conflictingQueues = pendingQueues.filter((queue) =>
        queue.current_pti_code !== targetPtiByFormula.get(queue.formula_code)
      );
      if (conflictingQueues.length) {
        const details = conflictingQueues.map((queue) => `${queue.formula_code} (${queue.status}, cola ${queue.id})`).join('; ');
        throw new Error(`No se puede cambiar el enlace PTI mientras hay mezclas activas o pausadas que usan esas fórmulas: ${details}. Termina o cancela esas mezclas y vuelve a ejecutar la migración.`);
      }

      // Conserva cualquier PTI ajeno que aún tenga una referencia operativa o
      // histórica, y elimina los que ya no se usan. No borra registros hijos.
      const [foreignKeys] = await sequelize.query(`
        SELECT DISTINCT tc.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.constraint_schema = kcu.constraint_schema
         AND tc.table_name = kcu.table_name
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
         AND ccu.constraint_schema = tc.constraint_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND ccu.table_schema = 'public'
          AND ccu.table_name = 'pti_products'
          AND ccu.column_name = 'id';
      `, { transaction });
      const quoteIdentifier = (identifier) => `"${String(identifier).replace(/"/g, '""')}"`;
      const referencedProductIds = new Set();
      for (const foreignKey of foreignKeys) {
        const table = quoteIdentifier(foreignKey.table_name);
        const column = quoteIdentifier(foreignKey.column_name);
        const [referenced] = await sequelize.query(`
          SELECT DISTINCT pti.id
          FROM pti_products pti
          WHERE pti.code NOT IN (:clientCodes, :legacyCodes)
            AND EXISTS (
              SELECT 1 FROM ${table} child
              WHERE child.${column} = pti.id
            );
        `, { replacements: { clientCodes, legacyCodes }, transaction });
        referenced.forEach((row) => referencedProductIds.add(Number(row.id)));
      }

      if (referencedProductIds.size) {
        await sequelize.query(`
          UPDATE pti_products
          SET is_active = FALSE, updated_at = NOW()
          WHERE code NOT IN (:clientCodes, :legacyCodes)
            AND id IN (:referencedIds)
            AND is_active IS DISTINCT FROM FALSE;
        `, { replacements: { clientCodes, legacyCodes, referencedIds: [...referencedProductIds] }, transaction });
        await sequelize.query(`
          DELETE FROM pti_products
          WHERE code NOT IN (:clientCodes, :legacyCodes)
            AND id NOT IN (:referencedIds);
        `, { replacements: { clientCodes, legacyCodes, referencedIds: [...referencedProductIds] }, transaction });
      } else {
        await sequelize.query(`
          DELETE FROM pti_products WHERE code NOT IN (:clientCodes) AND code NOT IN (:legacyCodes);
        `, { replacements: { clientCodes, legacyCodes }, transaction });
      }

      await sequelize.query(`
        UPDATE pti_products SET is_active = FALSE, formula_id = NULL, updated_at = NOW()
        WHERE code IN (:legacyCodes);
      `, { replacements: { legacyCodes }, transaction });

      // Libera las relaciones antiguas para asignar exclusivamente los pares
      // verificados del catálogo oficial, respetando el índice 1:1.
      await sequelize.query(`
        UPDATE pti_products
        SET formula_id = NULL, updated_at = NOW()
        WHERE code IN (:clientCodes)
           OR formula_id IN (:formulaIds);
      `, { replacements: { clientCodes, formulaIds: mappedFormulaIds }, transaction });

      for (const item of catalog) {
        await sequelize.query(`
          UPDATE pti_products
          SET name = :name,
              extrusion_machine_number = :machine,
              tape_type = :tapeType,
              color = :color,
              denier = :denier,
              tape_count = :tapeCount,
              tape_count_tolerance = 10,
              tape_width_mm = :width,
              updated_at = NOW()
          WHERE code = :code;
        `, { replacements: item, transaction });
      }

      for (const [ptiCode, formulaCode] of formulaLinks) {
        await sequelize.query(`
          UPDATE pti_products p
          SET formula_id = f.id, updated_at = NOW()
          FROM formulas f
          WHERE p.code = :ptiCode AND f.code = :formulaCode;
        `, { replacements: { ptiCode, formulaCode }, transaction });
      }
    });
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;
    await sequelize.transaction(async (transaction) => {
      await sequelize.query('DROP INDEX IF EXISTS uq_pti_products_formula_id;', { transaction });
      await sequelize.query(`
        INSERT INTO pti_products
        SELECT (jsonb_populate_record(NULL::pti_products, backup.row_data)).*
        FROM ${backupTable} backup
        WHERE NOT EXISTS (
          SELECT 1 FROM pti_products current_pti WHERE current_pti.id = backup.pti_product_id
        );
      `, { transaction });
      await sequelize.query(`
        UPDATE pti_products p
        SET is_active = (backup.row_data->>'is_active')::BOOLEAN,
            formula_id = NULLIF(backup.row_data->>'formula_id', '')::INTEGER,
            updated_at = NOW()
        FROM ${backupTable} backup
        WHERE p.id = backup.pti_product_id;
      `, { transaction });
      for (const tableName of ['pti_racks', 'qr_codes', 'process_preparations', 'extrusion_production_entries', 'extruder_queues']) {
        const [columns] = await sequelize.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = :tableName ORDER BY ordinal_position;
        `, { replacements: { tableName }, transaction });
        const names = columns.map((column) => `"${column.column_name.replace(/"/g, '""')}"`);
        const updates = names.filter((name) => name !== '"id"').map((name) => `${name} = EXCLUDED.${name}`).join(', ');
        await sequelize.query(`
          INSERT INTO "${tableName}" (${names.join(', ')})
          SELECT ${names.map((name) => `(jsonb_populate_record(NULL::"${tableName}", b.row_data)).${name}`).join(', ')}
          FROM ${cleanupBackupTable} b WHERE b.table_name = :tableName
          ON CONFLICT (id) DO UPDATE SET ${updates};
        `, { replacements: { tableName }, transaction });
      }
      await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_pti_products_formula_id
        ON pti_products (formula_id)
        WHERE formula_id IS NOT NULL;`, { transaction });
    });
  },
};
