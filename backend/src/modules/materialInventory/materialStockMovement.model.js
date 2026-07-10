const {
  MATERIAL_MOVEMENT_SOURCE,
  MATERIAL_MOVEMENT_TYPE,
} = require('./materialInventory.constants');

module.exports = (sequelize, DataTypes) => {
  const MaterialStockMovement = sequelize.define(
    'MaterialStockMovement',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      material_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      material_lot_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      movement_type: {
        type: DataTypes.ENUM(...Object.values(MATERIAL_MOVEMENT_TYPE)),
        allowNull: false,
      },
      source: {
        type: DataTypes.ENUM(...Object.values(MATERIAL_MOVEMENT_SOURCE)),
        allowNull: false,
        defaultValue: MATERIAL_MOVEMENT_SOURCE.RECEPCION,
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
      moved_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: 'material_stock_movements',
      underscored: true,
      timestamps: true,
    }
  );

  return MaterialStockMovement;
};