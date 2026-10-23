module.exports = (sequelize, DataTypes) => {
  const LoomBackflushConsumption = sequelize.define(
    'LoomBackflushConsumption',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      viajero_roll_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      loom_run_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      rack_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      pti_product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      theoretical_kg: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      spools_consumed: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      rack_balance_spools_before: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      rack_balance_spools_after: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'loom_backflush_consumptions',
      timestamps: false,
      underscored: true,
    }
  );

  return LoomBackflushConsumption;
};
