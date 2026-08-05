module.exports = (sequelize, DataTypes) => {
  const Material = sequelize.define('Material', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    uuid: { type: DataTypes.UUID, unique: true },
    
    family_id: { type: DataTypes.INTEGER, allowNull: false },
    material_code_id: { type: DataTypes.INTEGER, allowNull: false },
    internal_consecutive: { type: DataTypes.STRING(10), allowNull: false },
    
    internal_code: { 
      type: DataTypes.STRING(50), 
      allowNull: false,
      validate: {
        is: /^[A-Z0-9]+-[A-Z0-9]+-\d{3}$/
      }
    },
    
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.STRING(500) },
    
    brand_id: { type: DataTypes.INTEGER },
    type_id: { type: DataTypes.INTEGER },
    
    base_unit_id: DataTypes.INTEGER,
    stock_unit_id: DataTypes.INTEGER,
    
    default_location_id: DataTypes.INTEGER,
    
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
      { fields: ['status', 'family_id'] },
      { fields: ['family_id'] },
      { fields: ['material_code_id'] },
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
    Material.belongsTo(models.MaterialBrand, { foreignKey: 'brand_id', as: 'brand' });
    Material.belongsTo(models.MaterialType, { foreignKey: 'type_id', as: 'type' });
    Material.belongsTo(models.OperationalArea, { foreignKey: 'default_location_id', as: 'default_location' });
    
    // Unlink these until Phase 1.5 units are created
    // if (models.MaterialUnit) {
    //   Material.belongsTo(models.MaterialUnit, { foreignKey: 'base_unit_id', as: 'base_unit' });
    //   Material.belongsTo(models.MaterialUnit, { foreignKey: 'stock_unit_id', as: 'stock_unit' });
    // }
  };

  return Material;
};
