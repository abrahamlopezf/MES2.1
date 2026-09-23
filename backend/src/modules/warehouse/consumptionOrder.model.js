module.exports = (sequelize, DataTypes) => {
  const ConsumptionOrder = sequelize.define(
    'ConsumptionOrder',
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
      order_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      status: {
        type: DataTypes.ENUM('PENDIENTE', 'PREPARANDO', 'SURTIDA', 'CANCELADA'),
        allowNull: false,
        defaultValue: 'PENDIENTE',
      },
      requested_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      requesting_area_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      resolved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      qr_code_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      resolved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'consumption_orders',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      underscored: true,
    }
  );

  return ConsumptionOrder;
};
