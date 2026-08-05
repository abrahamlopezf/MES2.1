module.exports = (sequelize, DataTypes) => {
  const StockUnit = sequelize.define(
    'StockUnit',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      qr_code_uuid: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      qr_code_value: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      tracking_code: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      material_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: 0,
      },
      unit_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      location: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      received_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'AVAILABLE',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'stock_units',
      underscored: true,
      timestamps: true,
    }
  );

  return StockUnit;
};
