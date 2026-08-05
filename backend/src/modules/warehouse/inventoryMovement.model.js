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
    },
    {
      tableName: 'inventory_movements',
      underscored: true,
    }
  );

  return InventoryMovement;
};
