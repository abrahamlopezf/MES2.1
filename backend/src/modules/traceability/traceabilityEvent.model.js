module.exports = (sequelize, DataTypes) => {
  const TraceabilityEvent = sequelize.define(
    'TraceabilityEvent',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      qr_code_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      entity_type: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },
      entity_id: {
        type: DataTypes.STRING(80),
        allowNull: true,
      },
      event_type: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      from_status: {
        type: DataTypes.STRING(40),
        allowNull: true,
      },
      to_status: {
        type: DataTypes.STRING(40),
        allowNull: true,
      },
      from_area_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      to_area_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      performed_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
    },
    {
      tableName: 'traceability_events',
      underscored: true,
    }
  );

  return TraceabilityEvent;
};
