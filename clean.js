const fs = require('fs');
const path = require('path');

const deleteDir = (dirPath) => {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`Deleted ${dirPath}`);
  }
};

const dirsToDelete = [
  'C:/Users/maicr/OneDrive/Desktop/Demo/backend/src/modules/materialInventory',
  'C:/Users/maicr/OneDrive/Desktop/Demo/frontend/src/modules/catalog',
  'C:/Users/maicr/OneDrive/Desktop/Demo/frontend/src/modules/inventory',
  'C:/Users/maicr/OneDrive/Desktop/Demo/frontend/src/modules/recepcion-material'
];

dirsToDelete.forEach(deleteDir);
