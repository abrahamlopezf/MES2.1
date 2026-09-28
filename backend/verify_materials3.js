const { sequelize } = require('./src/config/database.js');
const fs = require('fs');

async function run() {
  await sequelize.authenticate();
  
  const [dbMaterials] = await sequelize.query('SELECT internal_code FROM materials');
  const dbCodes = dbMaterials.map(m => m.internal_code);
  
  const text = fs.readFileSync('materials_check.txt', 'utf8');
  const lines = text.split('\n');
  
  const userCodes = [];
  const missingData = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split('\t');
    
    // A valid row has at least 7 columns or the description has a newline
    // Let's identify the NOMENCLATURA
    let nom = parts[2];
    
    // Some lines might not have 7 tabs if they were split by newline
    if (parts.length >= 3) {
      if (nom && nom.includes('-') && !nom.includes(' ')) {
        userCodes.push(nom);
        
        if (!dbCodes.includes(nom)) {
          // It's missing
          missingData.push({
            familia: parts[0],
            articulo: parts[1],
            nomenclatura: nom,
            line: line
          });
        }
      } else {
        // Look through parts to find the code
        const regexMatch = line.match(/([A-Z0-9]+-[A-Z0-9]+-[0-9]+)/);
        if (regexMatch) {
            userCodes.push(regexMatch[1]);
            if (!dbCodes.includes(regexMatch[1])) {
                missingData.push({ line, nomenclatura: regexMatch[1] });
            }
        }
      }
    } else {
       // Look through the line for a nomenclature
       const regexMatch = line.match(/([A-Z0-9]+-[A-Z0-9]+-[0-9]+)/);
       if (regexMatch) {
          userCodes.push(regexMatch[1]);
          if (!dbCodes.includes(regexMatch[1])) {
              missingData.push({ line, nomenclatura: regexMatch[1] });
          }
       }
    }
  }

  // Also check how many total unique user codes there are
  const uniqueUserCodes = [...new Set(userCodes)];
  console.log(`Total unique codes in user's text: ${uniqueUserCodes.length}`);
  console.log(`Missing from DB: ${missingData.length}`);
  
  // Deduplicate missing data
  const uniqueMissing = [];
  const seenMissing = new Set();
  for (const m of missingData) {
      if (!seenMissing.has(m.nomenclatura)) {
          seenMissing.add(m.nomenclatura);
          uniqueMissing.push(m);
      }
  }

  console.log('Unique missing in DB (count):', uniqueMissing.length);
  uniqueMissing.forEach(m => console.log(m.nomenclatura, m.line));

  process.exit();
}

run().catch(console.error);
