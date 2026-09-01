const { Client } = require('pg');
require('dotenv').config();

async function checkStats() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'sistema_enterprise',
    user: 'postgres',
    password: process.env.DB_PASSWORD
  });
  await client.connect();

  const query = `
    SELECT pid, wait_event_type, wait_event, state, query
    FROM pg_stat_activity
    WHERE state != 'idle' AND pid != pg_backend_pid()
  `;
  const res = await client.query(query);
  console.log("ACTIVE QUERIES:", res.rows);
  
  const locks = await client.query(`
    SELECT l.pid, l.mode, l.granted, a.query
    FROM pg_locks l
    JOIN pg_stat_activity a ON l.pid = a.pid
    WHERE l.granted = false
  `);
  console.log("WAITING LOCKS:", locks.rows);

  await client.end();
  process.exit(0);
}
checkStats().catch(console.error);
