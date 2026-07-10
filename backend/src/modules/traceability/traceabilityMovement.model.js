const {
  TRACEABILITY_MOVEMENT_TYPE,
} = require('./traceability.constants');

module.exports = (sequelize, DataTypes) => {
  const TraceabilityMovement = sequelize.define(
    'TraceabilityMovement',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      traceable_item_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      qr_code_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      movement_type: {
        type: DataTypes.ENUM(...Object.values(TRACEABILITY_MOVEMENT_TYPE)),
        allowNull: false,
      },
      from_area_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      to_area_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      quantity: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: false,
      },
      unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      balance_after: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: false,
      },
      reference_folio: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      performed_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      performed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'traceability_movements',
      underscored: true,
      timestamps: true,
    }
  );

  return TraceabilityMovement;
};