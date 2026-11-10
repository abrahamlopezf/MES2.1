require('./backend/node_modules/dotenv').config({ path: 'backend/.env' });
const { Client } = require('./backend/node_modules/pg');
(async () => {
  const client = new Client({ host: '127.0.0.1', port: 5433, database: 'sistema_enterprise_ext_e2e_20261109', user: process.env.DB_USER, password: process.env.DB_PASSWORD, ssl: false });
  await client.connect();
  for (const sql of [
    "SELECT id,code,name FROM areas WHERE upper(code)='EXTRUSION'",
    "SELECT u.id,u.username,r.code AS role_code,r.area_id FROM users u JOIN roles r ON r.id=u.role_id WHERE upper(u.username) LIKE '%ALM%' OR r.code IN ('ADMIN_ALM','ADMIN_ALMACEN','WAREHOUSEMAN') ORDER BY u.id LIMIT 20",
    "SELECT column_name FROM information_schema.columns WHERE table_name='lotes' ORDER BY ordinal_position"
  ]) console.log(JSON.stringify((await client.query(sql)).rows));
  await client.end();
})().catch(e => { console.error(e.message); process.exitCode = 1; });
