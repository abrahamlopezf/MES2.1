'use strict';

/**
 * Calculador Determinista de Huellas SHA-256 de Master Data y Clasificador de Tablas — TraceFlow MES
 *
 * Calcula un hash SHA-256 determinista por cada una de las 30 tablas de Master Data y Configuración
 * Industrial del cliente, excluyendo columnas operativas mutables (saldos en vivo, estados de máquina,
 * timestamps de actualización operativa) para distinguir atributos maestros inmutables de movimientos
 * legítimos de producción/inventario.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { assertLocalDatabaseOnly } = require('../config/dbGuard');

// Definición de las 30 tablas de Master Data y Configuración con sus columnas inmutables protegidas
const MASTER_DATA_TABLES = [
  { table: 'areas', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'code', 'name', 'is_active'] },
  { table: 'subareas', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'area_id', 'code', 'name', 'is_active'] },
  { table: 'roles', category: 'CONFIGURATION', orderBy: 'id', immutableCols: ['id', 'code', 'name', 'area_id', 'subarea_id', 'is_active'] },
  { table: 'permissions', category: 'CONFIGURATION', orderBy: 'id', immutableCols: ['id', 'code', 'name', 'module'] },
  { table: 'role_permissions', category: 'CONFIGURATION', orderBy: 'role_id, permission_id', immutableCols: ['role_id', 'permission_id'] },
  { table: 'rankings', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'name', 'nomenclature'] },
  { table: 'material_units', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'code', 'name', 'symbol', 'is_active', 'deleted_at'] },
  { table: 'material_families', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'code', 'name', 'is_active', 'deleted_at'] },
  { table: 'material_codes', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'code', 'name', 'is_active', 'deleted_at'] },
  { table: 'material_types', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'code', 'name', 'is_active', 'deleted_at'] },
  { table: 'material_brands', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'code', 'name', 'is_active', 'deleted_at'] },
  { table: 'material_locations', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'code', 'name', 'area_id', 'is_active', 'deleted_at'] },
  { table: 'suppliers', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'code', 'name', 'rfc', 'is_active', 'deleted_at'] },
  { table: 'tags', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'name', 'slug', 'is_active', 'deleted_at'] },
  { table: 'materials', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'internal_code', 'name', 'family_id', 'material_code_id', 'type_id', 'brand_id', 'unit_id', 'default_location_id', 'ranking_id', 'minimum_stock', 'is_active', 'deleted_at'] },
  { table: 'material_tags', category: 'MASTER_DATA_CLIENT', orderBy: 'material_id, tag_id', immutableCols: ['material_id', 'tag_id'] },
  { table: 'tipos_baja', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'name', 'description'] },
  { table: 'formulas', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'code', 'name', 'batch_size_kg', 'expected_yield_pieces', 'extruder_assignment_mode', 'allowed_extruders', 'restricted_extruders', 'is_active'] },
  { table: 'formula_ingredients', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'formula_id', 'material_id', 'equivalence_tag_id', 'quantity', 'percentage'] },
  { table: 'pti_products', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'code', 'name', 'color', 'unit_weight_kg', 'formula_id', 'extrusion_machine_id', 'telares_subarea_code', 'is_active'] },
  { table: 'extruders', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'code', 'name', 'is_dynamic_member', 'is_active'] },
  { table: 'extrusoras_formulas', category: 'MASTER_DATA_CLIENT', orderBy: 'extruder_id, formula_id', immutableCols: ['extruder_id', 'formula_id'] },
  { table: 'silos', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'code', 'name', 'capacity_kg', 'material_id', 'material_tag_id', 'is_extrusion_feed', 'is_active'] },
  { table: 'looms', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'code', 'name', 'subarea_id', 'creel_capacity_spools', 'supported_pti_types', 'supported_bom_ids', 'is_active'] },
  { table: 'production_boms', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'code', 'name', 'product_kind', 'subarea_id', 'fabric_type', 'ounces_yd2', 'width_cm', 'warp_denier', 'weft_denier', 'tape_color', 'default_route', 'is_provisional', 'is_active'] },
  { table: 'production_bom_items', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'bom_id', 'pti_product_id', 'material_id', 'role', 'ratio_percentage', 'consumption_g_per_m'] },
  { table: 'laminado_specifications', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'code', 'name', 'is_active'] },
  { table: 'laminado_specification_materials', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'laminado_spec_id', 'material_id', 'role'] },
  { table: 'globo_specifications', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'code', 'name', 'is_active'] },
  { table: 'globo_specification_materials', category: 'MASTER_DATA_CLIENT', orderBy: 'id', immutableCols: ['id', 'globo_spec_id', 'material_id', 'role'] },
];

function sha256(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

function assertExpectedMasterTables(existingTables, definitions = MASTER_DATA_TABLES) {
  const existing = existingTables instanceof Set ? existingTables : new Set(existingTables || []);
  const missing = definitions.map((definition) => definition.table).filter((table) => !existing.has(table));
  if (missing.length > 0) {
    const error = new Error(`Faltan tablas esperadas de Master Data: ${missing.join(', ')}.`);
    error.code = 'MASTER_DATA_TABLES_MISSING';
    error.missingTables = missing;
    throw error;
  }
}

async function computeMasterDataFingerprint(dbOverride = null, rawEnv = process.env) {
  const cfg = assertLocalDatabaseOnly(rawEnv);
  const targetDb = dbOverride || cfg.name;

  const client = new Client({
    host: cfg.host,
    port: cfg.port,
    database: targetDb,
    user: cfg.user,
    password: cfg.password,
    ssl: false,
  });

  await client.connect();
  try {
    const existingTablesRes = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
    );
    const existingTables = new Set(existingTablesRes.rows.map((r) => r.table_name));
    assertExpectedMasterTables(existingTables);

    const tableFingerprints = [];
    for (const def of MASTER_DATA_TABLES) {
      if (!existingTables.has(def.table)) {
        tableFingerprints.push({
          table: def.table,
          category: def.category,
          exists: false,
          rowCount: 0,
          protectedColumns: [],
          sha256: null,
        });
        continue;
      }

      const colsRes = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position",
        [def.table]
      );
      const actualCols = new Set(colsRes.rows.map((r) => r.column_name));
      const selectedCols = def.immutableCols.filter((c) => actualCols.has(c));

      const orderClause = def.orderBy
        .split(',')
        .map((c) => c.trim())
        .filter((c) => actualCols.has(c))
        .join(', ');

      const sql = `SELECT ${selectedCols.map((c) => `"${c}"`).join(', ')} FROM "${def.table}"${
        orderClause ? ` ORDER BY ${orderClause} ASC` : ''
      }`;
      const rowsRes = await client.query(sql);

      const canonicalRows = rowsRes.rows.map((row) => {
        const orderedObj = {};
        for (const col of selectedCols) {
          const val = row[col];
          orderedObj[col] = val instanceof Date ? val.toISOString() : val;
        }
        return orderedObj;
      });

      const tableHash = sha256(JSON.stringify(canonicalRows));
      tableFingerprints.push({
        table: def.table,
        category: def.category,
        exists: true,
        rowCount: rowsRes.rowCount,
        protectedColumns: selectedCols,
        sha256: tableHash,
      });
    }

    const combinedHash = sha256(
      JSON.stringify(
        tableFingerprints.map((t) => ({
          table: t.table,
          rowCount: t.rowCount,
          sha256: t.sha256,
        }))
      )
    );

    return {
      fingerprintVersion: 2,
      generatedAt: new Date().toISOString(),
      database: targetDb,
      host: cfg.host,
      port: cfg.port,
      totalPublicTables: existingTables.size,
      masterTablesEvaluated: tableFingerprints.length,
      totalMasterRows: tableFingerprints.reduce((s, t) => s + t.rowCount, 0),
      globalMasterDataSha256: combinedHash,
      tables: tableFingerprints,
    };
  } finally {
    await client.end();
  }
}

function compareFingerprints(baseline, current) {
  const diffs = [];
  const baseMap = new Map(baseline.tables.map((t) => [t.table, t]));
  const currentMap = new Map(current.tables.map((t) => [t.table, t]));
  for (const base of baseline.tables) {
    if (!currentMap.has(base.table)) {
      diffs.push({ table: base.table, reason: 'MISSING_IN_CURRENT' });
    }
  }
  for (const cur of current.tables) {
    const base = baseMap.get(cur.table);
    if (!base) {
      diffs.push({ table: cur.table, reason: 'MISSING_IN_BASELINE' });
      continue;
    }
    if (base.rowCount !== cur.rowCount || base.sha256 !== cur.sha256) {
      diffs.push({
        table: cur.table,
        baselineRows: base.rowCount,
        currentRows: cur.rowCount,
        baselineHash: base.sha256,
        currentHash: cur.sha256,
      });
    }
  }
  return {
    identical: (baseline.fingerprintVersion || 1) === (current.fingerprintVersion || 1)
      && diffs.length === 0
      && baseline.globalMasterDataSha256 === current.globalMasterDataSha256,
    baselineFingerprintVersion: baseline.fingerprintVersion || 1,
    currentFingerprintVersion: current.fingerprintVersion || 1,
    baselineGlobalSha256: baseline.globalMasterDataSha256,
    currentGlobalSha256: current.globalMasterDataSha256,
    changedTablesCount: diffs.length,
    changedTables: diffs,
  };
}

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const dbIdx = args.indexOf('--db');
    const targetDb = dbIdx !== -1 ? args[dbIdx + 1] : null;
    const profileIdx = args.indexOf('--profile');
    const profile = profileIdx !== -1 ? String(args[profileIdx + 1] || '').trim().toLowerCase() : null;
    if (profile && !['local', 'test'].includes(profile)) throw new Error('--profile solo admite local o test.');
    const profileEnv = profile
      ? { ...process.env, APP_ENV: profile, NODE_ENV: profile === 'test' ? 'test' : 'development', DB_NAME: profile === 'test' ? (process.env.DB_TEST_NAME || 'sistema_enterprise_test') : 'sistema_enterprise' }
      : process.env;
    const saveIdx = args.indexOf('--save');
    const verifyIdx = args.indexOf('--verify');

    const fp = await computeMasterDataFingerprint(targetDb, profileEnv);

    if (saveIdx !== -1 && args[saveIdx + 1]) {
      const outPath = path.resolve(args[saveIdx + 1]);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(fp, null, 2));
    }

    if (verifyIdx !== -1 && args[verifyIdx + 1]) {
      const basePath = path.resolve(args[verifyIdx + 1]);
      const baseFp = JSON.parse(fs.readFileSync(basePath, 'utf8'));
      const cmp = compareFingerprints(baseFp, fp);
      console.log(JSON.stringify(cmp, null, 2));
      if (!cmp.identical) {
        process.exitCode = 1;
      }
      return;
    }

    console.log(
      JSON.stringify(
        {
          database: fp.database,
          totalPublicTables: fp.totalPublicTables,
          masterTablesEvaluated: fp.masterTablesEvaluated,
          totalMasterRows: fp.totalMasterRows,
          globalMasterDataSha256: fp.globalMasterDataSha256,
        },
        null,
        2
      )
    );
  })().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}

module.exports = {
  MASTER_DATA_TABLES,
  assertExpectedMasterTables,
  computeMasterDataFingerprint,
  compareFingerprints,
};
