const fs = require('fs');

const text = fs.readFileSync('materials_check.txt', 'utf8');
const lines = text.split('\n');

const codes = [];
const duplicates = [];
const seenCodes = new Set();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const regexMatch = line.match(/([A-Z0-9]+-[A-Z0-9]+-[0-9]+)/);
  if (regexMatch) {
      const code = regexMatch[1];
      if (seenCodes.has(code)) {
          duplicates.push({ code, line });
      } else {
          seenCodes.add(code);
      }
      codes.push(code);
  }
}

console.log(`Total rows with codes: ${codes.length}`);
console.log(`Total unique codes: ${seenCodes.size}`);
console.log(`Duplicates count: ${duplicates.length}`);
console.log('--- The duplicates are: ---');
duplicates.forEach(d => console.log(d.code));

