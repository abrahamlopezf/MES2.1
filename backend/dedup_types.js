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
  
  // Group by normalized name
  const groups = {};
  for (const type of dbTypes) {
    const norm = normalize(type.name);
    if (!groups[norm]) groups[norm] = [];
    groups[norm].push(type);
  }
  
  // Deduplicate
  for (const norm in groups) {
    const items = groups[norm];
    if (items.length > 1) {
      // Find one that matches user list exactly, or just use the first one
      let canonical = items.find(i => userList.includes(i.name));
      if (!canonical) canonical = items[0];
      
      const others = items.filter(i => i.id !== canonical.id);
      
      for (const other of others) {
        console.log(`Merging type ${other.name} (${other.id}) into ${canonical.name} (${canonical.id})`);
        
        await sequelize.query(`UPDATE materials SET type_id = :canId WHERE type_id = :oldId`, {
          replacements: { canId: canonical.id, oldId: other.id }
        });
        
        await sequelize.query(`DELETE FROM material_types WHERE id = :oldId`, {
          replacements: { oldId: other.id }
        });
      }
    }
  }
  
  console.log('Deduplication finished. Now updating names...');
  
  // Reload
  const [newDbTypes] = await sequelize.query('SELECT id, name, code FROM material_types');
  let updatedCount = 0;
  
  for (const dbType of newDbTypes) {
    const normDb = normalize(dbType.name);
    const match = userList.find(u => normalize(u) === normDb);
    
    if (match && match !== dbType.name) {
      console.log(`Updating '${dbType.name}' -> '${match}'`);
      await sequelize.query(`UPDATE material_types SET name = :name, code = :code WHERE id = :id`, {
        replacements: { name: match, code: match, id: dbType.id }
      });
      updatedCount++;
    }
  }
  
  // Final summary
  const [finalDbTypes] = await sequelize.query('SELECT name FROM material_types');
  const dbNames = finalDbTypes.map(t => t.name);
  const normDbNames = dbNames.map(normalize);
  
  const missingInDb = userList.filter(u => !normDbNames.includes(normalize(u)));
  const extraInDb = dbNames.filter(d => !userList.some(u => normalize(u) === normalize(d)));
  
  console.log('--- USER LIST COUNT ---', userList.length); // Should be 388
  console.log('--- DB LIST COUNT ---', dbNames.length); // Should be < 420
  console.log('--- UPDATED (Spacing/Case fixed) ---', updatedCount);
  console.log('\n--- MISSING IN DB (Needs to be added) ---', missingInDb.length);
  console.log('\n--- EXTRA IN DB (Not in user list) ---', extraInDb.length);
  
  process.exit(0);
}

run().catch(console.error);
