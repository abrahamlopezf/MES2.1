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
      output_pti_code: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      configuration_status: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: 'BORRADOR',
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
        allowNull: true,
        comment: 'EXTRUSION_COATING, MONOCAPA, BICAPA, BOPP_FILM, PAPEL_KRAFT',
      },
      target_width_cm: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      coating_grammage_g_per_m2: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      output_product_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        defaultValue: 'Rollo Laminado Terminado',
      },
      expected_output_quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      expected_output_unit: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      standard_output_meters: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      standard_waste_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      cost_transformation_index: {
        type: DataTypes.DECIMAL(8, 4),
        allowNull: true,
      },
      loom_roll_requirements: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
