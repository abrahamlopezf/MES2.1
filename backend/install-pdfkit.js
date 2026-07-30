const { execSync } = require('child_process');
console.log('Installing qrcode...');
execSync('npm install qrcode', { stdio: 'inherit' });
console.log('Done.');
