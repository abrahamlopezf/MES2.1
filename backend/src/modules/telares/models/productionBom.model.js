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
      subarea_id: { type: DataTypes.INTEGER, allowNull: true },
      product_kind: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'ROLLO_TELA',
        comment: 'Tipo de PTI de salida de Telares: ROLLO_TELA, BANDA o CINTA.',
      },
      output_color: { type: DataTypes.STRING(100), allowNull: true },
      output_width_value: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      output_width_unit: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'CM' },
      output_denier: { type: DataTypes.INTEGER, allowNull: true },
      tensile_strength_lb: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      units_per_pallet: { type: DataTypes.INTEGER, allowNull: true },
      packaging_type: { type: DataTypes.STRING(50), allowNull: true },
      output_weight_kg: { type: DataTypes.DECIMAL(10, 3), allowNull: true },
      is_provisional: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
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
      expected_output_quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1,
      },
      expected_output_unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'ROLLO',
      },
      standard_output_meters: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Metros que representan expected_output_quantity y permiten prorratear los insumos por producto.',
      },
      default_route: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: ['TELARES', 'LAMINADO', 'CORTE'],
      },
      ounces_yd2: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
        comment: 'Gramaje en Onzas por yarda cuadrada (3.0, 5.0, 6.0, 6.5, 7.2, 8.0 oz/yd2)',
      },
      fabric_type: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'TUBULAR',
        comment: 'TUBULAR o PLANA',
      },
      tape_color: {
        type: DataTypes.STRING(80),
        allowNull: false,
        defaultValue: 'N/A',
        comment: 'Color de cinta de identificación (N/A, VERDE / MORADO, ROJO, AZUL)',
      },
      tape_denier: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 2300,
        comment: 'Denier de la cinta de identificación (ej. 1200, 2300)',
      },
      tape_width_mm: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 3.00,
        comment: 'Ancho de la cinta (ej. 3mm)',
      },
      weft_denier: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: '1800 - 2000',
        comment: 'Denier de Trama permitido (ej. 1200, 1800-2000, 2000, 2000-2300)',
      },
      warp_denier: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: '1800 - 2000',
        comment: 'Denier de Urdimbre permitido (ej. 1200, 1800-2000, 2100)',
      },
      cost_transformation_index: {
        type: DataTypes.DECIMAL(8, 4),
        allowNull: false,
        defaultValue: 1.0000,
        comment: 'Índice de transformación de costo editable para tejeduría',
      },
      general_considerations: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Consideraciones técnicas y restricciones operativas',
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
