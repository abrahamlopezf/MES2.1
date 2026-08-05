const fs = require('fs');
const path = require('path');

const filesToDelete = [
  'backend/src/modules/materials/materialCategory.model.js',
  'backend/src/modules/materials/materialCategory.controller.js',
  'backend/src/modules/materials/materialCategory.routes.js'
];

const dirsToDelete = [
  'backend/src/modules/formulas',
  'backend/src/modules/processes',
  'backend/src/modules/intermediate',
  'backend/src/modules/scrap'
];

filesToDelete.forEach(file => {
  try {
    fs.unlinkSync(path.join(__dirname, '../../../../', file));
    console.log(`Deleted ${file}`);
  } catch (e) {
    console.error(`Failed to delete ${file}:`, e.message);
  }
});

dirsToDelete.forEach(dir => {
  try {
    fs.rmSync(path.join(__dirname, '../../../../', dir), { recursive: true, force: true });
    console.log(`Deleted directory ${dir}`);
  } catch (e) {
    console.error(`Failed to delete dir ${dir}:`, e.message);
  }
});
