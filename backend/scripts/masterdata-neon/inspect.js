/**
 * INSPECCIÓN (SOLO LECTURA) — Local vs Neon
 *
 * No modifica nada. Reporta por cada tabla de MasterData:
 *  - total / activos / inactivos / soft-deleted
 *  - duplicados por `code` (entre registros vivos)
 *  - tablas transaccionales en Neon que dependen (FK) de MasterData y cuántos registros tienen
 *  - diferencias de migraciones (sequelize_meta) entre Local y Neon
 *
 * Uso:
 *   NEON_DATABASE_URL debe existir en backend/.env (NO se versiona).
 *   node scripts/masterdata-neon/inspect.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Sequelize, QueryTypes } = require('sequelize');

const MASTER_TABLES = [
  'rankings',
  'material_units',
  'material_families',
  'material_codes',
  'material_types',
  'material_brands',
  'material_locations',
  'suppliers',
  'tags',
  'materials',
  'material_tags',
];

const neonUrl = process.env.NEON_DATABASE_URL
  || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech') ? process.env.DATABASE_URL : null);

if (!neonUrl) {
  console.error('Falta NEON_DATABASE_URL en backend/.env');
  process.exit(1);
}

const local = new Sequelize(
  process.env.DB_NAME || 'sistema_enterprise',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '',
  { host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT) || 5432, dialect: 'postgres', logging: false }
);

const neon = new Sequelize(neonUrl, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false,
});

const q = (db, sql, replacements) => db.query(sql, { type: QueryTypes.SELECT, replacements });

async function tableExists(db, table) {
  const r = await q(db, `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=:t`, { t: table });
  return r.length > 0;
}

async function columns(db, table) {
  const r = await q(db, `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=:t`, { t: table });
  return r.map(c => c.column_name);
}

async function tableStats(db, table) {
  if (!(await tableExists(db, table))) return { exists: false };
  const cols = await columns(db, table);
  const hasActive = cols.includes('is_active');
  const hasDeleted = cols.includes('deleted_at');
  const hasCode = cols.includes('code');

  const [row] = await q(db, `
    SELECT
      COUNT(*)::int AS total
      ${hasActive ? `, COUNT(*) FILTER (WHERE is_active = true ${hasDeleted ? 'AND deleted_at IS NULL' : ''})::int AS active` : ''}
      ${hasActive ? `, COUNT(*) FILTER (WHERE is_active = false)::int AS inactive` : ''}
      ${hasDeleted ? `, COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::int AS soft_deleted` : ''}
    FROM "${table}"`);

  let duplicate_codes = 0;
  if (hasCode) {
    const [d] = await q(db, `
      SELECT COUNT(*)::int AS n FROM (
        SELECT UPPER(TRIM(code)) FROM "${table}" ${hasDeleted ? 'WHERE deleted_at IS NULL' : ''}
        GROUP BY UPPER(TRIM(code)) HAVING COUNT(*) > 1
      ) x`);
    duplicate_codes = d.n;
  }
  return { exists: true, ...row, duplicate_codes };
}

async function dependents(db) {
  // Tablas NO-MasterData con FK hacia MasterData
  const fks = await q(db, `
    SELECT DISTINCT tc.table_name AS child, ccu.table_name AS parent, kcu.column_name AS col
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
      AND ccu.table_name IN (:tables)`, { tables: MASTER_TABLES });

  const result = [];
  for (const fk of fks) {
    if (MASTER_TABLES.includes(fk.child)) continue;
    const [c] = await q(db, `SELECT COUNT(*)::int AS n FROM "${fk.child}" WHERE "${fk.col}" IS NOT NULL`);
    result.push({ table: fk.child, column: fk.col, references: fk.parent, rows: c.n });
  }
  return result;
}

async function migrations(db) {
  if (!(await tableExists(db, 'SequelizeMeta')) && !(await tableExists(db, 'sequelize_meta'))) return [];
  const t = (await tableExists(db, 'SequelizeMeta')) ? 'SequelizeMeta' : 'sequelize_meta';
  return (await q(db, `SELECT name FROM "${t}" ORDER BY name`)).map(r => r.name);
}

async function run() {
  const report = { generated_at: new Date().toISOString(), tables: {}, neon_dependents: [], migrations: {} };
  try {
    await local.authenticate();
    await neon.authenticate();
    console.log('Conectado a Local y Neon.\n');

    for (const t of MASTER_TABLES) {
      report.tables[t] = { local: await tableStats(local, t), neon: await tableStats(neon, t) };
    }
    report.neon_dependents = await dependents(neon);

    const lm = await migrations(local);
    const nm = await migrations(neon);
    report.migrations = {
      local_count: lm.length,
      neon_count: nm.length,
      missing_in_neon: lm.filter(m => !nm.includes(m)),
      missing_in_local: nm.filter(m => !lm.includes(m)),
    };

    // Consola
    console.log('=== MASTERDATA (local | neon) ===');
    console.table(Object.fromEntries(Object.entries(report.tables).map(([t, v]) => [t, {
      'L total': v.local.exists ? v.local.total : 'NO EXISTE',
      'L activos': v.local.active ?? '-',
      'L inact.': v.local.inactive ?? '-',
      'L dup': v.local.duplicate_codes ?? '-',
      'N total': v.neon.exists ? v.neon.total : 'NO EXISTE',
      'N activos': v.neon.active ?? '-',
      'N inact.': v.neon.inactive ?? '-',
      'N borrados': v.neon.soft_deleted ?? '-',
      'N dup': v.neon.duplicate_codes ?? '-',
    }])));

    console.log('\n=== NEON: tablas transaccionales que dependen de MasterData ===');
    console.table(report.neon_dependents.filter(d => d.rows > 0));

    console.log('\n=== MIGRACIONES ===');
    console.log(`Local: ${report.migrations.local_count} | Neon: ${report.migrations.neon_count}`);
    console.log('Faltan en Neon:', report.migrations.missing_in_neon);
    console.log('Faltan en Local:', report.migrations.missing_in_local);

    const out = path.join(__dirname, 'inspect-report.json');
    fs.writeFileSync(out, JSON.stringify(report, null, 2));
    console.log(`\nReporte guardado en ${out}`);
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  } finally {
    await local.close();
    await neon.close();
  }
}

run();
