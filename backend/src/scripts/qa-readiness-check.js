'use strict';

// Read-only gate: no DDL/DML is issued. Do not add write operations to this script.
require('dotenv').config();
const { Client } = require('pg');
const { assertLocalDatabaseOnly } = require('../config/dbGuard');
const { MASTER_DATA_TABLES } = require('./master-data-fingerprint');

async function main() {
  const qaEnv = {
    ...process.env,
    APP_ENV: 'test',
    NODE_ENV: 'test',
    DB_NAME: process.env.DB_TEST_NAME || 'sistema_enterprise_test',
  };
  const config = assertLocalDatabaseOnly(qaEnv, { requireTestDb: true });
  const client = new Client({
    host: config.host,
    port: config.port,
    database: config.name,
    user: config.user,
    password: config.password,
    ssl: false,
    connectionTimeoutMillis: 5000,
  });

  await client.connect();
  try {
    const localConfig = assertLocalDatabaseOnly({
      ...process.env,
      APP_ENV: 'local',
      NODE_ENV: 'development',
      DB_NAME: process.env.DB_NAME_LOCAL || 'sistema_enterprise',
    });
    const localClient = new Client({
      host: localConfig.host,
      port: localConfig.port,
      database: localConfig.name,
      user: localConfig.user,
      password: localConfig.password,
      ssl: false,
      connectionTimeoutMillis: 5000,
    });
    let localMigrations = [];
    await localClient.connect();
    try {
      const localMigrationTable = await localClient.query("SELECT to_regclass('public.sequelize_meta') IS NOT NULL AS exists");
      if (localMigrationTable.rows[0].exists) {
        const rows = await localClient.query('SELECT name FROM public.sequelize_meta ORDER BY name');
        localMigrations = rows.rows.map((row) => row.name);
      }
    } finally {
      await localClient.end();
    }

    const identityResult = await client.query(`
      SELECT current_database() AS database, current_user AS role,
             inet_server_addr()::text AS address, inet_server_port() AS port
    `);
    const privilegesResult = await client.query(`
      SELECT r.rolsuper, r.rolcreatedb, r.rolcreaterole, r.rolreplication, r.rolbypassrls,
             has_database_privilege(current_user, current_database(), 'CONNECT') AS can_connect_qa,
             has_database_privilege(current_user, current_database(), 'CREATE') AS can_create_schema,
             has_database_privilege(current_user, 'sistema_enterprise', 'CONNECT') AS can_connect_dev,
             EXISTS (
               SELECT 1 FROM pg_auth_members m
               JOIN pg_roles elevated ON elevated.oid = m.roleid
               WHERE pg_has_role(current_user, elevated.oid, 'MEMBER')
                 AND (elevated.rolsuper OR elevated.rolcreatedb OR elevated.rolcreaterole
                   OR elevated.rolreplication OR elevated.rolbypassrls)
             ) AS inherits_elevated_role
      FROM pg_roles r WHERE r.rolname = current_user
    `);
    const tablesResult = await client.query(`
      SELECT count(*)::int AS public_base_tables
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const migrationsTableResult = await client.query(`
      SELECT to_regclass('public.sequelize_meta') IS NOT NULL AS exists
    `);
    const migrationsResult = migrationsTableResult.rows[0].exists
      ? await client.query('SELECT name FROM public.sequelize_meta ORDER BY name')
      : { rows: [] };
    const qaMigrations = migrationsResult.rows.map((row) => row.name);
    const devMigrationSet = new Set(localMigrations);
    const qaMigrationSet = new Set(qaMigrations);
    const qrTableResult = await client.query(`
      SELECT to_regclass('public.extrusoras_formulas') IS NOT NULL AS exists
    `);
    const qrTable = qrTableResult.rows[0];
    if (qrTable.exists) {
      const details = await client.query(`
        SELECT count(*)::int AS rows,
               (SELECT count(*)::int FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'extrusoras_formulas') AS columns
        FROM public.extrusoras_formulas
      `);
      Object.assign(qrTable, details.rows[0]);
    } else {
      Object.assign(qrTable, { rows: 0, columns: 0 });
    }
    const triggerResult = await client.query(`
      SELECT count(*)::int AS all_user_triggers,
             count(*) FILTER (WHERE t.tgname ILIKE '%guard%')::int AS guard_name_matches,
             count(*) FILTER (WHERE t.tgname ILIKE '%master%')::int AS master_name_matches,
             count(*) FILTER (WHERE p.proname = 'tf_qa_protect_master_data')::int AS qa_master_data_triggers,
             count(*) FILTER (WHERE p.proname = 'tf_qa_protect_master_data' AND t.tgenabled <> 'D')::int AS enabled_qa_master_data_triggers,
             count(DISTINCT t.tgrelid) FILTER (WHERE p.proname = 'tf_qa_protect_master_data')::int AS qa_guarded_tables,
             array_agg(DISTINCT c.relname ORDER BY c.relname) FILTER (WHERE p.proname = 'tf_qa_protect_master_data') AS qa_guarded_table_names,
             count(*) FILTER (WHERE t.tgenabled <> 'D')::int AS enabled_user_triggers,
             count(DISTINCT t.tgrelid)::int AS trigger_tables
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_proc p ON p.oid = t.tgfoid
      WHERE n.nspname = 'public' AND NOT t.tgisinternal
    `);

    const identity = identityResult.rows[0];
    const privileges = privilegesResult.rows[0];
    const triggers = triggerResult.rows[0];
    const actualAddress = String(identity.address || '').replace(/\/\d+$/, '');
    const readyForWrites = identity.database === config.name
      && identity.role === config.user
      && (!actualAddress || ['127.0.0.1', '::1'].includes(actualAddress))
      && !privileges.rolsuper
      && !privileges.rolcreatedb
      && !privileges.rolcreaterole
      && !privileges.rolreplication
      && !privileges.rolbypassrls
      && !privileges.inherits_elevated_role
      && privileges.can_connect_qa
      && !privileges.can_connect_dev
      && Number(tablesResult.rows[0].public_base_tables) === 90
      && qrTable.exists
      && Number(qrTable.columns) > 0
      && Number(triggers.qa_master_data_triggers) === 60
      && Number(triggers.enabled_qa_master_data_triggers) === 60
      && Number(triggers.qa_guarded_tables) === 30;

    console.log(JSON.stringify({
      profile: config.appEnv,
      expectedDatabase: config.name,
      identity,
      privileges,
      publicBaseTables: Number(tablesResult.rows[0].public_base_tables),
      appliedMigrations: { dev: localMigrations.length, qa: qaMigrations.length },
      migrationDifferences: {
        onlyInDev: localMigrations.filter((name) => !qaMigrationSet.has(name)),
        onlyInQa: qaMigrations.filter((name) => !devMigrationSet.has(name)),
      },
      extrusorasFormulas: { exists: qrTable.exists, rows: Number(qrTable.rows), columns: Number(qrTable.columns) },
      qaMasterDataGuard: {
        triggers: Number(triggers.qa_master_data_triggers),
        tablesWithAnyTrigger: Number(triggers.trigger_tables),
        triggersWithGuardName: Number(triggers.guard_name_matches),
        enabledGuardTriggers: Number(triggers.enabled_qa_master_data_triggers),
        guardedMasterTables: Number(triggers.qa_guarded_tables),
        unguardedMasterTables: MASTER_DATA_TABLES.filter(({ table }) => !(triggers.qa_guarded_table_names || []).includes(table)).map(({ table }) => table),
        triggersWithMasterName: Number(triggers.master_name_matches),
        allEnabledUserTriggers: Number(triggers.enabled_user_triggers),
        allUserTriggers: Number(triggers.all_user_triggers),
      },
      readyForWrites,
    }, null, 2));

    if (!readyForWrites) process.exitCode = 2;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  // Keep credentials and URLs out of errors; driver messages are not printed.
  console.error(JSON.stringify({ code: error.code || 'QA_READINESS_CHECK_FAILED', message: 'No se pudo demostrar la preparación QA con la conexión local autorizada.' }));
  process.exitCode = 1;
});
