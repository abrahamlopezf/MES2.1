module.exports = (sequelize, DataTypes) => {
  const ProductionBom = sequelize.define(
    'ProductionBom',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      target_width_cm: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 50.00,
      },
      target_weight_g_per_m: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 65.00,
      },
      warp_density: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 10.00,
      },
      weft_density: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 10.00,
      },
      output_product_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        defaultValue: 'Rollo de Tela Tubular',
      },
      default_route: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: ['TELARES', 'LAMINADO', 'CORTE'],
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'production_boms',
      timestamps: true,
      underscored: true,
    }
  );

  return ProductionBom;
};
