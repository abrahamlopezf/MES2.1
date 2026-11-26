'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '../..');
const config = dotenv.parse(fs.readFileSync(path.join(ROOT, '.env')));
for (const key of ['DATABASE_URL', 'REMOTE_DATABASE_URL', 'NEON_DATABASE_URL', 'POSTGRES_URL']) {
  if (config[key] && !/^(postgres|postgresql):\/\/(?:[^@/]+@)?(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?\//i.test(config[key])) {
    throw new Error(`Pruebas de integración detenidas: ${key} no debe apuntar a una base remota.`);
  }
}
if (!['127.0.0.1', 'localhost', '::1'].includes(config.DB_HOST || '127.0.0.1')) {
  throw new Error('Pruebas de integración detenidas: DB_HOST debe ser loopback.');
}

const testFiles = fs.readdirSync(path.join(ROOT, 'test'))
  .filter((name) => name.endsWith('.local.integration.test.js'))
  .sort()
  .map((name) => path.join('test', name));
if (!testFiles.length) throw new Error('No se encontraron pruebas locales de integración.');

const result = spawnSync(process.execPath, ['--test', ...testFiles], {
  cwd: ROOT,
  stdio: 'inherit',
  env: {
    ...process.env,
    APP_ENV: 'test',
    NODE_ENV: 'test',
    DB_NAME: config.DB_TEST_NAME || 'sistema_enterprise_test',
    DB_HOST: config.DB_HOST || '127.0.0.1',
    DB_PORT: config.DB_PORT || '5432',
  },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
