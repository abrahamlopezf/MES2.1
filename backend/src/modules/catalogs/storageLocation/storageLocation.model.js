module.exports = (sequelize, DataTypes) => {
  const StorageLocation = sequelize.define('StorageLocation', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    uuid: { type: DataTypes.UUID, unique: true },
    
    code: { type: DataTypes.STRING(50), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.STRING(255) },
    
    barcode: { type: DataTypes.STRING(100) },
    qr_code: { type: DataTypes.STRING(255) },
    
    warehouse_id: { type: DataTypes.INTEGER },
    zone_id: { type: DataTypes.INTEGER },
    parent_location_id: { type: DataTypes.INTEGER },
    
    location_type_id: { type: DataTypes.INTEGER, allowNull: false },
    status_id: { type: DataTypes.INTEGER, allowNull: false },
    
    max_weight: { type: DataTypes.DECIMAL(18, 6) },
    max_volume: { type: DataTypes.DECIMAL(18, 6) },
    current_weight: { type: DataTypes.DECIMAL(18, 6), defaultValue: 0 },
    current_volume: { type: DataTypes.DECIMAL(18, 6), defaultValue: 0 },
    current_items: { type: DataTypes.INTEGER, defaultValue: 0 },
    
    height: { type: DataTypes.DECIMAL(10, 4) },
    width: { type: DataTypes.DECIMAL(10, 4) },
    depth: { type: DataTypes.DECIMAL(10, 4) },
    
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by: DataTypes.INTEGER,
    updated_by: DataTypes.INTEGER,
    deleted_by: DataTypes.INTEGER
  }, {
    tableName: 'storage_locations',
    timestamps: true,
    paranoid: true,
    version: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      { unique: true, fields: ['uuid'], where: { deleted_at: null } },
      { unique: true, fields: ['code', 'warehouse_id'], where: { deleted_at: null } },
      { fields: ['barcode'] },
      { fields: ['parent_location_id'] }
    ]
  });

  StorageLocation.associate = (models) => {
    StorageLocation.belongsTo(models.Warehouse, { foreignKey: 'warehouse_id', as: 'warehouse' });
    StorageLocation.belongsTo(models.StorageLocationType, { foreignKey: 'location_type_id', as: 'location_type' });
    StorageLocation.belongsTo(models.StorageLocationStatus, { foreignKey: 'status_id', as: 'status' });
    StorageLocation.belongsTo(models.StorageLocation, { foreignKey: 'parent_location_id', as: 'parent_location' });
    StorageLocation.hasMany(models.StorageLocation, { foreignKey: 'parent_location_id', as: 'sub_locations' });
  };

  return StorageLocation;
};
