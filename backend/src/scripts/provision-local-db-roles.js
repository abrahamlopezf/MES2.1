'use strict';

// Provisiona roles y ACL locales TraceFlow sin crear, restaurar ni borrar bases.
// Requiere --apply y credenciales administrativas explícitas en el proceso.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { Client } = require('pg');
const { MASTER_DATA_TABLES } = require('./master-data-fingerprint');

const BACKEND_ROOT = path.resolve(__dirname, '../..');
const ENV_PATH = path.join(BACKEND_ROOT, '.env');
const MIGRATOR_ENV_PATH = path.join(BACKEND_ROOT, '.env.migrator.local');
const ADMIN_ENV_PATH = path.join(BACKEND_ROOT, '.env.admin.local');
const TARGETS = [
  { db: 'sistema_enterprise', app: 'traceflow_app_local', migrator: 'traceflow_dev_migrator', profile: 'dev' },
  { db: 'sistema_enterprise_test', app: 'traceflow_app_test', migrator: 'traceflow_qa_migrator', profile: 'qa' },
];

const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;

function localOnly() {
  const env = dotenv.parse(fs.readFileSync(ENV_PATH));
  const effective = { ...env, ...process.env };
  if (effective.APP_ENV !== 'local' || !['127.0.0.1', 'localhost', '::1'].includes(effective.DB_HOST || '127.0.0.1')) {
    throw new Error('Provisionamiento detenido: backend/.env debe indicar APP_ENV=local y un host loopback.');
  }
  for (const key of ['DATABASE_URL', 'REMOTE_DATABASE_URL', 'NEON_DATABASE_URL', 'POSTGRES_URL']) {
    const value = effective[key];
    if (value && !/^(postgres|postgresql):\/\/(?:[^@/]+@)?(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?\//i.test(value)) {
      throw new Error(`Provisionamiento detenido: ${key} no está vacío o no apunta a loopback.`);
    }
  }
  if (effective.PGHOST && !['127.0.0.1', 'localhost', '::1'].includes(effective.PGHOST)) throw new Error('Provisionamiento detenido: PGHOST heredado no local.');
  const host = effective.DB_HOST || '127.0.0.1';
  const port = Number(effective.DB_PORT || 5432);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('DB_PORT local inválido.');
  return { env, host, port };
}

function makePassword() {
  return crypto.randomBytes(36).toString('base64url');
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function ensureRole(admin, name, password) {
  const exists = await admin.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [name]);
  const action = exists.rowCount
    ? `ALTER ROLE ${quoteIdent(name)} WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD ${sqlLiteral(password)}`
    : `CREATE ROLE ${quoteIdent(name)} WITH LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD ${sqlLiteral(password)}`;
  await admin.query(action);
}

async function reassignPublicObjects(client, migrator) {
  const relationRows = await client.query(`
    SELECT c.relname, c.relkind
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','S','v','m','f')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype='e')
      AND (c.relkind <> 'S' OR NOT EXISTS (
        SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype IN ('a','i')
      ))
    ORDER BY CASE WHEN c.relkind IN ('r','p') THEN 0 WHEN c.relkind='S' THEN 1 ELSE 2 END,c.relname
  `);
  const relationCommands = { r: 'TABLE', p: 'TABLE', S: 'SEQUENCE', v: 'VIEW', m: 'MATERIALIZED VIEW', f: 'FOREIGN TABLE' };
  for (const row of relationRows.rows) {
    await client.query(`ALTER ${relationCommands[row.relkind]} public.${quoteIdent(row.relname)} OWNER TO ${quoteIdent(migrator)}`);
  }

  const typeRows = await client.query(`
    SELECT t.typname,t.typtype
    FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' AND t.typtype IN ('e','d')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_type'::regclass AND d.objid=t.oid AND d.deptype='e')
    ORDER BY t.typname
  `);
  for (const row of typeRows.rows) {
    const kind = row.typtype === 'd' ? 'DOMAIN' : 'TYPE';
    await client.query(`ALTER ${kind} public.${quoteIdent(row.typname)} OWNER TO ${quoteIdent(migrator)}`);
  }

  const routineRows = await client.query(`
    SELECT p.proname,p.prokind,pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e')
    ORDER BY p.proname,p.oid
  `);
  for (const row of routineRows.rows) {
    const kind = row.prokind === 'p' ? 'PROCEDURE' : 'FUNCTION';
    await client.query(`ALTER ${kind} public.${quoteIdent(row.proname)}(${row.args}) OWNER TO ${quoteIdent(migrator)}`);
  }
  return { relations: relationRows.rowCount, types: typeRows.rowCount, routines: routineRows.rowCount };
}

async function configureDatabase(adminOptions, target, masterNames) {
  const client = new Client({ ...adminOptions, database: target.db });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('REVOKE ALL PRIVILEGES ON DATABASE ' + quoteIdent(target.db) + ' FROM PUBLIC');
    await client.query(`REVOKE ALL PRIVILEGES ON DATABASE ${quoteIdent(target.db)} FROM traceflow_migrator`);
    await client.query(`GRANT CONNECT ON DATABASE ${quoteIdent(target.db)} TO ${quoteIdent(target.app)}`);
    await client.query(`GRANT CONNECT, TEMPORARY ON DATABASE ${quoteIdent(target.db)} TO ${quoteIdent(target.migrator)}`);
    await client.query(`REVOKE CREATE ON SCHEMA public FROM PUBLIC`);
    await client.query(`REVOKE USAGE ON SCHEMA public FROM PUBLIC`);
    await client.query(`GRANT USAGE ON SCHEMA public TO ${quoteIdent(target.app)}`);
    await client.query(`GRANT USAGE, CREATE ON SCHEMA public TO ${quoteIdent(target.migrator)}`);
    await client.query(`REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC, ${quoteIdent(target.app)}`);
    await client.query(`REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, ${quoteIdent(target.app)}`);
    await client.query(`REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC`);

    const owners = await reassignPublicObjects(client, target.migrator);
    await client.query(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${quoteIdent(target.app)}`);
    await client.query(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ${quoteIdent(target.app)}`);
    await client.query(`GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${quoteIdent(target.app)}`);

    if (target.profile === 'dev') {
      await client.query(`GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${quoteIdent(target.app)}`);
      await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteIdent(target.migrator)} IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${quoteIdent(target.app)}`);
      await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteIdent(target.migrator)} IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${quoteIdent(target.app)}`);
    } else {
      const operationalTables = await client.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name
      `);
      const writable = operationalTables.rows.map((r) => r.table_name).filter((name) => !masterNames.has(name));
      if (writable.length) {
        const names = writable.map((name) => `public.${quoteIdent(name)}`).join(', ');
        await client.query(`GRANT INSERT, UPDATE, DELETE ON TABLE ${names} TO ${quoteIdent(target.app)}`);
      }
      const operationalColumnGrants = {
        silos: ['current_stock_kg', 'current_lot_number', 'current_lot_type', 'unit_cost', 'updated_at'],
        looms: ['status', 'current_bom_id', 'active_warp_rack_id', 'active_weft_rack_id', 'current_spools_count', 'current_wip_kg', 'total_rolls_produced', 'updated_at'],
        extruders: ['status', 'updated_at'],
      };
      for (const [table, columns] of Object.entries(operationalColumnGrants)) {
        const existing = await client.query(
          'SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 AND column_name = ANY($3::text[])',
          ['public', table, columns]
        );
        const names = existing.rows.map((r) => quoteIdent(r.column_name)).join(', ');
        if (names) await client.query(`GRANT UPDATE (${names}) ON TABLE public.${quoteIdent(table)} TO ${quoteIdent(target.app)}`);
      }
      await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteIdent(target.migrator)} IN SCHEMA public GRANT SELECT ON TABLES TO ${quoteIdent(target.app)}`);
      await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteIdent(target.migrator)} IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${quoteIdent(target.app)}`);
      await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteIdent(target.migrator)} IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO ${quoteIdent(target.app)}`);
    }
    await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteIdent(target.migrator)} IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC`);
    await client.query('COMMIT');
    return owners;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

function updateEnvFile(passwords, adminUser, adminPassword) {
  fs.writeFileSync(ADMIN_ENV_PATH, `TRACEFLOW_PG_ADMIN_USER=${adminUser}\nTRACEFLOW_PG_ADMIN_PASSWORD=${adminPassword}\n`, { mode: 0o600 });
  let content = fs.readFileSync(ENV_PATH, 'utf8');
  const values = {
    DB_USER: 'traceflow_app_local',
    DB_PASSWORD: passwords.devApp,
    DB_TEST_USER: 'traceflow_app_test',
    DB_TEST_PASSWORD: passwords.qaApp,
  };
  for (const [key, value] of Object.entries(values)) {
    const escaped = value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '');
    const line = `${key}=${escaped}`;
    const expression = new RegExp(`^${key}=.*$`, 'm');
    if (expression.test(content)) content = content.replace(expression, line);
    else content += `${content.endsWith('\n') ? '' : '\n'}${line}\n`;
  }
  fs.writeFileSync(ENV_PATH, content, { mode: 0o600 });
  fs.writeFileSync(MIGRATOR_ENV_PATH,
    `TRACEFLOW_DEV_MIGRATOR_USER=${TARGETS[0].migrator}\nTRACEFLOW_DEV_MIGRATOR_PASSWORD=${passwords.devMigrator}\nTRACEFLOW_QA_MIGRATOR_USER=${TARGETS[1].migrator}\nTRACEFLOW_QA_MIGRATOR_PASSWORD=${passwords.qaMigrator}\n`,
    { mode: 0o600 }
  );
}

async function main() {
  dotenv.config({ path: ADMIN_ENV_PATH });
  const { env, host, port } = localOnly();
  if (!process.argv.includes('--apply')) throw new Error('Sin cambios: reejecuta con --apply después de revisar que APP_ENV y DB_HOST sean locales.');
  const adminUser = process.env.TRACEFLOW_PG_ADMIN_USER;
  const adminPassword = process.env.TRACEFLOW_PG_ADMIN_PASSWORD;
  if (!adminUser || adminPassword === undefined) throw new Error('Define credenciales administrativas explícitas en TRACEFLOW_PG_ADMIN_USER y TRACEFLOW_PG_ADMIN_PASSWORD para el proceso.');

  const adminOptions = { host, port, database: 'postgres', user: adminUser, password: adminPassword, ssl: false };
  const admin = new Client(adminOptions);
  await admin.connect();
  const passwords = { devApp: makePassword(), qaApp: makePassword(), devMigrator: makePassword(), qaMigrator: makePassword() };
  const rolePasswords = [
    [TARGETS[0].app, passwords.devApp], [TARGETS[1].app, passwords.qaApp],
    [TARGETS[0].migrator, passwords.devMigrator], [TARGETS[1].migrator, passwords.qaMigrator],
  ];
  try {
    const dbRows = await admin.query("SELECT datname FROM pg_database WHERE datname = ANY($1::text[])", [TARGETS.map((t) => t.db)]);
    if (dbRows.rowCount !== TARGETS.length) throw new Error('No se encontraron exactamente las dos bases locales DEV y QA autorizadas.');
    const adminRole = await admin.query('SELECT rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=current_user');
    if (!adminRole.rowCount || !adminRole.rows[0].rolsuper) throw new Error('La cuenta administrativa debe ser el superusuario local autorizado para cambiar ACL y propiedad; ninguna modificación continúa.');
    for (const [role, password] of rolePasswords) await ensureRole(admin, role, password);
    // El migrador genérico anterior no se comparte entre DEV y QA.
    const legacy = await admin.query("SELECT 1 FROM pg_roles WHERE rolname='traceflow_migrator'");
    if (legacy.rowCount) await admin.query('ALTER ROLE traceflow_migrator NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS');
    await admin.end();

    const masterNames = new Set(MASTER_DATA_TABLES.map((t) => t.table));
    const ownership = {};
    for (const target of TARGETS) ownership[target.db] = await configureDatabase({ ...adminOptions, database: undefined }, target, masterNames);
    updateEnvFile(passwords, adminUser, adminPassword);
    console.log(JSON.stringify({
      applied: true,
      databases: TARGETS.map(({ db, app, migrator, profile }) => ({ db, app, migrator, profile })),
      objectOwnershipTransferred: ownership,
      applicationAndMigratorSecretsWrittenToIgnoredLocalEnvFiles: true,
    }, null, 2));
  } finally {
    if (!admin.ended) await admin.end().catch(() => {});
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
