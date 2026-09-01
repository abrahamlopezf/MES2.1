const { Client } = require('pg');
require('dotenv').config();

async function fixConstraints() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'sistema_enterprise',
    user: 'postgres',
    password: process.env.DB_PASSWORD
  });
  await client.connect();

  console.log("Fetching all foreign keys for lotes...");
  const res = await client.query(`
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'lotes'::regclass AND contype = 'f'
  `);
  
  const fkeys = res.rows.map(r => r.conname);
  console.log(`Found ${fkeys.length} foreign keys. Dropping all of them...`);
  
  for (const fk of fkeys) {
    await client.query(`ALTER TABLE "public"."lotes" DROP CONSTRAINT "${fk}"`);
  }
  
  console.log("All dropped. Re-adding the 4 correct ones...");
  await client.query(`ALTER TABLE "public"."lotes" ADD CONSTRAINT "lotes_material_id_fkey" FOREIGN KEY (material_id) REFERENCES materials(id) ON UPDATE CASCADE`);
  await client.query(`ALTER TABLE "public"."lotes" ADD CONSTRAINT "lotes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE`);
  await client.query(`ALTER TABLE "public"."lotes" ADD CONSTRAINT "lotes_qr_id_fkey" FOREIGN KEY (qr_id) REFERENCES qr_codes(id) ON UPDATE CASCADE ON DELETE SET NULL`);
  await client.query(`ALTER TABLE "public"."lotes" ADD CONSTRAINT "lotes_location_id_fkey" FOREIGN KEY (location_id) REFERENCES material_locations(id) ON UPDATE CASCADE ON DELETE SET NULL`);
  
  console.log("Done!");
  await client.end();
  process.exit(0);
}

fixConstraints().catch(console.error);
