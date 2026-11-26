'use strict';

/**
 * Read-only UAT gate for the customer master catalogs needed to operate
 * Extrusion and Telares. It deliberately verifies records, not inventory
 * balances or other mutable production state.
 */
require('dotenv').config();

if (String(process.env.APP_ENV || '').trim().toLowerCase() !== 'uat') {
  console.error('Esta verificación solo puede ejecutarse contra APP_ENV=uat.');
  process.exit(1);
}

const db = require('../database/models');
const extrusionCatalog = require('../database/seed-data/extrusion-formula-catalog.json');

const requiredFormulaCodes = extrusionCatalog.formulas.map(({ code }) => code);
const requiredMaterialCodes = extrusionCatalog.materials.map(({ internal_code: code }) => code);
const requiredLoomCodes = Array.from({ length: 21 }, (_, index) => `TEL-${String(index + 1).padStart(2, '0')}`);
const requiredExtruderCodes = ['EXT-01', 'EXT-02', 'EXT-04', 'EXT-05'];
const requiredSiloCodes = ['SILO-01', 'SILO-02'];
const requiredTelaresPtiCodes = Array.from({ length: 23 }, (_, index) => `PTI-CINTA-${String(index + 1).padStart(3, '0')}`);

async function missingCodes(sql, replacements, expectedCodes) {
  const [rows] = await db.sequelize.query(sql, { replacements });
  const found = new Set(rows.map((row) => row.code));
  return expectedCodes.filter((code) => !found.has(code));
}

async function verify() {
  const baseline = require('../../../docs/qa/qr-first-validation/evidence/master-data-dev-v2.json');
  const baselineCounts = new Map(baseline.tables.map(({ table, rowCount }) => [table, Number(rowCount)]));
  const warehouseTables = [
    'rankings', 'material_units', 'material_families', 'material_codes',
    'material_types', 'material_brands', 'material_locations', 'materials',
  ];
  const warehouseChecks = await Promise.all(warehouseTables.map(async (table) => {
    const [rows] = await db.sequelize.query(`SELECT COUNT(*)::INTEGER AS count FROM "${table}"`);
    const count = Number(rows[0]?.count || 0);
    return { table, count, minimum: baselineCounts.get(table) ?? 0 };
  }));

  const checks = [
    {
      label: 'Materiales requeridos por fórmulas de Extrusión',
      missing: await missingCodes(
        'SELECT internal_code AS code FROM materials WHERE deleted_at IS NULL AND internal_code IN (:codes)',
        { codes: requiredMaterialCodes },
        requiredMaterialCodes
      ),
    },
    {
      label: 'Fórmulas de Extrusión',
      missing: await missingCodes(
        'SELECT code FROM formulas WHERE is_active = TRUE AND code IN (:codes)',
        { codes: requiredFormulaCodes },
        requiredFormulaCodes
      ),
    },
    {
      label: 'PTI de Extrusión enlazados con sus fórmulas',
      missing: await missingCodes(
        `SELECT f.code
           FROM formulas f
          WHERE f.is_active = TRUE
            AND f.code IN (:codes)
            AND EXISTS (
              SELECT 1 FROM pti_products p
               WHERE p.formula_id = f.id AND p.is_active = TRUE
            )`,
        { codes: requiredFormulaCodes },
        requiredFormulaCodes
      ),
    },
    {
      label: 'Extrusoras físicas del cliente',
      missing: await missingCodes(
        'SELECT code FROM extruders WHERE is_active = TRUE AND code IN (:codes)',
        { codes: requiredExtruderCodes },
        requiredExtruderCodes
      ),
    },
    {
      label: 'Silos operativos del área',
      missing: await missingCodes(
        'SELECT code FROM silos WHERE is_active = TRUE AND code IN (:codes)',
        { codes: requiredSiloCodes },
        requiredSiloCodes
      ),
    },
    {
      label: 'PTI de Telares (catálogo de cintas del cliente)',
      missing: await missingCodes(
        'SELECT code FROM pti_products WHERE is_active = TRUE AND code IN (:codes)',
        { codes: requiredTelaresPtiCodes },
        requiredTelaresPtiCodes
      ),
    },
    {
      label: 'Telares del cliente',
      missing: await missingCodes(
        'SELECT code FROM looms WHERE is_active = TRUE AND code IN (:codes)',
        { codes: requiredLoomCodes },
        requiredLoomCodes
      ),
    },
  ];

  const [bomRows] = await db.sequelize.query(
    'SELECT COUNT(*)::INTEGER AS count FROM production_boms WHERE is_provisional = FALSE AND is_active = TRUE'
  );
  const activeBomCount = Number(bomRows[0]?.count || 0);
  const failed = warehouseChecks.some(({ count, minimum }) => count < minimum)
    || checks.some(({ missing }) => missing.length > 0)
    || activeBomCount === 0;

  console.log('\nVerificación de catálogos operativos UAT (solo lectura)\n');
  for (const { table, count, minimum } of warehouseChecks) {
    console.log(`${count >= minimum ? 'PASS' : 'FAIL'} Master Data Almacén · ${table} — ${count}/${minimum} registros mínimos`);
  }
  for (const { label, missing } of checks) {
    console.log(`${missing.length === 0 ? 'PASS' : 'FAIL'} ${label}${missing.length ? ` — faltan: ${missing.join(', ')}` : ''}`);
  }
  console.log(`${activeBomCount > 0 ? 'PASS' : 'FAIL'} Fichas PTI de Telares activas y confirmadas — ${activeBomCount} encontradas`);
  await db.sequelize.close();

  if (failed) {
    console.error('\nUAT no está lista: faltan catálogos requeridos. No se modificó ningún registro.');
    process.exitCode = 1;
    return;
  }
  console.log('\nUAT tiene los catálogos mínimos para habilitar Extrusión y Telares.');
}

verify().catch(async (error) => {
  console.error('Falló la verificación de catálogos UAT:', error.message);
  try { await db.sequelize.close(); } catch { /* Preserve the original failure. */ }
  process.exitCode = 1;
});
