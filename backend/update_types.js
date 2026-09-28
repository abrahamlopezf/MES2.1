require('dotenv').config();
const { sequelize } = require('./src/config/database.js');
const fs = require('fs');

function parseCSV(text) {
  const result = [];
  let inQuotes = false;
  let current = '';
  
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      current += c;
    } else if (c === '\n' && !inQuotes) {
      if (current.trim().length > 0) result.push(current.trim());
      current = '';
    } else {
      if (c !== '\r') current += c;
    }
  }
  if (current.trim().length > 0) result.push(current.trim());
  return result;
}

const rawText = fs.readFileSync('types.txt', 'utf8');
const userList = parseCSV(rawText).map(x => x.replace(/^"|"$/g, ''));

const normalize = (str) => str.replace(/\s+/g, ' ').trim().toLowerCase();

async function run() {
  await sequelize.authenticate();
  
  const [dbTypes] = await sequelize.query('SELECT id, name, code FROM material_types');
  let updatedCount = 0;
  
  for (const dbType of dbTypes) {
    const normDb = normalize(dbType.name);
    const match = userList.find(u => normalize(u) === normDb);
    
    if (match && match !== dbType.name) {
      // Name actually changed (due to spaces, casing, etc)
      await sequelize.query(`UPDATE material_types SET name = :name, code = :code WHERE id = :id`, {
        replacements: { name: match, code: match, id: dbType.id }
      });
      updatedCount++;
    }
  }
  
  // Reload new db state
  const [newDbTypes] = await sequelize.query('SELECT name FROM material_types');
  const dbNames = newDbTypes.map(t => t.name);
  const normDbNames = dbNames.map(normalize);
  
  const missingInDb = userList.filter(u => !normDbNames.includes(normalize(u)));
  const extraInDb = dbNames.filter(d => !userList.some(u => normalize(u) === normalize(d)));
  
  console.log('--- USER LIST COUNT ---', userList.length);
  console.log('--- DB LIST COUNT ---', dbNames.length);
  console.log('--- UPDATED (Spacing/Case fixed) ---', updatedCount);
  console.log('\n--- MISSING IN DB (Needs to be added) ---', missingInDb.length);
  console.log('\n--- EXTRA IN DB (Not in user list) ---', extraInDb.length);
  
  process.exit(0);
}

run().catch(console.error);
