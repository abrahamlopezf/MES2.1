const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'modules', 'waste');

fs.rmSync(dir, { recursive: true, force: true });
console.log('Eliminado correctamente:', dir);
