const { Client } = require('pg');

async function fixAndSync() {
  const localClient = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'sistema_enterprise',
    user: 'postgres',
    password: 'QhBv47RkNK$1096'
  });

  const neonClient = new Client({
    connectionString: 'postgresql://neondb_owner:npg_ZyON69GToUgJ@ep-icy-shadow-avk05pd7.c-11.us-east-1.aws.neon.tech/neondb?sslmode=require'
  });

  try {
    await localClient.connect();
    await neonClient.connect();

    console.log('Fetching foreign keys in Neon to clean up conflicts...');
    const fkQuery = await neonClient.query(`
      SELECT tc.constraint_name, ccu.table_name AS foreign_table_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'materials' AND kcu.column_name = 'default_location_id';
    `);

    for (const row of fkQuery.rows) {
      if (row.foreign_table_name !== 'material_locations') {
        console.log(`Dropping conflicting foreign key: ${row.constraint_name}`);
        await neonClient.query(`ALTER TABLE materials DROP CONSTRAINT IF EXISTS "${row.constraint_name}"`);
      }
    }

    console.log('Mapping locations between Local and Neon...');
    const localLoc = await localClient.query('SELECT id, uuid FROM material_locations');
    const neonLoc = await neonClient.query('SELECT id, uuid FROM material_locations');

    const neonLocByUuid = new Map();
    neonLoc.rows.forEach(r => neonLocByUuid.set(r.uuid, r.id));

    const localIdToNeonId = new Map();
    localLoc.rows.forEach(l => {
      if (neonLocByUuid.has(l.uuid)) {
        localIdToNeonId.set(l.id, neonLocByUuid.get(l.uuid));
      }
    });

    console.log('Syncing default_location_id...');
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
    console.log(`¡Éxito! Se actualizaron ${updated} materiales en la base de datos de Vercel (Neon).`);

  } catch (error) {
    await neonClient.query('ROLLBACK');
    console.error('Ocurrió un error:', error);
  } finally {
    await localClient.end();
    await neonClient.end();
  }
}

fixAndSync();
