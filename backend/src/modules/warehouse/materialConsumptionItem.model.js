module.exports = (sequelize, DataTypes) => {
  const MaterialConsumptionItem = sequelize.define(
    'MaterialConsumptionItem',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      consumption_id: {
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
      qr_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
    },
    {
      tableName: 'material_consumption_items',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return MaterialConsumptionItem;
};
