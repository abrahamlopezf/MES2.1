module.exports = (sequelize, DataTypes) => {
  const PtiProduct = sequelize.define(
    'PtiProduct',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: DataTypes.STRING(60),
        allowNull: false,
        unique: true,
        comment: 'Código o SKU único del carrete/PTI',
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        comment: 'Nombre comercial / operativo del producto saliente (carrete)',
      },
      specifications: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Ficha técnica: calibre, denier, micras, resistencia, color, etc.',
      },
      unit_weight_kg: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 6.800,
        comment: 'Peso unitario estándar por bobina/carrete en kg para cálculo de báscula',
      },
      unit_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Precio unitario de venta/costo por bobina PTI',
      },
      formula_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Fórmula de extrusión de la cual se deriva este producto PTI',
      },
      material_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Referencia a catálogo de materiales (opcional)',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Estado activo/inactivo',
      },
    },
    {
      tableName: 'pti_products',
      timestamps: true,
      underscored: true,
    }
  );

  return PtiProduct;
};
