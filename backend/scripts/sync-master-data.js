require('dotenv').config();
const { Sequelize } = require('sequelize');

async function syncToProd() {
  console.log('🔄 Iniciando sincronización de Master Data: Local DB -> Producción DB');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: No se encontró DATABASE_URL en el archivo .env');
    process.exit(1);
  }

  const localDb = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  });

  const prodDb = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
  });

  try {
    await localDb.authenticate();
    await prodDb.authenticate();
    console.log('✅ Conexiones a BD Local y Producción (Neon) establecidas.');
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    process.exit(1);
  }

  // Helper to sync simple catalogs (no FKs)
  const syncCatalog = async (tableName, conflictKey = 'code') => {
    process.stdout.write(`⏳ Sincronizando ${tableName}... `);
    const [localRows] = await localDb.query(`SELECT * FROM ${tableName} WHERE deleted_at IS NULL`);
    if (localRows.length === 0) { console.log('0 filas.'); return; }

    let inserted = 0, updated = 0;
    for (const row of localRows) {
      const { id, ...data } = row; // exclude local ID
      const keys = Object.keys(data);
      const conflictValue = data[conflictKey];

      const [existing] = await prodDb.query(`SELECT id FROM ${tableName} WHERE ${conflictKey} = :val`, {
        replacements: { val: conflictValue }
      });

      if (existing.length > 0) {
        // Exclude uuid from update to avoid constraint violations
        const { uuid, ...updateData } = data;
        const updateKeys = Object.keys(updateData);
        const setClause = updateKeys.map(k => `"${k}" = :${k}`).join(', ');
        
        await prodDb.query(`UPDATE ${tableName} SET ${setClause} WHERE ${conflictKey} = :conflictVal`, {
          replacements: { ...updateData, conflictVal: conflictValue }
        });
        updated++;
      } else {
        const { v4: uuidv4 } = require('uuid');
        data.uuid = uuidv4(); // Generate a new UUID for Prod to prevent any collision
        const cols = keys.map(k => `"${k}"`).join(', ');
        const placeholders = keys.map(k => `:${k}`).join(', ');
        await prodDb.query(`INSERT INTO ${tableName} (${cols}) VALUES (${placeholders})`, {
          replacements: data
        });
        inserted++;
      }
    }
    console.log(`✅ Insertados: ${inserted} | Actualizados: ${updated}`);
  };

  await syncCatalog('material_families');
  await syncCatalog('material_types');
  await syncCatalog('material_brands');
  await syncCatalog('material_codes');
  await syncCatalog('operational_areas');
  await syncCatalog('material_locations');

  // Sync Materials (Complex due to FKs)
  process.stdout.write(`⏳ Sincronizando materials... `);
  
  // 1. Fetch Local Materials with their resolved codes/names for FKs
  const [localMaterials] = await localDb.query(`
    SELECT m.*, 
           f.code as fam_code, 
           t.name as type_name, 
           b.name as brand_name, 
           c.code as code_val,
           l.code as loc_code
    FROM materials m
    LEFT JOIN material_families f ON m.family_id = f.id
    LEFT JOIN material_types t ON m.type_id = t.id
    LEFT JOIN material_brands b ON m.brand_id = b.id
    LEFT JOIN material_codes c ON m.material_code_id = c.id
    LEFT JOIN material_locations l ON m.default_location_id = l.id
    WHERE m.deleted_at IS NULL
  `);

  if (localMaterials.length === 0) {
    console.log('0 filas.');
  } else {
    // 2. Fetch Prod mappings
    const [prodFam] = await prodDb.query('SELECT id, code FROM material_families');
    const [prodType] = await prodDb.query('SELECT id, name FROM material_types');
    const [prodBrand] = await prodDb.query('SELECT id, name FROM material_brands');
    const [prodCode] = await prodDb.query('SELECT id, code FROM material_codes');
    const [prodLoc] = await prodDb.query('SELECT id, code FROM material_locations');

    const mapFam = Object.fromEntries(prodFam.map(x => [x.code, x.id]));
    const mapType = Object.fromEntries(prodType.map(x => [x.name, x.id]));
    const mapBrand = Object.fromEntries(prodBrand.map(x => [x.name, x.id]));
    const mapCode = Object.fromEntries(prodCode.map(x => [x.code, x.id]));
    const mapLoc = Object.fromEntries(prodLoc.map(x => [x.code, x.id]));

    let insMat = 0, updMat = 0, skipMat = 0;

    for (const m of localMaterials) {
      if (!m.internal_code) continue;

      // Resolve Prod IDs
      const pFamId = m.fam_code ? mapFam[m.fam_code] : null;
      const pTypeId = m.type_name ? mapType[m.type_name] : null;
      const pBrandId = m.brand_name ? mapBrand[m.brand_name] : null;
      const pCodeId = m.code_val ? mapCode[m.code_val] : null;
      const pLocId = m.loc_code ? mapLoc[m.loc_code] : null;

      // Only skip if essential relations are missing and they are strictly required.
      // Usually family_id is required.
      if (!pFamId && m.family_id) {
         skipMat++;
         continue;
      }

      // Check if exists in prod
      const [existing] = await prodDb.query(`SELECT id FROM materials WHERE internal_code = :code`, {
        replacements: { code: m.internal_code }
      });

      // Prepare data
      const { id, fam_code, type_name, brand_name, code_val, loc_code, ...baseData } = m;
      const dataToSave = {
        ...baseData,
        family_id: pFamId,
        type_id: pTypeId,
        brand_id: pBrandId,
        material_code_id: pCodeId,
        default_location_id: pLocId
      };

      if (existing.length > 0) {
        // Update (exclude uuid)
        const { uuid, ...updateData } = dataToSave;
        const updateKeys = Object.keys(updateData);
        const setClause = updateKeys.map(k => `"${k}" = :${k}`).join(', ');
        
        await prodDb.query(`UPDATE materials SET ${setClause} WHERE internal_code = :conflictVal`, {
          replacements: { ...updateData, conflictVal: m.internal_code }
        });
        updMat++;
      } else {
        // Insert
        const { v4: uuidv4 } = require('uuid');
        dataToSave.uuid = uuidv4(); // Generate a new UUID for Prod to prevent any collision
        const cols = Object.keys(dataToSave).map(k => `"${k}"`).join(', ');
        const placeholders = Object.keys(dataToSave).map(k => `:${k}`).join(', ');
        await prodDb.query(`INSERT INTO materials (${cols}) VALUES (${placeholders})`, {
          replacements: dataToSave
        });
        insMat++;
      }
    }
    console.log(`✅ Insertados: ${insMat} | Actualizados: ${updMat} | Omitidos por FK error: ${skipMat}`);
  }

  console.log('\n🎉 Sincronización DB Local -> DB Nube finalizada.');
  process.exit(0);
}

syncToProd();
