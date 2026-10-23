module.exports = (sequelize, DataTypes) => {
  const LoomRun = sequelize.define(
    'LoomRun',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      folio: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
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
      shift: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'TURNO_1',
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'EN_PROCESO',
      },
      warp_rack_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      weft_rack_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      meters_planned: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1500.00,
      },
      meters_produced: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      total_weight_produced_kg: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      total_pti_consumed_kg: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      rolls_produced_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      started_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      finished_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'loom_runs',
      timestamps: true,
      underscored: true,
    }
  );

  return LoomRun;
};
