const { sequelize } = require('./src/config/database.js');
const fs = require('fs');

async function run() {
  await sequelize.authenticate();
  
  // Find materials
  const [dbMaterials] = await sequelize.query('SELECT internal_code FROM materials');
  const dbCodes = dbMaterials.map(m => m.internal_code);
  
  // Extract all the QR nomenclature using strict TSV logic
  const text = fs.readFileSync('materials_check.txt', 'utf8');
  const lines = text.split('\n');
  
  const extracted = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Some lines start with just parts, but if we split by tab
    const parts = line.split('\t');
    
    // We expect at least FAMILIA, ARTICULO, NOMENCLATURA, etc
    // In many cases parts[2] is NOMENCLATURA
    if (parts.length >= 3 && parts[2].includes('-')) {
      const nom = parts[2].trim();
      extracted.push(nom);
    } else {
      // It might be a malformed line, let's extract by regex for any valid pattern
      const match = line.match(/[A-Z0-9]+-[A-Z0-9]+-[0-9]+/);
      if (match) {
        extracted.push(match[0]);
      }
    }
  }

  // Also catch multi-line issues if they were merged manually
  const allCodesRegexMatch = text.match(/[A-Z0-9]+-[A-Z0-9]+-[0-9]+/g) || [];
  
  // Find which ones are missing
  const missing = allCodesRegexMatch.filter(code => !dbCodes.includes(code) && code !== 'SDC-25-1020' && code !== 'SPC-25-1005' && code !== 'SPC-45-1020' && code !== 'SPC-45-1005' && code !== 'WINDER-20-4');

  const uniqueMissing = [...new Set(missing)];
  console.log('Total missing:', uniqueMissing.length);
  if (uniqueMissing.length > 0) {
    console.log('Missing items:', uniqueMissing);
  }

  process.exit();
}
run().catch(console.error);
