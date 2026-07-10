module.exports = (sequelize, DataTypes) => {
  const StorageRack = sequelize.define(
    'StorageRack',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      code: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
      },

      name: {
        type: DataTypes.STRING(160),
        allowNull: false,
      },

      area_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      rack_type: {
        type: DataTypes.STRING(60),
        allowNull: false,
        defaultValue: 'MI_BUFFER',
      },

      qr_code_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      location_description: {
        type: DataTypes.STRING(220),
        allowNull: true,
      },

      capacity_primary: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: true,
      },

      primary_unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'CARRETE',
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },

      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: 'storage_racks',
      timestamps: true,
      underscored: true,
    }
  );

  return StorageRack;
};