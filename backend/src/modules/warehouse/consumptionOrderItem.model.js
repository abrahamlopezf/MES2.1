module.exports = (sequelize, DataTypes) => {
  const ConsumptionOrderItem = sequelize.define(
    'ConsumptionOrderItem',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      material_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      lote_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      requested_quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      fulfilled_quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      unit_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: 'consumption_order_items',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      underscored: true,
    }
  );

  return ConsumptionOrderItem;
};
