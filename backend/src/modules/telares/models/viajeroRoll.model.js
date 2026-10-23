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
      operator_id: {
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
