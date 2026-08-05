const fs = require('fs');
const path = require('path');

function deleteFolderRecursive(directoryPath) {
  if (fs.existsSync(directoryPath)) {
    fs.readdirSync(directoryPath).forEach((file) => {
      const curPath = path.join(directoryPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(directoryPath);
  }
}

// from backend to demo root
const targetRoot = path.join(__dirname, '..', 'frontend', 'src');

['modules', 'pages', 'layouts', 'components'].forEach(folder => {
  const target = path.join(targetRoot, folder);
  deleteFolderRecursive(target);
  console.log(`Deleted ${target}`);
});
