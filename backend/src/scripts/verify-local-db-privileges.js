'use strict';

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

const ROOT = path.resolve(__dirname, '../..');
const appEnv = dotenv.parse(fs.readFileSync(path.join(ROOT, '.env')));
const migrators = dotenv.parse(fs.readFileSync(path.join(ROOT, '.env.migrator.local')));
if (appEnv.APP_ENV !== 'local' || !['127.0.0.1', 'localhost', '::1'].includes(appEnv.DB_HOST || '127.0.0.1')) {
  throw new Error('La auditoría de privilegios requiere el perfil local y host loopback.');
}

const dbs = [
  { db: 'sistema_enterprise', user: appEnv.DB_USER, password: appEnv.DB_PASSWORD, app: 'traceflow_app_local', migrator: 'traceflow_dev_migrator', qa: false },
  { db: 'sistema_enterprise_test', user: appEnv.DB_TEST_USER, password: appEnv.DB_TEST_PASSWORD, app: 'traceflow_app_test', migrator: 'traceflow_qa_migrator', qa: true },
];
const failures = [];
const checks = [];
const record = (name, pass, detail) => {
  checks.push({ name, status: pass ? 'APROBADO' : 'FALLIDO', detail });
  if (!pass) failures.push(name);
};

async function main() {
  for (const target of dbs) {
    if (!target.user || !target.password || target.user !== target.app) {
      throw new Error(`Credenciales de aplicación no corresponden al perfil ${target.db}.`);
    }
    const c = new Client({ host: appEnv.DB_HOST || '127.0.0.1', port: Number(appEnv.DB_PORT || 5432), database: target.db, user: target.user, password: target.password, ssl: false });
    await c.connect();
    try {
      const identity = await c.query('SELECT current_database() db,current_user usr,inet_server_addr()::text addr,inet_server_port() port');
      record(`${target.db}: identidad local`, identity.rows[0].db === target.db && identity.rows[0].usr === target.app && ['127.0.0.1/32','::1/128'].includes(identity.rows[0].addr), `${identity.rows[0].usr}@${identity.rows[0].db} ${identity.rows[0].addr}:${identity.rows[0].port}`);

      const attrs = await c.query('SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=current_user');
      record(`${target.db}: rol de runtime sin privilegios administrativos`, Object.values(attrs.rows[0]).every((v) => v === false), JSON.stringify(attrs.rows[0]));

      const privileges = await c.query(`
        SELECT has_database_privilege(current_user,current_database(),'CONNECT') can_connect,
          has_database_privilege(current_user,current_database(),'CREATE') can_create_database_objects,
          has_database_privilege(current_user,current_database(),'TEMP') can_create_temp,
          has_schema_privilege(current_user,'public','USAGE') schema_usage,
          has_schema_privilege(current_user,'public','CREATE') schema_create,
          has_table_privilege(current_user,'public.materials','SELECT') can_read_materials,
          has_table_privilege(current_user,'public.materials','UPDATE') can_update_materials,
          has_column_privilege(current_user,'public.silos','current_stock_kg','UPDATE') can_update_silo_stock,
          has_column_privilege(current_user,'public.silos','unit_cost','UPDATE') can_update_silo_cost,
          has_column_privilege(current_user,'public.looms','current_spools_count','UPDATE') can_update_loom_wip,
          has_column_privilege(current_user,'public.looms','code','UPDATE') can_update_loom_master,
          has_column_privilege(current_user,'public.extruders','status','UPDATE') can_update_extruder_status,
          has_table_privilege(current_user,'public.users','INSERT') can_create_user,
          has_table_privilege(current_user,'public.users','UPDATE') can_update_user,
          has_database_privilege('traceflow_app_test','sistema_enterprise','CONNECT') qa_to_dev,
          has_database_privilege('traceflow_app_local','sistema_enterprise_test','CONNECT') dev_to_qa
      `);
      const p = privileges.rows[0];
      record(`${target.db}: DDL bloqueado al runtime`, !p.can_create_database_objects && !p.can_create_temp && !p.schema_create, JSON.stringify({ dbCreate: p.can_create_database_objects, temp: p.can_create_temp, schemaCreate: p.schema_create }));
      record(`${target.db}: lectura de materiales`, p.schema_usage && p.can_read_materials, `schemaUsage=${p.schema_usage}, select=${p.can_read_materials}`);
      record(`${target.db}: escritura maestra`, target.qa ? !p.can_update_materials : p.can_update_materials, `materials.update=${p.can_update_materials}`);
      if (target.qa) {
        record(`${target.db}: columnas operativas autorizadas`, p.can_update_silo_stock && p.can_update_silo_cost && p.can_update_loom_wip && p.can_update_extruder_status,
          `silo.stock=${p.can_update_silo_stock}, silo.cost=${p.can_update_silo_cost}, loom.wip=${p.can_update_loom_wip}, extruder.status=${p.can_update_extruder_status}`);
        record(`${target.db}: columnas maestras de máquina bloqueadas`, !p.can_update_loom_master, `loom.code.update=${p.can_update_loom_master}`);
      }
      record(`${target.db}: operación de usuarios permitida`, p.can_create_user && p.can_update_user, `users.insert=${p.can_create_user}, users.update=${p.can_update_user}`);
      record(`${target.db}: aislamiento cruzado de conexión`, target.qa ? !p.qa_to_dev && !p.dev_to_qa : !p.qa_to_dev && !p.dev_to_qa, `QA->DEV=${p.qa_to_dev}, DEV->QA=${p.dev_to_qa}`);

      const roleAttrs = await c.query(`SELECT r.rolname,r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolreplication,r.rolbypassrls,
          has_database_privilege(r.rolname,$1,'CONNECT') can_connect FROM pg_roles r WHERE r.rolname IN ('traceflow_dev_migrator','traceflow_qa_migrator') ORDER BY r.rolname`, [target.db]);
      const expected = roleAttrs.rows.find((row) => row.rolname === target.migrator);
      const other = roleAttrs.rows.find((row) => row.rolname !== target.migrator);
      record(`${target.db}: migrador aislado y no administrativo`, !!expected && expected.can_connect && !expected.rolsuper && !expected.rolcreatedb && !expected.rolcreaterole && !expected.rolreplication && !expected.rolbypassrls && !!other && !other.can_connect, JSON.stringify(roleAttrs.rows.map(({ rolname, can_connect, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls }) => ({ rolname, can_connect, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls }))));
    } finally {
      await c.end();
    }

    const otherDb = target.db === 'sistema_enterprise' ? 'sistema_enterprise_test' : 'sistema_enterprise';
    const cross = new Client({ host: appEnv.DB_HOST || '127.0.0.1', port: Number(appEnv.DB_PORT || 5432), database: otherDb, user: target.user, password: target.password, ssl: false, connectionTimeoutMillis: 3000 });
    let rejected = false;
    try { await cross.connect(); }
    catch (error) { rejected = /permission denied for database|permiso denegado a la base de datos|no pg_hba\.conf entry|database .* does not exist/i.test(error.message); }
    finally { await cross.end().catch(() => {}); }
    record(`${target.app}: conexión directa a ${otherDb} rechazada`, rejected, rejected ? 'autenticación/conexión denegada como se esperaba' : 'la conexión cruzada no fue rechazada');

    const mig = migrators[`${target.qa ? 'TRACEFLOW_QA' : 'TRACEFLOW_DEV'}_MIGRATOR_USER`];
    const migPassword = migrators[`${target.qa ? 'TRACEFLOW_QA' : 'TRACEFLOW_DEV'}_MIGRATOR_PASSWORD`];
    if (mig !== target.migrator || !migPassword) throw new Error(`Credenciales de migración inválidas para ${target.db}.`);
    const m = new Client({ host: appEnv.DB_HOST || '127.0.0.1', port: Number(appEnv.DB_PORT || 5432), database: target.db, user: mig, password: migPassword, ssl: false });
    await m.connect();
    try {
      await m.query('BEGIN');
      await m.query('CREATE TABLE public.__traceflow_migrator_ddl_probe (id integer PRIMARY KEY)');
      await m.query('ROLLBACK');
      record(`${target.db}: DDL temporal permitido a migrador`, true, 'CREATE TABLE confirmado y revertido por rollback; ningún objeto persistió');
    } catch (error) {
      await m.query('ROLLBACK').catch(() => {});
      record(`${target.db}: DDL temporal permitido a migrador`, false, error.code || 'migrador sin permiso CREATE');
    } finally {
      await m.end();
    }
  }
  console.log(JSON.stringify({ allPassed: failures.length === 0, checks, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
