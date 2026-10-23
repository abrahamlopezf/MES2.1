module.exports = (sequelize, DataTypes) => {
  const ViajeroRoutingLog = sequelize.define(
    'ViajeroRoutingLog',
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
      from_stage: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      to_stage: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      area_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      operator_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      action: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      meters_in: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      meters_out: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      weight_in_kg: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      weight_out_kg: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'viajero_routing_logs',
      timestamps: false,
      underscored: true,
    }
  );

  return ViajeroRoutingLog;
};
