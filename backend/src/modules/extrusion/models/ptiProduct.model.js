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
      extrusion_machine_number: { type: DataTypes.INTEGER, allowNull: true },
      tape_type: { type: DataTypes.STRING(80), allowNull: true },
      color: { type: DataTypes.STRING(240), allowNull: true },
      denier: { type: DataTypes.INTEGER, allowNull: true },
      tape_count: { type: DataTypes.INTEGER, allowNull: true },
      tape_count_tolerance: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
      tape_width_mm: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      transformed_cost_index: {
        type: DataTypes.DECIMAL(8, 4), allowNull: false, defaultValue: 1,
        comment: 'Factor applied to the transformed mixture cost per kg when valuing this PTI.',
      },
      unit_weight_kg: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
        defaultValue: null,
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
        allowNull: true,
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
