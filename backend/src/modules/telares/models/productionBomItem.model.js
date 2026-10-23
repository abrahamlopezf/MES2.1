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
      required_quantity: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
        comment: 'Cantidad de este PTI requerida por rollo terminado; unidad indicada en required_unit',
      },
      required_unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'KG',
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
