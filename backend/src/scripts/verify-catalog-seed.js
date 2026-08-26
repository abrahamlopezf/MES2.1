/**
 * verify-catalog-seed.js
 * 
 * Verifica que el seeder de catálogos dejó los registros esperados en Neon.
 * Corre como post-step en el workflow seed-catalogs.yml
 */

'use strict';

require('dotenv').config();
const db = require('../database/models');

const EXPECTED = {
  material_families:  1,   // mínimo esperado
  material_codes:     50,  // mínimo esperado
  material_types:     5,   // mínimo esperado
  material_brands:    3,   // mínimo esperado
  material_locations: 5,   // mínimo esperado
  rankings:           1,   // mínimo esperado
};

async function verify() {
  console.log('\n🔍 Verificando catálogos en Neon...\n');

  const checks = [
    ['material_families',  'SELECT COUNT(*) AS cnt FROM material_families  WHERE deleted_at IS NULL'],
    ['material_codes',     'SELECT COUNT(*) AS cnt FROM material_codes      WHERE deleted_at IS NULL'],
    ['material_types',     'SELECT COUNT(*) AS cnt FROM material_types      WHERE deleted_at IS NULL'],
    ['material_brands',    'SELECT COUNT(*) AS cnt FROM material_brands     WHERE deleted_at IS NULL'],
    ['material_locations', 'SELECT COUNT(*) AS cnt FROM material_locations  WHERE deleted_at IS NULL'],
    ['rankings',           'SELECT COUNT(*) AS cnt FROM rankings'],
  ];

  let allOk = true;

  for (const [table, sql] of checks) {
    const [[row]] = await db.sequelize.query(sql);
    const count = Number(row.cnt);
    const min   = EXPECTED[table] || 0;
    const ok    = count >= min;
    const icon  = ok ? '✅' : '❌';
    console.log(`  ${icon} ${table.padEnd(22)}: ${String(count).padStart(4)} rows  (min expected: ${min})`);
    if (!ok) allOk = false;
  }

  await db.sequelize.close();

  console.log('');

  if (!allOk) {
    console.error('❌ Verification failed: some tables have fewer rows than expected.\n');
    process.exit(1);
  }

  console.log('✅ All catalog tables passed minimum row verification.\n');
}

verify().catch((err) => {
  console.error('Fatal error during verification:', err.message);
  process.exit(1);
});
