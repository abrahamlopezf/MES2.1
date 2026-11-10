require('./backend/node_modules/dotenv').config({ path: 'backend/.env' });
const { Client } = require('./backend/node_modules/pg');
(async () => {
  const name = 'sistema_enterprise_ext_e2e_20261109';
  const client = new Client({ host: '127.0.0.1', port: 5433, database: 'postgres', user: process.env.DB_USER, password: process.env.DB_PASSWORD, ssl: false });
  await client.connect();
  const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
  if (exists.rowCount) { console.log('TEST_DATABASE_ALREADY_EXISTS'); await client.end(); return; }
  const active = await client.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = 'sistema_enterprise' AND pid <> pg_backend_pid()");
  if (active.rows[0].n) throw new Error('Source DB has active sessions: ' + active.rows[0].n);
  await client.query('CREATE DATABASE ' + name + ' TEMPLATE sistema_enterprise OWNER postgres');
  console.log('CREATED_ISOLATED_LOCAL_COPY ' + name);
  await client.end();
})().catch(error => { console.error(error.message); process.exitCode = 1; });
