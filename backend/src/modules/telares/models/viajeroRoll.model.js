module.exports = (sequelize, DataTypes) => {
  const ViajeroRoll = sequelize.define(
    'ViajeroRoll',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      qr_code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      roll_code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      run_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      loom_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      bom_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      product_kind: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'ROLLO_TELA' },
      output_product_name: { type: DataTypes.STRING(150), allowNull: true },
      output_color: { type: DataTypes.STRING(100), allowNull: true },
      output_width_value: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      output_width_unit: { type: DataTypes.STRING(20), allowNull: true },
      output_denier: { type: DataTypes.INTEGER, allowNull: true },
      tensile_strength_lb: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      units_per_pallet: { type: DataTypes.INTEGER, allowNull: true },
      packaging_type: { type: DataTypes.STRING(50), allowNull: true },
      operator_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      shift_supervisor_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      meters: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      weight_kg: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      width_cm: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      grammage_g_per_m: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      route: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      current_stage: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'TELARES',
      },
      next_allowed_stage: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      stages_history: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      },
      loom_number: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      shift_number: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      roll_sequence: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      operator_nomina: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      cost_transformation_index: {
        type: DataTypes.DECIMAL(8, 4),
        allowNull: false,
        defaultValue: 1.0000,
      },
      calculated_roll_cost: {
        type: DataTypes.DECIMAL(14, 4),
        allowNull: true,
        defaultValue: 0.0000,
      },
      cost_data_complete: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      ounces_yd2: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
      },
      fabric_type: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      tape_color: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'DISPONIBLE',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'viajero_rolls',
      timestamps: true,
      underscored: true,
    }
  );

  return ViajeroRoll;
};
