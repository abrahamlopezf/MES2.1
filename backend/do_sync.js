require('dotenv').config();
if (!process.env.REMOTE_DATABASE_URL) throw new Error('REMOTE_DATABASE_URL is required for this script.');
if (!process.env.LOCAL_DB_PASSWORD) throw new Error('LOCAL_DB_PASSWORD is required for this script.');
if (process.env.ALLOW_REMOTE_SYNC !== 'YES') throw new Error('Set ALLOW_REMOTE_SYNC=YES only after reviewing the remote data changes.');
const { Client } = require('pg');

async function doSync() {
  const localClient = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'sistema_enterprise',
    user: 'postgres',
    password: process.env.LOCAL_DB_PASSWORD
  });

  const neonClient = new Client({
    connectionString: process.env.REMOTE_DATABASE_URL
  });

  try {
    await localClient.connect();
    await neonClient.connect();

    // 1. Get locations from both to create a mapping
    const localLoc = await localClient.query('SELECT id, uuid FROM material_locations');
    const neonLoc = await neonClient.query('SELECT id, uuid FROM material_locations');

    const neonLocByUuid = new Map();
    neonLoc.rows.forEach(r => neonLocByUuid.set(r.uuid, r.id));

    // Create a map from local ID -> neon ID
    const localIdToNeonId = new Map();
    localLoc.rows.forEach(l => {
      if (neonLocByUuid.has(l.uuid)) {
        localIdToNeonId.set(l.id, neonLocByUuid.get(l.uuid));
      }
    });

    // 2. Get materials
    const localMat = await localClient.query('SELECT uuid, default_location_id FROM materials WHERE deleted_at IS NULL AND default_location_id IS NOT NULL');
    
    await neonClient.query('BEGIN');
    
    let updated = 0;
    for (const m of localMat.rows) {
      const targetLocId = localIdToNeonId.get(m.default_location_id);
      if (targetLocId) {
        await neonClient.query('UPDATE materials SET default_location_id = $1 WHERE uuid = $2', [targetLocId, m.uuid]);
        updated++;
      }
    }
    
    await neonClient.query('COMMIT');
    console.log(`Successfully updated ${updated} materials in Neon database.`);

  } catch (error) {
    await neonClient.query('ROLLBACK');
    console.error(error);
  } finally {
    await localClient.end();
    await neonClient.end();
  }
}

doSync();
