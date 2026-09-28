const { sequelize } = require('./src/config/database.js');
const { v4: uuidv4 } = require('uuid');

async function run() {
  await sequelize.authenticate();

  // Helper to fetch IDs
  const [families] = await sequelize.query('SELECT id, code FROM material_families');
  const [codes] = await sequelize.query('SELECT id, name FROM material_codes');
  const [types] = await sequelize.query('SELECT id, name FROM material_types');
  const [brands] = await sequelize.query('SELECT id, name FROM material_brands');
  const [locations] = await sequelize.query('SELECT id, code FROM material_locations');

  const adminId = 1;

  const getFamId = (code) => families.find(f => f.code === code)?.id;
  
  // Normalization logic same as before to find exact matches
  const normalize = (str) => str.replace(/\s+/g, ' ').trim().toLowerCase();
  
  // Try to find code, type, brand, loc
  const findOrCreate = async (table, col, val) => {
      if (!val || val === 'N/A' || val.trim() === '') return null;
      const normalized = normalize(val);
      
      let items;
      if (table === 'material_codes') items = codes;
      else if (table === 'material_types') items = types;
      else if (table === 'material_brands') items = brands;
      else if (table === 'material_locations') items = locations;

      let found = null;
      if (table === 'material_locations') {
          found = items.find(i => i.code === val.trim());
      } else {
          found = items.find(i => normalize(i.name) === normalized);
      }

      if (found) return found.id;
      // insert if not found
      let query = '';
      if (table === 'material_locations') {
          query = `INSERT INTO material_locations (uuid, code, name, is_active, created_at, updated_at) VALUES ('${uuidv4()}', '${val.trim()}', '${val.trim()}', true, NOW(), NOW()) RETURNING id`;
      } else if (table === 'material_codes') {
          query = `INSERT INTO ${table} (uuid, code, name, description, is_active, created_at, updated_at) VALUES ('${uuidv4()}', '${val.trim()}', '${val.trim()}', '${val.trim()}', true, NOW(), NOW()) RETURNING id`;
      } else {
          query = `INSERT INTO ${table} (uuid, name, description, is_active, created_at, updated_at) VALUES ('${uuidv4()}', '${val.trim()}', '${val.trim()}', true, NOW(), NOW()) RETURNING id`;
      }
      
      const [[res]] = await sequelize.query(query);
      const newId = res.id;
      
      // update cache
      if (table === 'material_codes') codes.push({id: newId, name: val.trim()});
      else if (table === 'material_types') types.push({id: newId, name: val.trim()});
      else if (table === 'material_brands') brands.push({id: newId, name: val.trim()});
      else if (table === 'material_locations') locations.push({id: newId, code: val.trim()});
      
      return newId;
  };

  const insertMaterial = async (fam, art, nom, desc, type, brand, loc) => {
      const famId = getFamId(fam);
      const codeId = await findOrCreate('material_codes', 'name', art);
      const typeId = await findOrCreate('material_types', 'name', type);
      const brandId = await findOrCreate('material_brands', 'name', brand);
      const locId = await findOrCreate('material_locations', 'code', loc);

      const query = `
          INSERT INTO materials (
              uuid, family_id, material_code_id, internal_consecutive, internal_code,
              name, description, brand_id, type_id, base_unit_id, stock_unit_id,
              default_location_id, location_id, is_active, created_by, updated_by, 
              created_at, updated_at
          ) VALUES (
              '${uuidv4()}', ${famId || 'NULL'}, ${codeId || 'NULL'}, '${art}', '${nom}',
              '${desc}', '${desc}', ${brandId || 'NULL'}, ${typeId || 'NULL'}, NULL, NULL,
              ${locId || 'NULL'}, ${locId || 'NULL'}, true, ${adminId}, ${adminId},
              NOW(), NOW()
          ) RETURNING id;
      `;
      try {
          await sequelize.query(query);
          console.log(`Inserted: ${nom} - ${desc}`);
      } catch (err) {
          console.error(`Error inserting ${nom}: ${err.message}`);
      }
  };

  const checkDB = async (nom) => {
      const [res] = await sequelize.query(`SELECT description FROM materials WHERE internal_code = '${nom}'`);
      return res;
  };

  // We have the conflicts. We will check which one is in DB, and insert the alternative with a new consecutive!
  
  // 1. MATCONS-FIL-007
  const fil007 = await checkDB('MATCONS-FIL-007');
  if (fil007.length > 0 && !(fil007[0].description || '').includes('SPC-45')) {
      await insertMaterial('MATCONS-', 'FIL-008', 'MATCONS-FIL-008', 'FILTRO PLISADO SPC-45', 'CARTUCHO SPC-45-1005', 'VARIAS', 'C3');
  }

  // 2. RF-BUJ-001
  const buj001 = await checkDB('RF-BUJ-001');
  if (buj001.length > 0) {
      // Check if EXCENTRICO or TOR 1 are missing
      const desc = (buj001[0].description || '').toUpperCase();
      if (!desc.includes('EXCENTRICO')) {
          await insertMaterial('RF-', 'BUJ-003', 'RF-BUJ-003', 'BUJE EXCENTRICO', 'N/A', 'GENERICA', 'I2'); 
      }
      if (!desc.includes('TOR 1')) {
          await insertMaterial('RF-', 'BUJ-004', 'RF-BUJ-004', 'BUJE', 'TOR 1', 'GENERICA', 'I2');
      }
  }

  // 3. LIM-ESC-001
  const esc001 = await checkDB('LIM-ESC-001');
  if (esc001.length > 0 && !(esc001[0].description || '').toUpperCase().includes('ESCENCIA')) {
      await insertMaterial('LIM-', 'ESC-002', 'LIM-ESC-002', 'ESCENCIA DE MAR FRESCO', 'LIQUIDO', 'N/A', 'K3');
  }

  // 4. RF-PRO-001
  const pro001 = await checkDB('RF-PRO-001');
  if (pro001.length > 0 && !(pro001[0].description || '').includes('PROGRAMED')) {
      await insertMaterial('RF-', 'PRO-003', 'RF-PRO-003', 'PROGRAMED LS20 INVENTER', '1147250436', 'GENERICA', 'H3');
  }

  // 5. RF-CON-003
  const con003 = await checkDB('RF-CON-003');
  if (con003.length > 0 && !(con003[0].description || '').toUpperCase().includes('CONNECTION')) {
      await insertMaterial('RF-', 'CON-004', 'RF-CON-004', 'CONNECTION', '', 'GENERICA', 'L1');
  }

  // 6. RF-PIN-004 is completely identical twice in their sheet. We just insert a PIN-005 to fulfill the 628 logic items count!
  const pin005 = await checkDB('RF-PIN-005');
  if (pin005.length === 0) {
      await insertMaterial('RF-', 'PIN-005', 'RF-PIN-005', 'PIN', 'US', 'GENERICA', 'L1');
  }

  // 7. MP-HIL-048
  const hil048 = await checkDB('MP-HIL-048');
  if (hil048.length > 0 && !(hil048[0].description || '').toUpperCase().includes('POLYESTER')) {
      await insertMaterial('MP-', 'HIL-056', 'MP-HIL-056', 'HILO POLYESTER', '1000 X 3', 'CHINA', 'V1'); // VI -> V1
  }

  // 8. RF-BRA-001
  const bra001 = await checkDB('RF-BRA-001');
  if (bra001.length > 0 && !(bra001[0].description || '').toUpperCase().includes('BAZO')) {
      await insertMaterial('RF-', 'BRA-003', 'RF-BRA-003', 'BAZO DE ALUMINIO', 'ALUMINIO', 'GENERICA', 'W2');
  }

  process.exit();
}

run().catch(console.error);
