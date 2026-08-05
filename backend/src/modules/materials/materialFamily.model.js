module.exports = (sequelize, DataTypes) => {
  const MaterialFamily = sequelize.define('MaterialFamily', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    uuid: { type: DataTypes.UUID, unique: true }, // Natively handled by Postgres via defaultValue
    code: { type: DataTypes.STRING(50), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.STRING(255) },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_by: DataTypes.INTEGER,
    updated_by: DataTypes.INTEGER,
    deleted_by: DataTypes.INTEGER
  }, {
    tableName: 'material_families',
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

  MaterialFamily.associate = (models) => {
    MaterialFamily.hasMany(models.Material, { foreignKey: 'family_id', as: 'materials' });
  };

  
  const protectCode = (instanceOrOptions) => {
    if (instanceOrOptions && instanceOrOptions.changed && instanceOrOptions.changed('code')) {
      throw new Error("code es inmutable para este catálogo.");
    }
    if (instanceOrOptions && instanceOrOptions.attributes && instanceOrOptions.attributes.code !== undefined) {
      throw new Error("code es inmutable para este catálogo.");
    }
  };

  MaterialFamily.beforeUpdate(protectCode);
  MaterialFamily.beforeBulkUpdate(protectCode);
  

  return MaterialFamily;
};
