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
      source_loom_wip_item_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
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
      unit_cost_per_kg_snapshot: { type: DataTypes.DECIMAL(14, 6), allowNull: true },
      material_cost_mxn: { type: DataTypes.DECIMAL(14, 4), allowNull: true },
      transformation_index_snapshot: { type: DataTypes.DECIMAL(8, 4), allowNull: true },
      transformed_cost_mxn: { type: DataTypes.DECIMAL(14, 4), allowNull: true },
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
