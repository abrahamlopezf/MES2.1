module.exports = (sequelize, DataTypes) => {
  const GloboSpecification = sequelize.define(
    'GloboSpecification',
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
      process_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'EXPANSION',
        comment: 'EXPANSION, FUELLE, CALIBRADO, REFUERZO',
      },
      target_width_cm: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 60.00,
      },
      target_grammage_g_per_m: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 70.00,
      },
      output_product_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        defaultValue: 'Rollo Globo Calibrado',
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
        defaultValue: 1.50,
      },
      cost_transformation_index: {
        type: DataTypes.DECIMAL(8, 4),
        allowNull: false,
        defaultValue: 1.0000,
      },
      loom_roll_requirements: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          allowed_bom_ids: [],
          min_width_cm: 45.0,
          max_width_cm: 65.0,
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
      tableName: 'globo_specifications',
      timestamps: true,
      underscored: true,
    }
  );

  return GloboSpecification;
};
