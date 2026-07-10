const {
  TRACEABLE_ITEM_STATUS,
  TRACEABLE_ITEM_TYPE,
} = require('./traceability.constants');

module.exports = (sequelize, DataTypes) => {
  const TraceableItem = sequelize.define(
    'TraceableItem',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      qr_code_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
      },
      item_type: {
        type: DataTypes.ENUM(...Object.values(TRACEABLE_ITEM_TYPE)),
        allowNull: false,
      },
      material_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      product_name: {
        type: DataTypes.STRING(180),
        allowNull: true,
      },
      origin_area_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      current_area_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quantity_initial: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: false,
      },
      quantity_current: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: false,
      },
      unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(...Object.values(TRACEABLE_ITEM_STATUS)),
        allowNull: false,
        defaultValue: TRACEABLE_ITEM_STATUS.DISPONIBLE,
      },
      reference_folio: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      supplier_lot: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },
      supplier_reference: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: 'traceable_items',
      underscored: true,
      timestamps: true,
    }
  );

  return TraceableItem;
};