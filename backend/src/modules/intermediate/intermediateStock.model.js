module.exports = (sequelize, DataTypes) => {
  const IntermediateStock = sequelize.define(
    'IntermediateStock',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      intermediate_material_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      area_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      rack_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      quantity_primary: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: 0,
      },

      primary_unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'CARRETE',
      },

      quantity_secondary: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: true,
        defaultValue: 0,
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

      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'OK',
      },

      last_movement_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      tableName: 'intermediate_stocks',
      timestamps: true,
      underscored: true,
    }
  );

  return IntermediateStock;
};