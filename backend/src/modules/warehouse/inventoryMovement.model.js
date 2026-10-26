module.exports = (sequelize, DataTypes) => {
  const InventoryMovement = sequelize.define(
    'InventoryMovement',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      uuid: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
      inventory_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      quantity_change: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
      },
      from_location_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      to_location_id: {
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
      unit_cost: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: true,
      },
      total_cost: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: true,
      },
      area_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      consumption_order_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      consumption_order_item_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      cost_treatment: {
        type: DataTypes.STRING(30),
        allowNull: true,
        comment: 'WIP_TRANSFER mantiene valor en proceso; DIRECT_EXPENSE carga costo al área.',
      },
    },
    {
      tableName: 'inventory_movements',
      underscored: true,
    }
  );

  return InventoryMovement;
};
