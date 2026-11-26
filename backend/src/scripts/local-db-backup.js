'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '../..');
const appEnv = dotenv.parse(fs.readFileSync(path.join(ROOT, '.env')));
const migratorEnvPath = path.join(ROOT, '.env.migrator.local');
if (appEnv.APP_ENV !== 'local' || !['127.0.0.1', 'localhost', '::1'].includes(appEnv.DB_HOST || '127.0.0.1')) {
  throw new Error('Respaldos detenidos: se requiere APP_ENV=local y DB_HOST loopback.');
}
for (const key of ['DATABASE_URL', 'REMOTE_DATABASE_URL', 'NEON_DATABASE_URL', 'POSTGRES_URL']) {
  if (appEnv[key] && !/^(postgres|postgresql):\/\/(?:[^@/]+@)?(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?\//i.test(appEnv[key])) {
    throw new Error(`Respaldos detenidos: ${key} debe estar vacío o apuntar a loopback.`);
  }
}
if (!fs.existsSync(migratorEnvPath)) throw new Error('Falta backend/.env.migrator.local.');
const migrators = dotenv.parse(fs.readFileSync(migratorEnvPath));
const pgBin = 'C:/Program Files/PostgreSQL/18/bin';
const outputDir = path.join(ROOT, 'tmp', 'db-backups');
fs.mkdirSync(outputDir, { recursive: true });
const stamp = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
}).format(new Date()).replace(/[^0-9]/g, '');

const dbs = [
  { name: 'sistema_enterprise', prefix: 'TRACEFLOW_DEV_MIGRATOR' },
  { name: 'sistema_enterprise_test', prefix: 'TRACEFLOW_QA_MIGRATOR' },
];
const results = [];
for (const { name, prefix } of dbs) {
  const user = migrators[`${prefix}_USER`];
  const password = migrators[`${prefix}_PASSWORD`];
  if (!user || !password) throw new Error(`Faltan credenciales protegidas para respaldo ${name}.`);
  const archive = path.join(outputDir, `${name}-${stamp}.dump`);
  const childEnv = { ...process.env, PGPASSWORD: password };
  execFileSync(path.join(pgBin, 'pg_dump.exe'), [
    '-h', appEnv.DB_HOST || '127.0.0.1', '-p', appEnv.DB_PORT || '5432',
    '-U', user, '-Fc', '-f', archive, name,
  ], { env: childEnv, stdio: 'pipe' });
  const listing = execFileSync(path.join(pgBin, 'pg_restore.exe'), ['--list', archive], {
    env: childEnv, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  const data = fs.readFileSync(archive);
  results.push({
    database: name,
    archive: path.relative(ROOT, archive).replace(/\\/g, '/'),
    bytes: data.length,
    sha256: crypto.createHash('sha256').update(data).digest('hex'),
    archiveEntries: listing.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith(';')).length,
  });
}
const manifest = path.join(outputDir, `manifest-${stamp}.json`);
fs.writeFileSync(manifest, JSON.stringify({ generatedAt: new Date().toISOString(), localOnly: true, backups: results }, null, 2));
console.log(JSON.stringify({ manifest: path.relative(ROOT, manifest).replace(/\\/g, '/'), backups: results }, null, 2));
