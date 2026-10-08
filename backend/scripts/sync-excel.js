const xlsx = require('xlsx');
const path = require('path');
const db = require('../src/database/models');
const { Op } = require('sequelize'); // Importación directa desde la librería

function findDuplicates(data, columnName, sheetName) {
  const seen = new Set();
  const duplicates = new Set();
  
  for (const row of data) {
    const value = row[columnName] ? String(row[columnName]).trim() : null;
    if (!value) continue;
    
    if (seen.has(value)) {
      duplicates.add(value);
    } else {
      seen.add(value);
    }
  }
  
  const duplicatesArray = Array.from(duplicates);
  if (duplicatesArray.length > 0) {
    console.error(`❌ ERROR: Duplicados en la hoja '${sheetName}' para la columna '${columnName}':`);
    console.error(duplicatesArray.join(', '));
    return true;
  }
  return false;
}

async function syncMasterData() {
  const filePath = path.join(__dirname, '../../docs/Libro1_Corregido.xlsx');
  const workbook = xlsx.readFile(filePath);
  
  try {
    console.log("Iniciando validación del Excel...");
    
    const familiasData = xlsx.utils.sheet_to_json(workbook.Sheets['Familias']);
    const tiposData = xlsx.utils.sheet_to_json(workbook.Sheets['Tipos']);
    const marcasData = xlsx.utils.sheet_to_json(workbook.Sheets['Marcas']);
    const locData = xlsx.utils.sheet_to_json(workbook.Sheets['Localidades']);
    const matData = xlsx.utils.sheet_to_json(workbook.Sheets['Materiales']);

    let hasErrors = false;
    hasErrors = findDuplicates(familiasData, 'NOMENCLATURA', 'Familias') || hasErrors;
    hasErrors = findDuplicates(tiposData, 'TIPO', 'Tipos') || hasErrors;
    hasErrors = findDuplicates(marcasData, 'MARCA', 'Marcas') || hasErrors;
    hasErrors = findDuplicates(locData, 'LOCALIDAD', 'Localidades') || hasErrors;
    hasErrors = findDuplicates(matData, 'NOMENCLATURA DE QR (FAMILIA + ARTICULO/CONSECUTIVO)', 'Materiales') || hasErrors;

    if (hasErrors) {
      console.error("🛑 Proceso abortado por duplicados.");
      process.exit(1);
    }

    await db.sequelize.authenticate();
    console.log("✅ DB conectada.");

    // Arreglos para rastrear exactamente qué IDs procesamos
    const processedFamilyIds = [];
    const processedTypeIds = [];
    const processedBrandIds = [];
    const processedLocIds = [];
    const processedMaterialIds = [];
    const processedMaterialCodeIds = [];

    // 1. Sync Familias
    const familyMap = {};
    for (const row of familiasData) {
      const nomenclatura = row['NOMENCLATURA'] ? String(row['NOMENCLATURA']).trim() : null;
      const nombre = row['NOMBRE'] ? String(row['NOMBRE']).trim() : (nomenclatura ? nomenclatura.replace('-','') : 'Generica');
      if (!nomenclatura) continue;
      
      const [fam] = await db.MaterialFamily.findOrCreate({
        where: { code: nomenclatura },
        defaults: { name: nombre, is_active: true }
      });
      fam.name = nombre;
      fam.is_active = true;
      await fam.save();
      
      familyMap[nomenclatura] = fam.id;
      processedFamilyIds.push(fam.id);
    }

    // 2. Sync Tipos
    const typeMap = {};
    for (const row of tiposData) {
      const tipo = row['TIPO'] ? String(row['TIPO']).trim() : null;
      if (!tipo) continue;
      
      const [t] = await db.MaterialType.findOrCreate({
        where: { code: tipo },
        defaults: { name: tipo, is_active: true }
      });
      t.name = tipo;
      t.is_active = true;
      await t.save();
      
      typeMap[tipo] = t.id;
      processedTypeIds.push(t.id);
    }

    // 3. Sync Marcas
    const brandMap = {};
    for (const row of marcasData) {
      const marca = row['MARCA'] ? String(row['MARCA']).trim() : null;
      if (!marca) continue;
      
      const [b] = await db.MaterialBrand.findOrCreate({
        where: { code: marca },
        defaults: { name: marca, is_active: true }
      });
      b.name = marca;
      b.is_active = true;
      await b.save();
      
      brandMap[marca] = b.id;
      processedBrandIds.push(b.id);
    }

    // 4. Sync Localidades
    const locMap = {};
    for (const row of locData) {
      const loc = row['LOCALIDAD'] ? String(row['LOCALIDAD']).trim() : null;
      if (!loc) continue;
      
      const [l] = await db.Location.findOrCreate({
        where: { code: loc },
        defaults: { name: loc, is_active: true }
      });
      l.name = loc;
      l.is_active = true;
      await l.save();
      
      locMap[loc] = l.id;
      processedLocIds.push(l.id);
    }

    // Asegurar que la familia "OTROS" exista en el track para no borrarla accidentalmente
    if (familyMap['OTR-']) processedFamilyIds.push(familyMap['OTR-']);

    // 5. Sync Materiales
    let codesMap = {};
    for (const row of matData) {
      const familia = row['FAMILIA'] ? String(row['FAMILIA']).trim() : 'OTR-';
      const artCon = row['ARTICULO/CONSECUTIVO'] ? String(row['ARTICULO/CONSECUTIVO']).trim() : null;
      const nomQr = row['NOMENCLATURA DE QR (FAMILIA + ARTICULO/CONSECUTIVO)'] ? String(row['NOMENCLATURA DE QR (FAMILIA + ARTICULO/CONSECUTIVO)']).trim() : null;
      const desc = row['DESCRIPCION'] ? String(row['DESCRIPCION']).trim() : null;
      const tipo = row['TIPO'] ? String(row['TIPO']).trim() : null;
      const marca = row['MARCA'] ? String(row['MARCA']).trim() : null;
      const localidad = row['LOCALIDAD'] ? String(row['LOCALIDAD']).trim() : null;
      
      if (!nomQr || !artCon) continue;
      
      const parts = artCon.split('-');
      const consPart = parts[1] || '000';
      
      const [mCode] = await db.MaterialCode.findOrCreate({
        where: { code: artCon },
        defaults: { name: desc || artCon, is_active: true }
      });
      mCode.name = desc || artCon;
      mCode.is_active = true;
      await mCode.save();
      
      codesMap[artCon] = mCode.id;
      processedMaterialCodeIds.push(mCode.id);
      
      let famId = familyMap[familia] || familyMap['OTR-'];
      if (!famId) {
         const [fam] = await db.MaterialFamily.findOrCreate({ where: { code: 'OTR-' }, defaults: { name: 'OTROS', is_active: true } });
         familyMap['OTR-'] = fam.id;
         famId = fam.id;
         processedFamilyIds.push(fam.id);
      }
      const typeId = typeMap[tipo] || null;
      const brandId = brandMap[marca] || null;
      const locId = locMap[localidad] || null;
      
      const conflicting = await db.Material.findOne({
        where: { family_id: famId, material_code_id: mCode.id, internal_consecutive: consPart }
      });
      
      let material = await db.Material.findOne({ where: { internal_code: nomQr } });
      
      if (conflicting && material && conflicting.id !== material.id) {
        await conflicting.destroy({ force: true });
      } else if (conflicting && !material) {
        await conflicting.destroy({ force: true });
      }
      
      if (!material) {
        material = await db.Material.create({
          family_id: famId,
          material_code_id: mCode.id,
          internal_consecutive: consPart,
          internal_code: nomQr,
          name: desc || nomQr,
          description: tipo || null,
          brand_id: brandId,
          type_id: typeId,
          default_location_id: locId,
          is_active: true
        });
      } else {
        material.name = desc || nomQr;
        material.description = tipo || null;
        material.material_code_id = mCode.id;
        material.brand_id = brandId;
        material.type_id = typeId;
        material.default_location_id = locId;
        material.is_active = true;
        await material.save();
      }

      processedMaterialIds.push(material.id);
    }
    
    console.log("✅ Sincronización completada. Iniciando Purga de datos obsoletos...");

    // ---------------------------------------------------------------------------
    // FASE 6: PURGA (CLEANUP)
    // Elimina de la BD todo lo que NO estaba en el Excel.
    // El orden de borrado es vital para no romper las Foreign Keys (de hijos a padres)
    // ---------------------------------------------------------------------------

    const deletedMaterials = await db.Material.destroy({
      where: { id: { [Op.notIn]: processedMaterialIds } }
    });
    console.log(`🗑️  Materiales eliminados: ${deletedMaterials}`);

    const deletedMaterialCodes = await db.MaterialCode.destroy({
      where: { id: { [Op.notIn]: processedMaterialCodeIds } }
    });
    console.log(`🗑️  Códigos de Material eliminados: ${deletedMaterialCodes}`);

    const deletedFamilies = await db.MaterialFamily.destroy({
      where: { id: { [Op.notIn]: processedFamilyIds } }
    });
    console.log(`🗑️  Familias eliminadas: ${deletedFamilies}`);

    const deletedTypes = await db.MaterialType.destroy({
      where: { id: { [Op.notIn]: processedTypeIds } }
    });
    console.log(`🗑️  Tipos eliminados: ${deletedTypes}`);

    const deletedBrands = await db.MaterialBrand.destroy({
      where: { id: { [Op.notIn]: processedBrandIds } }
    });
    console.log(`🗑️  Marcas eliminadas: ${deletedBrands}`);

    const deletedLocs = await db.Location.destroy({
      where: { id: { [Op.notIn]: processedLocIds } }
    });
    console.log(`🗑️  Localidades eliminadas: ${deletedLocs}`);

    console.log("🚀 Proceso finalizado. La base de datos es ahora una copia exacta del Excel.");
    
  } catch (e) {
    console.error("Error crítico durante la ejecución:", e);
  } finally {
    process.exit(0);
  }
}

syncMasterData();