const { Client } = require('pg');
const { performance } = require('perf_hooks');
require('dotenv').config();

async function rawTest() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'sistema_enterprise',
    user: 'postgres',
    password: process.env.DB_PASSWORD
  });

  console.log("Connecting...");
  let start = performance.now();
  await client.connect();
  let end = performance.now();
  console.log(`Connect took ${(end - start).toFixed(2)} ms`);

  console.log("Beginning transaction...");
  start = performance.now();
  await client.query('BEGIN');
  end = performance.now();
  console.log(`BEGIN took ${(end - start).toFixed(2)} ms`);

  console.log("Inserting...");
  start = performance.now();
  await client.query(`
    INSERT INTO "public"."lotes" ("material_id","folio","user_id","location_id","date_received","initial_amount","available_amount","notes","is_active","created_at","updated_at") 
    VALUES (569,'S/N-TEST-RAW',1,1,NOW(),10,10,'Perf test',true,NOW(),NOW())
  `);
  end = performance.now();
  console.log(`INSERT took ${(end - start).toFixed(2)} ms`);

  await client.query('ROLLBACK');
  await client.end();
  process.exit(0);
}
rawTest().catch(console.error);
