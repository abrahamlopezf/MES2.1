/**
 * generate-catalog-seeder.js
 * 
 * Lee catalog_dump.json (generado previamente desde la BD local)
 * y escribe el seeder Sequelize-CLI en:
 *   src/database/seeders/20260826120000-production-catalog-data.js
 * 
 * Uso: node generate-catalog-seeder.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── helpers ──────────────────────────────────────────────────────────────────
const esc = (s) => (s == null ? '' : String(s).replace(/'/g, "''"));
const val = (s) => (s == null ? 'NULL' : `'${esc(s)}'`);

/**
 * Builds the VALUES list for a bulk INSERT.
 * colFns: array of { col: 'column_name', fn: row => value }
 */
const buildValues = (rows, colFns) =>
  rows
    .map((r) => {
      const vals = colFns.map(({ fn }) => {
        const v = fn(r);
        return v === null || v === undefined ? 'NULL' : `'${esc(String(v))}'`;
      });
      return `(${vals.join(', ')})`;
    })
    .join(',\n    ');

// ── load dump ────────────────────────────────────────────────────────────────
const dumpPath = path.join(__dirname, 'catalog_dump.json');
if (!fs.existsSync(dumpPath)) {
  console.error('ERROR: catalog_dump.json not found. Run the dump script first.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dumpPath, 'utf-8'));

const families  = data.material_families  || [];
const codes     = data.material_codes     || [];
const types     = data.material_types     || [];
const brands    = data.material_brands    || [];
const areas     = data.operational_areas  || [];
const locations = data.material_locations || [];
const rankings  = data.rankings           || [];

console.log(`📊 Datos a sembrar:
  material_families  : ${families.length}
  material_codes     : ${codes.length}
  material_types     : ${types.length}
  material_brands    : ${brands.length}
  operational_areas  : ${areas.length}
  material_locations : ${locations.length}
  rankings           : ${rankings.length}
`);

// ── build seeder body ─────────────────────────────────────────────────────────
const CHUNK = 200; // rows per INSERT statement (avoid too-long SQL)

const chunked = (arr, size) => {
  const result = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
};

const buildInsertBlock = (table, conflictCol, colFns, rows, extraOnConflict = '') => {
  if (!rows.length) return `    // No rows for ${table}`;
  const cols = colFns.map(({ col }) => col).join(', ');
  const onConflict = extraOnConflict || `ON CONFLICT (${conflictCol}) DO NOTHING`;
  return chunked(rows, CHUNK)
    .map((chunk) => {
      const values = buildValues(chunk, colFns);
      return `    await queryInterface.sequelize.query(\`
      INSERT INTO ${table} (${cols})
      VALUES
        ${values}
      ${onConflict}
    \`);`;
    })
    .join('\n\n');
};

// ── families ─────────────────────────────────────────────────────────────────
const familiesBlock = buildInsertBlock(
  'material_families',
  'code',
  [
    { col: 'uuid',       fn: (r) => r.uuid },
    { col: 'code',       fn: (r) => r.code },
    { col: 'name',       fn: (r) => r.name },
    { col: 'is_active',  fn: (_) => null },   // will use literal
    { col: 'created_at', fn: (_) => null },
    { col: 'updated_at', fn: (_) => null },
  ],
  [],  // will use custom approach
  ''
);

// Custom approach for tables with NOW() literals — build raw SQL chunks
const buildTableSQL = (table, conflictTarget, rows, rowMapper) => {
  if (!rows.length) return `    // No data for ${table}\n`;
  const chunks = chunked(rows, CHUNK);
  return chunks
    .map((chunk) => {
      const values = chunk.map(rowMapper).join(',\n      ');
      return `    await queryInterface.sequelize.query(\`INSERT INTO ${table}
      VALUES
        ${values}
      ON CONFLICT (${conflictTarget}) DO NOTHING\`);`;
    })
    .join('\n\n');
};

// ── families SQL ─────────────────────────────────────────────────────────────
const familiesSQL = buildTableSQL(
  'material_families (uuid, code, name, is_active, created_at, updated_at)',
  'code',
  families,
  (r) => `('${esc(r.uuid)}', '${esc(r.code)}', '${esc(r.name)}', true, NOW(), NOW())`
);

// ── codes SQL ────────────────────────────────────────────────────────────────
const codesSQL = buildTableSQL(
  'material_codes (uuid, code, name, is_active, created_at, updated_at)',
  'code',
  codes,
  (r) => `('${esc(r.uuid)}', '${esc(r.code)}', '${esc(r.name)}', true, NOW(), NOW())`
);

// ── types SQL ────────────────────────────────────────────────────────────────
const typesSQL = buildTableSQL(
  'material_types (uuid, code, name, is_active, created_at, updated_at)',
  'code',
  types,
  (r) => `('${esc(r.uuid)}', '${esc(r.code)}', '${esc(r.name)}', true, NOW(), NOW())`
);

// ── brands SQL ───────────────────────────────────────────────────────────────
const brandsSQL = buildTableSQL(
  'material_brands (uuid, code, name, is_active, created_at, updated_at)',
  'code',
  brands,
  (r) => `('${esc(r.uuid)}', '${esc(r.code)}', '${esc(r.name)}', true, NOW(), NOW())`
);

// ── operational_areas SQL ────────────────────────────────────────────────────
const areasSQL = buildTableSQL(
  'operational_areas (code, name, is_active, created_at, updated_at)',
  'code',
  areas,
  (r) => `('${esc(r.code)}', '${esc(r.name)}', true, NOW(), NOW())`
);

// ── material_locations SQL ───────────────────────────────────────────────────
const locationsSQL = buildTableSQL(
  'material_locations (uuid, code, name, is_active, created_at, updated_at)',
  'code',
  locations,
  (r) => `('${esc(r.uuid)}', '${esc(r.code)}', '${esc(r.name)}', true, NOW(), NOW())`
);

// ── rankings SQL ─────────────────────────────────────────────────────────────
// rankings may not have uuid — use id directly
const rankingsSQL = rankings.length
  ? `    // Rankings (idempotent by nomenclature)\n` +
    rankings
      .map(
        (r) =>
          `    await queryInterface.sequelize.query(\`INSERT INTO rankings (nomenclature, name, created_at, updated_at)\n` +
          `      VALUES ('${esc(r.nomenclature)}', '${esc(r.name)}', NOW(), NOW())\n` +
          `      ON CONFLICT (nomenclature) DO NOTHING\`);`
      )
      .join('\n')
  : '    // No rankings data';

// ── assemble seeder file ──────────────────────────────────────────────────────
const seederContent = `'use strict';
// ============================================================================
// SEEDER: production-catalog-data
// Generated: ${new Date().toISOString()}
// Source: catalog_dump.json (extracted from local PostgreSQL)
//
// Catalogs seeded:
//   - material_families  (${families.length} rows)
//   - material_codes     (${codes.length} rows)
//   - material_types     (${types.length} rows)
//   - material_brands    (${brands.length} rows)
//   - operational_areas  (${areas.length} rows)
//   - material_locations (${locations.length} rows)
//   - rankings           (${rankings.length} rows)
//
// All INSERTs use ON CONFLICT DO NOTHING — safe to re-run (idempotent).
// ============================================================================

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🌱 Seeding catalog data into Neon production DB...');

    // ── 1. Rankings ──────────────────────────────────────────────────────────
    console.log('  → rankings (${rankings.length} rows)');
${rankingsSQL}

    // ── 2. Material Families ─────────────────────────────────────────────────
    console.log('  → material_families (${families.length} rows)');
${familiesSQL}

    // ── 3. Material Codes ────────────────────────────────────────────────────
    console.log('  → material_codes (${codes.length} rows)');
${codesSQL}

    // ── 4. Material Types ────────────────────────────────────────────────────
    console.log('  → material_types (${types.length} rows)');
${typesSQL}

    // ── 5. Material Brands ───────────────────────────────────────────────────
    console.log('  → material_brands (${brands.length} rows)');
${brandsSQL}

    // ── 6. Operational Areas ─────────────────────────────────────────────────
    console.log('  → operational_areas (${areas.length} rows)');
${areasSQL}

    // ── 7. Material Locations ────────────────────────────────────────────────
    console.log('  → material_locations (${locations.length} rows)');
${locationsSQL}

    console.log('✅ Catalog seeder completed successfully.');
  },

  down: async (queryInterface, Sequelize) => {
    // Down is intentionally left as a no-op.
    // Deleting catalog data in production can break referential integrity.
    console.log('⚠️  Down not implemented for production catalog seeder (safety).');
  },
};
`;

const outputPath = path.join(
  __dirname,
  'src', 'database', 'seeders',
  '20260826120000-production-catalog-data.js'
);

fs.writeFileSync(outputPath, seederContent, 'utf-8');

const size = (fs.statSync(outputPath).size / 1024).toFixed(1);
console.log(`✅ Seeder escrito en:\n   ${outputPath}`);
console.log(`   Tamaño: ${size} KB`);
