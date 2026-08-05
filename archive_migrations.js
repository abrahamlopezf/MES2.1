const fs = require('fs');
const path = require('path');

const srcDir = 'C:/Users/maicr/OneDrive/Desktop/Demo/backend/src/database/migrations';
const targetDir = 'C:/Users/maicr/OneDrive/Desktop/Demo/backend/src/database/legacy';

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const filesToArchive = [
  '20260707050000-create-material-categories.js',
  '20260707050100-create-materials.js',
  '20260707060000-create-material-stocks.js',
  '20260707060100-create-material-lots.js',
  '20260707060200-create-material-stock-movements.js',
  '20260727000000-update-materials-catalog.js'
];

filesToArchive.forEach(file => {
  const srcFile = path.join(srcDir, file);
  const destFile = path.join(targetDir, file);
  if (fs.existsSync(srcFile)) {
    fs.renameSync(srcFile, destFile);
    console.log(`Archived ${file} to legacy/`);
  }
});
