const {
  TRACEABILITY_LINK_TYPE,
} = require('./traceability.constants');

module.exports = (sequelize, DataTypes) => {
  const TraceabilityLink = sequelize.define(
    'TraceabilityLink',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      parent_traceable_item_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      child_traceable_item_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      parent_qr_code_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      child_qr_code_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      link_type: {
        type: DataTypes.ENUM(...Object.values(TRACEABILITY_LINK_TYPE)),
        allowNull: false,
      },
      quantity_used: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: 0,
      },
      quantity_generated: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: 0,
      },
      scrap_quantity: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: 0,
      },
      unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      process_area_id: {
        type: DataTypes.INTEGER,
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
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: 'traceability_links',
      underscored: true,
      timestamps: true,
    }
  );

  return TraceabilityLink;
};