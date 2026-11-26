'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const {
  EnvironmentGuardError,
  resolveAppEnv,
  validateAndResolveDbConfig,
  verifyPostgresConnectionIdentity,
  assertLocalDatabaseOnly,
  assertSequelizeCliProfile,
} = require('../src/config/dbGuard');

const BASE_LOCAL_ENV = Object.freeze({
  APP_ENV: 'local',
  NODE_ENV: 'development',
  DB_HOST: '127.0.0.1',
  DB_PORT: '5432',
  DB_NAME: 'sistema_enterprise',
  DB_USER: 'traceflow_app_local',
  DB_PASSWORD: 'dummy_local_password',
  DB_TEST_USER: 'traceflow_app_test',
  DB_TEST_PASSWORD: 'dummy_test_password',
  DATABASE_URL: '',
  REMOTE_DATABASE_URL: '',
});

test('1. Configuración local válida permite resolver e iniciar el sistema en perfil local y test', () => {
  const localCfg = validateAndResolveDbConfig({ ...BASE_LOCAL_ENV });
  assert.equal(localCfg.appEnv, 'local');
  assert.equal(localCfg.isLocalOrTest, true);
  assert.equal(localCfg.useDatabaseUrl, false);
  assert.equal(localCfg.host, '127.0.0.1');
  assert.equal(localCfg.port, 5432);
  assert.equal(localCfg.name, 'sistema_enterprise');
  assert.equal(localCfg.user, 'traceflow_app_local');

  const testCfg = validateAndResolveDbConfig({
    ...BASE_LOCAL_ENV,
    APP_ENV: 'test',
    NODE_ENV: 'test',
    DB_NAME: 'sistema_enterprise_test',
  });
  assert.equal(testCfg.appEnv, 'test');
  assert.equal(testCfg.name, 'sistema_enterprise_test');
  assert.equal(testCfg.user, 'traceflow_app_test');
  assert.equal(testCfg.password, 'dummy_test_password');
});

test('1a. Los perfiles locales fallan cerrados si faltan credenciales específicas', () => {
  assert.throws(
    () => validateAndResolveDbConfig({ ...BASE_LOCAL_ENV, DB_USER: undefined }),
    (err) => err instanceof EnvironmentGuardError && err.code === 'MISSING_DB_USER'
  );
  assert.throws(
    () => validateAndResolveDbConfig({ ...BASE_LOCAL_ENV, DB_PASSWORD: '' }),
    (err) => err instanceof EnvironmentGuardError && err.code === 'MISSING_DB_PASSWORD'
  );
  assert.throws(
    () => validateAndResolveDbConfig({ ...BASE_LOCAL_ENV, APP_ENV: 'test', DB_NAME: 'sistema_enterprise_test', DB_TEST_PASSWORD: '' }),
    (err) => err instanceof EnvironmentGuardError && err.code === 'MISSING_DB_PASSWORD'
  );
});

test('2. URL remota (Neon Cloud / AWS / Render) es rechazada antes de conectarse en local o test', () => {
  const dummyNeonUrl = 'postgresql://fake_user:fake_pass@ep-dummy-host-12345.us-east-1.aws.neon.tech/neondb?sslmode=require';

  for (const urlVar of ['DATABASE_URL', 'REMOTE_DATABASE_URL', 'NEON_DATABASE_URL', 'POSTGRES_URL']) {
    assert.throws(
      () =>
        validateAndResolveDbConfig({
          ...BASE_LOCAL_ENV,
          [urlVar]: dummyNeonUrl,
        }),
      (err) =>
        err instanceof EnvironmentGuardError &&
        err.code === 'REMOTE_URL_FORBIDDEN_IN_LOCAL' &&
        !err.message.includes('fake_pass')
    );
  }
});

test('3. Configuración desconocida o host no local en DB_HOST es rechazada fail-closed', () => {
  assert.throws(
    () =>
      validateAndResolveDbConfig({
        ...BASE_LOCAL_ENV,
        APP_ENV: 'staging_unknown',
      }),
    (err) => err instanceof EnvironmentGuardError && err.code === 'INVALID_APP_ENV'
  );

  assert.throws(
    () =>
      validateAndResolveDbConfig({
        ...BASE_LOCAL_ENV,
        DB_HOST: '10.20.30.40',
      }),
    (err) => err instanceof EnvironmentGuardError && err.code === 'NON_LOCAL_DB_HOST_REJECTED'
  );

  assert.throws(
    () =>
      validateAndResolveDbConfig({
        ...BASE_LOCAL_ENV,
        DB_HOST: 'ep-dummy.us-east-1.aws.neon.tech',
      }),
    (err) => err instanceof EnvironmentGuardError && err.code === 'NON_LOCAL_DB_HOST_REJECTED'
  );
});

test('4. Base de datos no autorizada (neondb/production o base dev en APP_ENV=test) es rechazada', () => {
  for (const forbiddenDb of ['neondb', 'production', 'traceflow_prod', 'traceflow_uat']) {
    assert.throws(
      () =>
        validateAndResolveDbConfig({
          ...BASE_LOCAL_ENV,
          DB_NAME: forbiddenDb,
        }),
      (err) => err instanceof EnvironmentGuardError && err.code === 'UNAUTHORIZED_DB_NAME'
    );
  }

  assert.throws(
    () =>
      validateAndResolveDbConfig({
        ...BASE_LOCAL_ENV,
        APP_ENV: 'test',
        NODE_ENV: 'test',
        DB_NAME: 'sistema_enterprise',
      }),
    (err) => err instanceof EnvironmentGuardError && err.code === 'TEST_REQUIRES_ISOLATED_DB'
  );
});

test('5. Variable heredada del sistema operativo (PGHOST / DATABASE_URL) no puede sustituir la conexión local', () => {
  assert.throws(
    () =>
      validateAndResolveDbConfig({
        ...BASE_LOCAL_ENV,
        PGHOST: 'ep-inherited.us-east-1.aws.neon.tech',
      }),
    (err) => err instanceof EnvironmentGuardError && err.code === 'INHERITED_PGHOST_FORBIDDEN'
  );

  assert.throws(
    () =>
      validateAndResolveDbConfig({
        ...BASE_LOCAL_ENV,
        DATABASE_URL: 'postgresql://user:pass@db.external-cloud.example.com:5432/prod',
      }),
    (err) => err instanceof EnvironmentGuardError && err.code === 'REMOTE_URL_FORBIDDEN_IN_LOCAL'
  );
});

test('6. Cambiar NODE_ENV=production no habilita una conexión remota en ambiente local', () => {
  // Caso A: APP_ENV=local explícito pero un script cambia NODE_ENV='production' y tiene DATABASE_URL remota
  assert.throws(
    () =>
      validateAndResolveDbConfig({
        ...BASE_LOCAL_ENV,
        APP_ENV: 'local',
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@ep-dummy.us-east-1.aws.neon.tech/neondb',
      }),
    (err) => err instanceof EnvironmentGuardError && err.code === 'REMOTE_URL_FORBIDDEN_IN_LOCAL'
  );

  // Caso B: Sin APP_ENV definido, alguien cambia NODE_ENV='production' mientras DB_HOST es local
  assert.throws(
    () =>
      resolveAppEnv({
        NODE_ENV: 'production',
        DB_HOST: '127.0.0.1',
      }),
    (err) => err instanceof EnvironmentGuardError && err.code === 'AMBIGUOUS_NODE_ENV_ESCALATION'
  );
});

test('7. Configuración incompleta o malformada falla de manera segura (fail-closed)', () => {
  assert.throws(
    () =>
      validateAndResolveDbConfig({
        ...BASE_LOCAL_ENV,
        DB_NAME: '   ',
      }),
    (err) => err instanceof EnvironmentGuardError && err.code === 'EMPTY_DB_NAME'
  );

  assert.throws(
    () =>
      validateAndResolveDbConfig({
        ...BASE_LOCAL_ENV,
        DB_PORT: 'not_a_port',
      }),
    (err) => err instanceof EnvironmentGuardError && err.code === 'INVALID_DB_PORT'
  );

  assert.throws(
    () =>
      validateAndResolveDbConfig({
        APP_ENV: 'production',
        NODE_ENV: 'production',
        DATABASE_URL: '',
      }),
    (err) => err instanceof EnvironmentGuardError && err.code === 'MISSING_REMOTE_DATABASE_URL'
  );

  assert.throws(
    () =>
      validateAndResolveDbConfig({
        APP_ENV: 'uat',
        NODE_ENV: 'production',
        DATABASE_URL: 'http://not-postgres.example.com/db',
      }),
    (err) => err instanceof EnvironmentGuardError && err.code === 'INVALID_CONNECTION_PROTOCOL'
  );
});

test('8. Verificación post-conexión rechaza servidor cuya dirección efectiva o base de datos no coincida', async () => {
  const expected = validateAndResolveDbConfig({ ...BASE_LOCAL_ENV });

  const validMockSequelize = {
    query: async () => [[{ db: 'sistema_enterprise', usr: 'traceflow_app_local', addr: '127.0.0.1', port: 5432 }]],
  };
  const identity = await verifyPostgresConnectionIdentity(validMockSequelize, expected);
  assert.equal(identity.db, 'sistema_enterprise');

  const remoteAddrMockSequelize = {
    query: async () => [[{ db: 'sistema_enterprise', usr: 'traceflow_app_local', addr: '54.210.10.15', port: 5432 }]],
  };
  await assert.rejects(
    () => verifyPostgresConnectionIdentity(remoteAddrMockSequelize, expected),
    (err) => err instanceof EnvironmentGuardError && err.code === 'POST_CONNECT_REMOTE_ADDR_DETECTED'
  );

  const wrongDbMockSequelize = {
    query: async () => [[{ db: 'neondb', usr: 'traceflow_app_local', addr: '127.0.0.1', port: 5432 }]],
  };
  await assert.rejects(
    () => verifyPostgresConnectionIdentity(wrongDbMockSequelize, expected),
    (err) => err instanceof EnvironmentGuardError && err.code === 'POST_CONNECT_DB_MISMATCH'
  );

  const wrongUserMockSequelize = {
    query: async () => [[{ db: 'sistema_enterprise', usr: 'postgres', addr: '127.0.0.1', port: 5432 }]],
  };
  await assert.rejects(
    () => verifyPostgresConnectionIdentity(wrongUserMockSequelize, expected),
    (err) => err instanceof EnvironmentGuardError && err.code === 'POST_CONNECT_USER_MISMATCH'
  );

  assert.throws(
    () =>
      assertLocalDatabaseOnly({
        APP_ENV: 'production',
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://u:p@ep-prod.neon.tech/neondb',
      }),
    (err) => err instanceof EnvironmentGuardError && err.code === 'LOCAL_ONLY_OPERATION_BLOCKED'
  );
});

test('9. Sequelize CLI no puede escoger perfiles remotos desde un ambiente local o QA', () => {
  const local = validateAndResolveDbConfig({ ...BASE_LOCAL_ENV });
  const qa = validateAndResolveDbConfig({ ...BASE_LOCAL_ENV, APP_ENV: 'test', NODE_ENV: 'test', DB_NAME: 'sistema_enterprise_test' });
  const production = validateAndResolveDbConfig({ APP_ENV: 'production', NODE_ENV: 'production', DATABASE_URL: 'postgresql://fake:fake@db.invalid.example/prod' });

  assert.equal(assertSequelizeCliProfile('development', local), 'development');
  assert.throws(() => assertSequelizeCliProfile('production', local), (err) => err.code === 'SEQUELIZE_CLI_PROFILE_MISMATCH');
  assert.throws(() => assertSequelizeCliProfile('uat', local), (err) => err.code === 'SEQUELIZE_CLI_PROFILE_MISMATCH');
  assert.throws(() => assertSequelizeCliProfile('test', local), (err) => err.code === 'SEQUELIZE_CLI_TEST_PROFILE_REQUIRED');
  assert.equal(assertSequelizeCliProfile('test', qa), 'test');
  assert.equal(assertSequelizeCliProfile('production', production), 'production');
  assert.throws(() => assertSequelizeCliProfile('development', production), (err) => err.code === 'SEQUELIZE_CLI_LOCAL_PROFILE_MISMATCH');

  // Exercise the actual sequelize-cli config loader. It must fail before a
  // connection can be attempted when a local shell asks for --env production.
  const backendDir = path.resolve(__dirname, '..');
  const child = spawnSync(process.execPath, [
    '-e',
    "process.argv.push('--env', 'production'); require('./src/config/sequelize-cli.config')",
  ], {
    cwd: backendDir,
    encoding: 'utf8',
    env: {
      ...process.env,
      APP_ENV: 'local',
      NODE_ENV: 'development',
      DB_HOST: '127.0.0.1',
      DB_PORT: '5432',
      DB_NAME: 'sistema_enterprise',
      DB_USER: 'traceflow_app_local',
      DB_PASSWORD: 'dummy_local_password',
      DATABASE_URL: '',
    },
  });
  assert.notEqual(child.status, 0);
  assert.match(`${child.stdout}\n${child.stderr}`, /SEQUELIZE_CLI_PROFILE_MISMATCH/);
  assert.doesNotMatch(`${child.stdout}\n${child.stderr}`, /fake_pass|postgresql:\/\//);
});
