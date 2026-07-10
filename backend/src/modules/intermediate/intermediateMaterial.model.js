module.exports = (sequelize, DataTypes) => {
  const IntermediateMaterial = sequelize.define(
    'IntermediateMaterial',
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
        type: DataTypes.STRING(180),
        allowNull: false,
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      production_area_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      base_material_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      material_family: {
        type: DataTypes.STRING(60),
        allowNull: false,
        defaultValue: 'HILO',
      },

      color: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },

      color_code: {
        type: DataTypes.STRING(40),
        allowNull: true,
      },

      caliber_value: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
      },

      caliber_unit: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },

      thread_type: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },

      presentation: {
        type: DataTypes.STRING(80),
        allowNull: false,
        defaultValue: 'CARRETE',
      },

      primary_unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'CARRETE',
      },

      secondary_unit: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'KG',
      },

      min_stock_primary: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: 0,
      },

      max_stock_primary: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: true,
      },

      min_stock_secondary: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: true,
      },

      max_stock_secondary: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: true,
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
      tableName: 'intermediate_materials',
      timestamps: true,
      underscored: true,
    }
  );

  return IntermediateMaterial;
};