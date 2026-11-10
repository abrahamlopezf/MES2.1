require('dotenv').config();
if (!process.env.REMOTE_DATABASE_URL) throw new Error('REMOTE_DATABASE_URL is required for this script.');
if (!process.env.LOCAL_DB_PASSWORD) throw new Error('LOCAL_DB_PASSWORD is required for this script.');
const { Client } = require('pg');

async function checkSync() {
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

    const localMat = await localClient.query('SELECT uuid, default_location_id FROM materials WHERE deleted_at IS NULL');
    const neonMat = await neonClient.query('SELECT uuid, default_location_id FROM materials WHERE deleted_at IS NULL');
    
    let matchCount = 0;
    let updateNeeded = 0;

    const neonMap = new Map();
    neonMat.rows.forEach(r => neonMap.set(r.uuid, r.default_location_id));

    localMat.rows.forEach(l => {
      if (neonMap.has(l.uuid)) {
        matchCount++;
        const neonLocId = neonMap.get(l.uuid);
        if (l.default_location_id !== neonLocId) {
          updateNeeded++;
        }
      }
    });

    console.log(`Local materials: ${localMat.rowCount}`);
    console.log(`Neon materials: ${neonMat.rowCount}`);
    console.log(`Matching UUIDs: ${matchCount}`);
    console.log(`Updates needed for default_location_id: ${updateNeeded}`);

  } catch (error) {
    console.error(error);
  } finally {
    await localClient.end();
    await neonClient.end();
  }
}

checkSync();
