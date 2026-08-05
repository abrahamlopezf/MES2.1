const fs = require('fs');
const path = require('path');

const rawData = fs.readFileSync(path.join(__dirname, 'raw_materials.tsv'), 'utf8');
const lines = rawData.split('\n').filter(l => l.trim().length > 0);
lines.shift(); // Saltar header

const families = new Set();
const codes = new Set();
const brands = new Set();
const types = new Set();
const materials = [];

// Mapping para derivar categorías
const categoryMap = {
  'LIM': 'CON', 'SEG': 'SEG', 'HER': 'HER', 'MATCONS': 'CON',
  'REF': 'REF', 'PQ': 'QUI', 'RF': 'REF', 'ELC': 'ELC',
  'MATEMP': 'EMP', 'GOM': 'REF' 
};

const categories = {
  'CON': 'Consumibles', 'SEG': 'Seguridad Industrial', 'HER': 'Herramientas',
  'REF': 'Refacciones', 'QUI': 'Químicos y Pegamentos', 'ELC': 'Eléctricos',
  'EMP': 'Material de Empaque'
};

const normalizeStr = (str) => {
  if (!str) return null;
  return str.trim().replace(/\s+/g, ' ').toUpperCase();
};

const uniqueTracker = new Set();
let duplicates = 0;
let errors = 0;

for (let i = 0; i < lines.length; i++) {
  const parts = lines[i].split('\t').map(p => p.trim());
  if (parts.length < 5) continue;
  
  let [familiaRaw, codigoRaw, , descripcion, tipo, marca] = parts;
  
  const familyCode = normalizeStr(familiaRaw.replace('-', ''));
  let codeStr = '';
  let consecutivo = '000';
  
  const codigoNorm = normalizeStr(codigoRaw);
  const codeParts = codigoNorm.split('-');
  if (codeParts.length >= 2) {
    codeStr = codeParts[0];
    consecutivo = codeParts[1];
  } else {
    codeStr = codigoNorm;
  }
  
  if (!codeStr || !isNaN(codeStr)) {
    codeStr = familyCode.substring(0, 3);
  }
  
  const tipoNorm = normalizeStr(tipo);
  const marcaNorm = normalizeStr(marca);
  
  // Validar formato
  const internalCode = `${familyCode}-${codeStr}-${consecutivo}`;
  const regex = /^[A-Z0-9]+-[A-Z0-9]+-\d{3}$/;
  if (!regex.test(internalCode)) {
    console.error(`❌ Error Fila ${i + 2}: Formato inválido para internal_code: ${internalCode}`);
    errors++;
    process.exit(1);
  }

  // Detectar duplicados
  if (uniqueTracker.has(internalCode)) {
    console.error(`⚠️ Fila ${i + 2}: Duplicado ignorado lógicamente: ${internalCode}`);
    duplicates++;
    continue; // No abortar el generador por ahora, solo ignorarlo
  }
  uniqueTracker.add(internalCode);
  
  families.add(familyCode);
  codes.add(codeStr);
  
  let typeCode = null;
  if (tipoNorm && tipoNorm !== 'N/A') {
    typeCode = tipoNorm.substring(0, 5).replace(/\W/g, '');
    types.add(JSON.stringify({ code: typeCode, name: tipoNorm }));
  }
  
  let brandCode = null;
  if (marcaNorm && marcaNorm !== 'N/A') {
    brandCode = marcaNorm.substring(0, 5).replace(/\W/g, '');
    brands.add(JSON.stringify({ code: brandCode, name: marcaNorm }));
  }

  materials.push({
    familyCode,
    codeStr,
    consecutivo,
    internalCode,
    name: normalizeStr(descripcion),
    description: tipoNorm && tipoNorm !== 'N/A' ? `Presentación/Tipo: ${tipoNorm}` : null,
    brandCode,
    typeCode,
    categoryCode: categoryMap[familyCode] || 'CON'
  });
}

// 1. GENERAR 001-bootstrap-interplas
const bootstrapContent = `'use strict';
const db = require('../models');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const categories = [
${Object.keys(categories).map(k => `      { code: '${k}', name: '${categories[k]}' }`).join(',\n')}
    ];
    for (const item of categories) await db.MaterialCategory.findOrCreate({ where: { code: item.code }, defaults: item });

    const families = [
${Array.from(families).map(f => `      { code: '${f}', name: 'Familia ${f}' }`).join(',\n')}
    ];
    for (const item of families) await db.MaterialFamily.findOrCreate({ where: { code: item.code }, defaults: item });

    const codes = [
${Array.from(codes).map(c => `      { code: '${c}', name: 'Código ${c}' }`).join(',\n')}
    ];
    for (const item of codes) await db.MaterialCode.findOrCreate({ where: { code: item.code }, defaults: item });

    const types = [
${Array.from(types).map(t => `      ${t}`).join(',\n')}
    ];
    for (const item of types) await db.MaterialType.findOrCreate({ where: { code: item.code }, defaults: item });

    const brands = [
${Array.from(brands).map(b => `      ${b}`).join(',\n')}
    ];
    for (const item of brands) await db.MaterialBrand.findOrCreate({ where: { code: item.code }, defaults: item });

    console.log('✅ 001-bootstrap-interplas: Catálogos sembrados.');
  },
  down: async (queryInterface, Sequelize) => {}
};
`;

fs.writeFileSync(path.join(__dirname, 'src/database/seeders/20260731000001-bootstrap-interplas.js'), bootstrapContent);

// 2. GENERAR 002-materials
const materialsContent = `'use strict';
const db = require('../models');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const rawMaterials = ${JSON.stringify(materials, null, 2)};
    
    const families = await db.MaterialFamily.findAll();
    const codes = await db.MaterialCode.findAll();
    const categories = await db.MaterialCategory.findAll();
    const brands = await db.MaterialBrand.findAll();
    const types = await db.MaterialType.findAll();
    
    const famMap = new Map(families.map(f => [f.code, f.id]));
    const codeMap = new Map(codes.map(c => [c.code, c.id]));
    const catMap = new Map(categories.map(c => [c.code, c.id]));
    const brandMap = new Map(brands.map(b => [b.code, b.id]));
    const typeMap = new Map(types.map(t => [t.code, t.id]));

    let createdCount = 0;

    for (const rm of rawMaterials) {
      const famId = famMap.get(rm.familyCode);
      const codeId = codeMap.get(rm.codeStr);
      const catId = catMap.get(rm.categoryCode);
      const brandId = rm.brandCode ? brandMap.get(rm.brandCode) : null;
      const typeId = rm.typeCode ? typeMap.get(rm.typeCode) : null;

      if (!famId) throw new Error(\`❌ Fila: MaterialFamily "\${rm.familyCode}" no existe en BD para \${rm.internalCode}\`);
      if (!codeId) throw new Error(\`❌ Fila: MaterialCode "\${rm.codeStr}" no existe en BD para \${rm.internalCode}\`);
      if (!catId) throw new Error(\`❌ Fila: MaterialCategory "\${rm.categoryCode}" no existe en BD para \${rm.internalCode}\`);
      if (rm.brandCode && !brandId) throw new Error(\`❌ Fila: MaterialBrand "\${rm.brandCode}" no existe en BD para \${rm.internalCode}\`);
      if (rm.typeCode && !typeId) throw new Error(\`❌ Fila: MaterialType "\${rm.typeCode}" no existe en BD para \${rm.internalCode}\`);

      const [mat, created] = await db.Material.findOrCreate({
        where: { internal_code: rm.internalCode },
        defaults: {
          family_id: famId,
          material_code_id: codeId,
          category_id: catId,
          brand_id: brandId,
          type_id: typeId,
          internal_consecutive: rm.consecutivo,
          internal_code: rm.internalCode,
          name: rm.name,
          description: rm.description,
          status: 'ACTIVE'
        }
      });
      if (created) createdCount++;
    }

    console.log(\`✅ 002-materials: Sembrados \${createdCount} materiales maestros.\`);
  },
  down: async (queryInterface, Sequelize) => {}
};
`;

fs.writeFileSync(path.join(__dirname, 'src/database/seeders/20260731000002-materials.js'), materialsContent);

console.log('====================================');
console.log('📄 REPORTE DE GENERACIÓN (PARSER)');
console.log('====================================');
console.log(`MaterialFamilies identificadas: ${families.size}`);
console.log(`MaterialCodes identificados: ${codes.size}`);
console.log(`MaterialCategories base: ${Object.keys(categories).length}`);
console.log(`MaterialBrands identificadas: ${brands.size}`);
console.log(`MaterialTypes identificados: ${types.size}`);
console.log(`Materials preparados: ${materials.length}`);
console.log(`Duplicados ignorados lógicamente: ${duplicates}`);
console.log(`Errores fatales: ${errors}`);
console.log('====================================');
console.log('Seeders listos para ejecución iterativa.');
