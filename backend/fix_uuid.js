const fs = require('fs');
const path = require('path');
const dir = 'C:/Users/maicr/OneDrive/Desktop/Demo/backend/src/modules/materials';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.model.js'));
files.forEach(f => {
  let content = fs.readFileSync(path.join(dir, f), 'utf8');
  // Quitamos allowNull: false del modelo de Sequelize para que la validación en JS pase,
  // y dejamos que la BD se encargue mediante su constraint not null y su default.
  content = content.replace(/uuid: \{ type: DataTypes\.UUID, allowNull: false, unique: true \},/g, "uuid: { type: DataTypes.UUID, unique: true },");
  fs.writeFileSync(path.join(dir, f), content);
});
console.log('UUID validation bypassed on model level');
