const { MATERIAL_TYPE, MATERIAL_UNIT } = require('./materials.constants');

module.exports = (sequelize, DataTypes) => {
  const Material = sequelize.define(
    'Material',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      material_category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(60),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(160),
        allowNull: false,
      },
      material_type: {
        type: DataTypes.ENUM(...Object.values(MATERIAL_TYPE)),
        allowNull: false,
      },
      default_unit: {
        type: DataTypes.ENUM(...Object.values(MATERIAL_UNIT)),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      technical_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      min_stock: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
      tableName: 'materials',
      underscored: true,
      timestamps: true,
    }
  );

  return Material;
};