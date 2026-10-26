const fs = require('fs');
const path = require('path');

const modelsIndexPath = path.join(__dirname, '../database/models/index.js');
let content = fs.readFileSync(modelsIndexPath, 'utf8');

if (!content.includes('GloboSpecification')) {
  const addition = `// ============================================
// GLOBO Y LAMINADO SPECIFICATIONS & CATALOGS
// ============================================
db.GloboSpecification = require('../../modules/globo/models/globoSpecification.model')(sequelize, DataTypes);
db.GloboSpecificationMaterial = require('../../modules/globo/models/globoSpecificationMaterial.model')(sequelize, DataTypes);
db.LaminadoSpecification = require('../../modules/laminado/models/laminadoSpecification.model')(sequelize, DataTypes);
db.LaminadoSpecificationMaterial = require('../../modules/laminado/models/laminadoSpecificationMaterial.model')(sequelize, DataTypes);

db.GloboSpecification.hasMany(db.GloboSpecificationMaterial, { foreignKey: 'globo_spec_id', as: 'materials' });
db.GloboSpecificationMaterial.belongsTo(db.GloboSpecification, { foreignKey: 'globo_spec_id', as: 'specification' });
db.GloboSpecificationMaterial.belongsTo(db.Material, { foreignKey: 'material_id', as: 'material' });

db.LaminadoSpecification.hasMany(db.LaminadoSpecificationMaterial, { foreignKey: 'laminado_spec_id', as: 'materials' });
db.LaminadoSpecificationMaterial.belongsTo(db.LaminadoSpecification, { foreignKey: 'laminado_spec_id', as: 'specification' });
db.LaminadoSpecificationMaterial.belongsTo(db.Material, { foreignKey: 'material_id', as: 'material' });

module.exports = db;
`;

  content = content.replace('module.exports = db;', addition);
  fs.writeFileSync(modelsIndexPath, content, 'utf8');
  console.log('Successfully updated models index with Globo and Laminado models.');
} else {
  console.log('Models already registered.');
}
