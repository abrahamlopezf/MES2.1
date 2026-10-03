const xlsx = require('xlsx');
const db = require('./src/database/models');

async function cleanupOldData() {
  const filePath = 'c:\\Users\\maicr\\OneDrive\\Desktop\\Demo\\docs\\Libro1_Corregido.xlsx';
  const workbook = xlsx.readFile(filePath);
  
  try {
    await db.sequelize.authenticate();
    
    // valid types
    const validTipos = new Set(xlsx.utils.sheet_to_json(workbook.Sheets['Tipos']).map(r => String(r['TIPO']).trim()).filter(Boolean));
    const allTipos = await db.MaterialType.findAll();
    for (const t of allTipos) {
      if (!validTipos.has(t.code)) {
        if (t.is_active) { t.is_active = false; await t.save(); }
      }
    }
    
    // valid marcas
    const validMarcas = new Set(xlsx.utils.sheet_to_json(workbook.Sheets['Marcas']).map(r => String(r['MARCA']).trim()).filter(Boolean));
    const allMarcas = await db.MaterialBrand.findAll();
    for (const m of allMarcas) {
      if (!validMarcas.has(m.code)) {
        if (m.is_active) { m.is_active = false; await m.save(); }
      }
    }

    // valid localidades
    const validLocs = new Set(xlsx.utils.sheet_to_json(workbook.Sheets['Localidades']).map(r => String(r['LOCALIDAD']).trim()).filter(Boolean));
    const allLocs = await db.Location.findAll();
    for (const l of allLocs) {
      if (!validLocs.has(l.code)) {
        if (l.is_active) { l.is_active = false; await l.save(); }
      }
    }
    
    // valid familias
    const validFams = new Set(xlsx.utils.sheet_to_json(workbook.Sheets['Familias']).map(r => String(r['NOMENCLATURA']).trim()).filter(Boolean));
    validFams.add('OTR-'); // Our fallback
    const allFams = await db.MaterialFamily.findAll();
    for (const f of allFams) {
      if (!validFams.has(f.code)) {
        if (f.is_active) { f.is_active = false; await f.save(); }
      }
    }
    
    console.log("Cleanup of catalogs completed.");
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

cleanupOldData();
