const xlsx = require('xlsx');
const db = require('./src/database/models');

async function syncMasterData() {
  const filePath = 'c:\\Users\\maicr\\OneDrive\\Desktop\\Demo\\docs\\Libro1_Corregido.xlsx';
  const workbook = xlsx.readFile(filePath);
  
  try {
    await db.sequelize.authenticate();
    console.log("DB connected");

    // 1. Sync Familias
    const familiasSheet = workbook.Sheets['Familias'];
    const familiasData = xlsx.utils.sheet_to_json(familiasSheet);
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
    }
    console.log("Families synced.");

    // 2. Sync Tipos
    const tiposSheet = workbook.Sheets['Tipos'];
    const tiposData = xlsx.utils.sheet_to_json(tiposSheet);
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
    }
    console.log("Types synced.");

    // 3. Sync Marcas
    const marcasSheet = workbook.Sheets['Marcas'];
    const marcasData = xlsx.utils.sheet_to_json(marcasSheet);
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
    }
    console.log("Brands synced.");

    // 4. Sync Localidades
    const locSheet = workbook.Sheets['Localidades'];
    const locData = xlsx.utils.sheet_to_json(locSheet);
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
    }
    console.log("Locations synced.");

    // 5. Sync Materiales
    const matSheet = workbook.Sheets['Materiales'];
    const matData = xlsx.utils.sheet_to_json(matSheet);
    
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
      
      let famId = familyMap[familia] || familyMap['OTR-'];
      if (!famId) {
         const [fam] = await db.MaterialFamily.findOrCreate({ where: { code: 'OTR-' }, defaults: { name: 'OTROS', is_active: true } });
         familyMap['OTR-'] = fam.id;
         famId = fam.id;
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
        await db.Material.create({
          family_id: famId,
          material_code_id: codesMap[artCon],
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
        material.material_code_id = codesMap[artCon];
        material.brand_id = brandId;
        material.type_id = typeId;
        material.default_location_id = locId;
        material.is_active = true;
        await material.save();
      }
    }
    
    console.log("Materials synced.");
    
  } catch (e) {
    console.error("Error:", e);
  } finally {
    process.exit(0);
  }
}

syncMasterData();
