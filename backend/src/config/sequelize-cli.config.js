'use strict';

process.env.TZ = process.env.TZ || 'America/Mexico_City';
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const { validateAndResolveDbConfig, assertSequelizeCliProfile, EnvironmentGuardError } = require('./dbGuard');

const common = {
  dialect: 'postgres',
  timezone: 'America/Mexico_City',
  migrationStorageTableName: 'sequelize_meta',
  seederStorage: 'sequelize',
  seederStorageTableName: 'sequelize_data',
};

const currentValidation = validateAndResolveDbConfig(process.env);
const explicitCliEnv = process.argv.find((arg) => arg.startsWith('--env='))?.slice('--env='.length)
  || (process.argv.includes('--env') ? process.argv[process.argv.indexOf('--env') + 1] : null);
const cliEnvironment = explicitCliEnv || process.env.NODE_ENV || 'development';
assertSequelizeCliProfile(cliEnvironment, currentValidation);

function getMigratorCredentials(appEnv) {
  if (appEnv === 'local' || appEnv === 'test') {
    dotenv.config({ path: path.resolve(__dirname, '../../.env.migrator.local') });
  }

  const prefix = appEnv === 'test' ? 'TRACEFLOW_QA_MIGRATOR' : 'TRACEFLOW_DEV_MIGRATOR';
  const username = process.env[`${prefix}_USER`]?.trim();
  const password = process.env[`${prefix}_PASSWORD`];
  if (!username || !password) {
    throw new EnvironmentGuardError(
      'MISSING_MIGRATOR_CREDENTIALS',
      `Se requieren ${prefix}_USER y ${prefix}_PASSWORD para ejecutar migraciones en APP_ENV='${appEnv}'.`
    );
  }
  return { username, password };
}

const remoteConfig = {
  use_env_variable: 'DATABASE_URL',
  dialect: 'postgres',
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false },
  },
  logging: false,
  ...common,
};

const localMigrationConfig = () => {
  const credentials = getMigratorCredentials(currentValidation.appEnv);
  return {
    username: credentials.username,
    password: credentials.password,
    database: currentValidation.name,
    host: currentValidation.host,
    port: currentValidation.port,
    logging: false,
    ...common,
  };
};

const localConfig = currentValidation.isRemoteEnv ? remoteConfig : localMigrationConfig();

module.exports = {
  local: localConfig,
  development: localConfig,
  test: localConfig,
  uat: remoteConfig,
  production: remoteConfig,
};
