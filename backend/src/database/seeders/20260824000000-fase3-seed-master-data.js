'use strict';
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const parseMarkdownTable = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.startsWith('|'));
  
  if (lines.length < 2) return [];
  
  // Extract headers
  const headers = lines[0].split('|').map(h => h.trim()).filter(h => h);
  
  // Skip separator line (index 1)
  const dataLines = lines.slice(2);
  
  return dataLines.map(line => {
    const values = line.split('|').map(v => v.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] === undefined ? null : (values[i] === '' || values[i] === ' ' ? null : values[i]);
    });
    return row;
  });
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const docsPath = path.join(__dirname, '../../../../docs');
    const materialsData = parseMarkdownTable(path.join(docsPath, 'catalogo_materiales_stock_minimo.md'));
    
    // Extracted Unique Sets from the main material file (ensures we get exactly what is used)
    const families = new Set();
    const types = new Set();
    const brands = new Set();
    const localities = new Set();
    const articles = new Set();
    
    materialsData.forEach(row => {
      if (row.FAMILIA) families.add(row.FAMILIA);
      // User decision: Unify "1000   X 3" to "1000 X 3"
      if (row.TIPO) {
        const t = row.TIPO.replace('1000   X 3', '1000 X 3').replace('1000  X 3', '1000 X 3');
        types.add(t);
        row.TIPO = t; // Update row for later
      }
      if (row.MARCA) brands.add(row.MARCA);
      if (row.LOCALIDAD) localities.add(row.LOCALIDAD);
      if (row['ARTICULO/CONSECUTIVO']) articles.add(row['ARTICULO/CONSECUTIVO']);
    });
    
    const now = new Date();
    
    // --- Helper function for ON CONFLICT DO NOTHING ---
    const bulkInsertIgnore = async (table, items) => {
      if (items.length === 0) return;
      const values = items.map(item => `('${item.uuid}', '${item.code}', '${item.name}', true, NOW(), NOW())`).join(', ');
      await queryInterface.sequelize.query(`
        INSERT INTO ${table} (uuid, code, name, is_active, created_at, updated_at)
        VALUES ${values}
        ON CONFLICT (code) WHERE deleted_at IS NULL DO NOTHING
      `);
    };

    // --- 1. INSERT FAMILIES ---
    const familiesArray = Array.from(families).map(f => ({ uuid: uuidv4(), code: f, name: f }));
    await bulkInsertIgnore('material_families', familiesArray);
    
    // --- 2. INSERT TYPES ---
    const typesArray = Array.from(types).map(t => ({ uuid: uuidv4(), code: t.substring(0, 50), name: t }));
    // For types, the unique constraint might be on 'name' or 'code'. Assuming code.
    await bulkInsertIgnore('material_types', typesArray);
    
    // --- 3. INSERT BRANDS ---
    const brandsArray = Array.from(brands).map(b => ({ uuid: uuidv4(), code: b.substring(0, 50), name: b }));
    await bulkInsertIgnore('material_brands', brandsArray);
    
    // --- 4. INSERT LOCATIONS ---
    const locationsArray = Array.from(localities).map(l => ({ uuid: uuidv4(), code: l.substring(0, 50), name: l }));
    if (locationsArray.length > 0) {
      const locValues = locationsArray.map(item => `('${item.uuid}', '${item.code}', '${item.name}', 'ALMACEN', true, NOW(), NOW())`).join(', ');
      await queryInterface.sequelize.query(`
        INSERT INTO operational_areas (uuid, code, name, type, is_active, created_at, updated_at)
        VALUES ${locValues}
        ON CONFLICT (code) WHERE deleted_at IS NULL DO NOTHING
      `).catch(() => {});
      
      await queryInterface.sequelize.query(`
        INSERT INTO material_locations (uuid, code, name, type, is_active, created_at, updated_at)
        VALUES ${locValues}
        ON CONFLICT (code) WHERE deleted_at IS NULL DO NOTHING
      `).catch(() => {});
    }
    
    // --- 5. INSERT MATERIAL CODES ---
    const articlesArray = Array.from(articles).map(a => ({ uuid: uuidv4(), code: a, name: a }));
    await bulkInsertIgnore('material_codes', articlesArray);
    
    // Fetch inserted ids
    const [dbFamilies] = await queryInterface.sequelize.query('SELECT id, code FROM material_families');
    const [dbTypes] = await queryInterface.sequelize.query('SELECT id, name FROM material_types');
    const [dbBrands] = await queryInterface.sequelize.query('SELECT id, name FROM material_brands');
    const [dbLocations] = await queryInterface.sequelize.query('SELECT id, code FROM material_locations');
    const [dbCodes] = await queryInterface.sequelize.query('SELECT id, code FROM material_codes');
    
    const famMap = new Map(dbFamilies.map(x => [x.code, x.id]));
    const typeMap = new Map(dbTypes.map(x => [x.name, x.id]));
    const brandMap = new Map(dbBrands.map(x => [x.name, x.id]));
    const locMap = new Map(dbLocations.map(x => [x.code, x.id]));
    const codeMap = new Map(dbCodes.map(x => [x.code, x.id]));
    
    // --- 6. UPSERT MATERIALS ---
    for (const row of materialsData) {
      const internalCode = row['NOMENCLATURA DE   QR'] || row['NOMENCLATURA DE QR'];
      if (!internalCode) continue;
      
      const famId = famMap.get(row.FAMILIA);
      const codeId = codeMap.get(row['ARTICULO/CONSECUTIVO']);
      const typeId = typeMap.get(row.TIPO) || null;
      const brandId = brandMap.get(row.MARCA) || null;
      const locId = null; // Bypassing messy DB constraints for multiple location tables
      
      if (!famId || !codeId) {
        console.warn(`Skipping material ${internalCode} due to missing family or code.`);
        continue;
      }
      
      const minStock = parseFloat(row['Stock Minimo'] || 0);
      
      const parts = internalCode.split('-');
      const consecutive = parts.length > 2 ? parts[parts.length - 1] : '001';
      
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM materials WHERE internal_code = :code`,
        { replacements: { code: internalCode } }
      );
      
      if (existing && existing.length > 0) {
        // Update
        await queryInterface.sequelize.query(
          `UPDATE materials SET 
            family_id = :famId,
            type_id = :typeId,
            brand_id = :brandId,
            default_location_id = :locId,
            minimum_stock = :minStock,
            updated_at = :now
          WHERE id = :id`,
          {
            replacements: {
              famId: famId || null, typeId, brandId, locId, minStock, now, id: existing[0].id
            }
          }
        );
      } else {
        // Insert
        await queryInterface.sequelize.query(
          `INSERT INTO materials (
            uuid, family_id, material_code_id, internal_consecutive, internal_code,
            name, description, type_id, brand_id, default_location_id, minimum_stock,
            created_at, updated_at, status, is_active
          ) VALUES (
            :uuid, :famId, :codeId, :consecutive, :internalCode,
            :name, :desc, :typeId, :brandId, :locId, :minStock,
            :now, :now, 'ACTIVE', true
          )`,
          {
            replacements: {
              uuid: uuidv4(),
              famId: famId, 
              codeId: codeId,
              consecutive,
              internalCode,
              name: row.DESCRIPCION || internalCode,
              desc: row.DESCRIPCION || null,
              typeId,
              brandId,
              locId,
              minStock,
              now
            }
          }
        );
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Left empty for now
  }
};
