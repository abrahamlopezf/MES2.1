import fs from 'fs';
import path from 'path';

async function test() {
  const data = await fetch('http://localhost:3000/api/warehouse/inventory?limit=10000').then(r => r.json());
  fs.writeFileSync(path.join(__dirname, 'test_output.json'), JSON.stringify(data, null, 2));
}

test();
