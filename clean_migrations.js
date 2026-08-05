const fs = require('fs');

const filesToDelete = [
  'C:/Users/maicr/OneDrive/Desktop/Demo/backend/src/database/migrations/20260707050000-create-material-categories.js',
  'C:/Users/maicr/OneDrive/Desktop/Demo/backend/src/database/migrations/20260707050100-create-materials.js',
  'C:/Users/maicr/OneDrive/Desktop/Demo/backend/src/database/migrations/20260707060000-create-material-stocks.js',
  'C:/Users/maicr/OneDrive/Desktop/Demo/backend/src/database/migrations/20260707060100-create-material-lots.js',
  'C:/Users/maicr/OneDrive/Desktop/Demo/backend/src/database/migrations/20260707060200-create-material-stock-movements.js',
  'C:/Users/maicr/OneDrive/Desktop/Demo/backend/src/database/migrations/20260727000000-update-materials-catalog.js'
];

filesToDelete.forEach(file => {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`Deleted ${file}`);
  }
});
