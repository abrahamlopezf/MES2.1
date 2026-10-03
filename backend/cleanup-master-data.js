const xlsx = require('xlsx');
const db = require('./src/database/models');

async function cleanupOldData() {
  const filePath = 'c:\\Users\\maicr\\OneDrive\\Desktop\\Demo\\docs\\Libro1_Corregido.xlsx';
  const workbook = xlsx.readFile(filePath);
  
  try {
    await db.sequelize.authenticate();
    
    const matSheet = workbook.Sheets['Materiales'];
    const matData = xlsx.utils.sheet_to_json(matSheet);
    
    const validNomQrs = new Set();
    const validCodes = new Set();
    
    for (const row of matData) {
      const artCon = row['ARTICULO/CONSECUTIVO'] ? String(row['ARTICULO/CONSECUTIVO']).trim() : null;
      const nomQr = row['NOMENCLATURA DE QR (FAMILIA + ARTICULO/CONSECUTIVO)'] ? String(row['NOMENCLATURA DE QR (FAMILIA + ARTICULO/CONSECUTIVO)']).trim() : null;
      if (!nomQr || !artCon) continue;
      
      validNomQrs.add(nomQr);
      validCodes.add(artCon);
    }
    
    const allMaterials = await db.Material.findAll();
    for (const mat of allMaterials) {
      if (!validNomQrs.has(mat.internal_code)) {
        if (mat.is_active) {
          mat.is_active = false;
          await mat.save();
        }
      }
    }
    
    const allCodes = await db.MaterialCode.findAll();
    for (const code of allCodes) {
      if (!validCodes.has(code.code)) {
        if (code.is_active) {
          code.is_active = false;
          await code.save();
        }
      }
    }
    
    console.log("Cleanup completed.");
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

cleanupOldData();
