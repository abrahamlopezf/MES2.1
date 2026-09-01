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

  const res = await client.query(`SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'lotes'::regclass`);
  console.log("CONSTRAINTS:", res.rows);
  
  await client.end();
  process.exit(0);
}
checkStats().catch(console.error);
