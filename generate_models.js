const fs = require('fs');
const path = require('path');

const modelsDir = 'C:/Users/maicr/OneDrive/Desktop/Demo/backend/src/modules/materials';

const catalogTemplate = (modelName, tableName) => {
  const fkName = tableName === 'material_families' ? 'family_id' : 
                 tableName === 'material_codes' ? 'material_code_id' :
                 tableName === 'material_brands' ? 'brand_id' :
                 tableName === 'material_types' ? 'type_id' :
                 tableName === 'material_categories' ? 'category_id' : null;

  return `module.exports = (sequelize, DataTypes) => {
  const ${modelName} = sequelize.define('${modelName}', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    uuid: { type: DataTypes.UUID, allowNull: false, unique: true }, // Natively handled by Postgres via defaultValue
    code: { type: DataTypes.STRING(50), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.STRING(255) },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by: DataTypes.INTEGER,
    updated_by: DataTypes.INTEGER,
    deleted_by: DataTypes.INTEGER
  }, {
    tableName: '${tableName}',
    timestamps: true,
    paranoid: true,
    version: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      { unique: true, fields: ['uuid'], where: { deleted_at: null } },
      { unique: true, fields: ['code'], where: { deleted_at: null } },
      { fields: ['name'] }
    ]
  });

  ${modelName}.associate = (models) => {
    ${fkName ? `${modelName}.hasMany(models.Material, { foreignKey: '${fkName}', as: 'materials' });` : ''}
  };

  ${['MaterialFamily', 'MaterialCode'].includes(modelName) ? `
  const protectCode = (instanceOrOptions) => {
    if (instanceOrOptions && instanceOrOptions.changed && instanceOrOptions.changed('code')) {
      throw new Error("code es inmutable para este catálogo.");
    }
    if (instanceOrOptions && instanceOrOptions.attributes && instanceOrOptions.attributes.code !== undefined) {
      throw new Error("code es inmutable para este catálogo.");
    }
  };

  ${modelName}.beforeUpdate(protectCode);
  ${modelName}.beforeBulkUpdate(protectCode);
  ` : ''}

  return ${modelName};
};
`;
};

const materialModelTemplate = `module.exports = (sequelize, DataTypes) => {
  const Material = sequelize.define('Material', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    uuid: { type: DataTypes.UUID, allowNull: false, unique: true },
    
    family_id: { type: DataTypes.INTEGER, allowNull: false },
    material_code_id: { type: DataTypes.INTEGER, allowNull: false },
    internal_consecutive: { type: DataTypes.STRING(10), allowNull: false },
    
    internal_code: { 
      type: DataTypes.STRING(50), 
      allowNull: false,
      validate: {
        is: /^[A-Z]{3}-[A-Z]{3}-\\d{3}$/
      }
    },
    
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.STRING(500) },
    
    category_id: { type: DataTypes.INTEGER, allowNull: false },
    brand_id: { type: DataTypes.INTEGER },
    type_id: { type: DataTypes.INTEGER },
    
    base_unit_id: DataTypes.INTEGER,
    stock_unit_id: DataTypes.INTEGER,
    
    primary_image_path: DataTypes.STRING,
    
    qr_template_id: DataTypes.INTEGER,
    
    traceability_level: { type: DataTypes.ENUM('NONE', 'LOT', 'UNIT'), defaultValue: 'NONE' },
    
    minimum_stock: { type: DataTypes.DECIMAL(18,6), defaultValue: 0 },
    maximum_stock: DataTypes.DECIMAL(18,6),
    reorder_point: { type: DataTypes.DECIMAL(18,6), defaultValue: 0 },
    
    status: { type: DataTypes.ENUM('DRAFT', 'ACTIVE', 'BLOCKED', 'DISCONTINUED', 'OBSOLETE'), defaultValue: 'DRAFT' },
    
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    
    created_by: DataTypes.INTEGER,
    updated_by: DataTypes.INTEGER,
    deleted_by: DataTypes.INTEGER
  }, {
    tableName: 'materials',
    timestamps: true,
    paranoid: true,
    version: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      { unique: true, fields: ['uuid'], where: { deleted_at: null } },
      { unique: true, fields: ['internal_code'], where: { deleted_at: null } },
      { unique: true, fields: ['family_id', 'material_code_id', 'internal_consecutive'], where: { deleted_at: null } },
      { fields: ['status'] },
      { fields: ['status', 'category_id'] },
      { fields: ['status', 'family_id'] },
      { fields: ['family_id'] },
      { fields: ['material_code_id'] },
      { fields: ['category_id'] },
      { fields: ['name'] }
    ]
  });

  const protectInternalCode = (instanceOrOptions) => {
    if (instanceOrOptions && instanceOrOptions.changed && instanceOrOptions.changed('internal_code')) {
      throw new Error("internal_code es inmutable.");
    }
    if (instanceOrOptions && instanceOrOptions.attributes && instanceOrOptions.attributes.internal_code !== undefined) {
      throw new Error("internal_code es inmutable.");
    }
  };

  Material.beforeUpdate(protectInternalCode);
  Material.beforeBulkUpdate(protectInternalCode);

  Material.associate = (models) => {
    Material.belongsTo(models.MaterialFamily, { foreignKey: 'family_id', as: 'family' });
    Material.belongsTo(models.MaterialCode, { foreignKey: 'material_code_id', as: 'material_code' });
    Material.belongsTo(models.MaterialCategory, { foreignKey: 'category_id', as: 'category' });
    Material.belongsTo(models.MaterialBrand, { foreignKey: 'brand_id', as: 'brand' });
    Material.belongsTo(models.MaterialType, { foreignKey: 'type_id', as: 'type' });
    
    // Unlink these until Phase 1.5 units are created
    // if (models.MaterialUnit) {
    //   Material.belongsTo(models.MaterialUnit, { foreignKey: 'base_unit_id', as: 'base_unit' });
    //   Material.belongsTo(models.MaterialUnit, { foreignKey: 'stock_unit_id', as: 'stock_unit' });
    // }
  };

  return Material;
};
`;

const models = [
  { file: 'materialFamily.model.js', name: 'MaterialFamily', table: 'material_families' },
  { file: 'materialCode.model.js', name: 'MaterialCode', table: 'material_codes' },
  { file: 'materialBrand.model.js', name: 'MaterialBrand', table: 'material_brands' },
  { file: 'materialType.model.js', name: 'MaterialType', table: 'material_types' },
  { file: 'materialCategory.model.js', name: 'MaterialCategory', table: 'material_categories' },
  { file: 'operationalArea.model.js', name: 'OperationalArea', table: 'operational_areas' }
];

models.forEach(m => {
  fs.writeFileSync(path.join(modelsDir, m.file), catalogTemplate(m.name, m.table));
});

fs.writeFileSync(path.join(modelsDir, 'material.model.js'), materialModelTemplate);

console.log('Modelos generados con éxito.');
