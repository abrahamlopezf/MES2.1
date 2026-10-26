module.exports = (sequelize, DataTypes) => {
  const LaminadoSpecification = sequelize.define(
    'LaminadoSpecification',
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
      lamination_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'EXTRUSION_COATING',
        comment: 'EXTRUSION_COATING, MONOCAPA, BICAPA, BOPP_FILM, PAPEL_KRAFT',
      },
      target_width_cm: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 50.00,
      },
      coating_grammage_g_per_m2: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 20.00,
      },
      output_product_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        defaultValue: 'Rollo Laminado Terminado',
      },
      expected_output_quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1.00,
      },
      expected_output_unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'ROLLO',
      },
      standard_output_meters: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 1000.00,
      },
      standard_waste_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 2.00,
      },
      cost_transformation_index: {
        type: DataTypes.DECIMAL(8, 4),
        allowNull: false,
        defaultValue: 1.0500,
      },
      loom_roll_requirements: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          allowed_bom_ids: [],
          accepts_from_globo: true,
          min_width_cm: 40.0,
          max_width_cm: 75.0,
          fabric_type: 'TUBULAR',
          meters_per_output: 1000,
          notes: '',
        },
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'laminado_specifications',
      timestamps: true,
      underscored: true,
    }
  );

  return LaminadoSpecification;
};
