module.exports = (sequelize, DataTypes) => {
  const ProductionBomItem = sequelize.define(
    'ProductionBomItem',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      bom_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'URDIMBRE',
      },
      pti_product_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      material_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      ratio_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 50.00,
      },
      consumption_g_per_m: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 32.50,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'production_bom_items',
      timestamps: true,
      underscored: true,
    }
  );

  return ProductionBomItem;
};
