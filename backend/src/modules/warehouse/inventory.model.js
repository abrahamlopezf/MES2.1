module.exports = (sequelize, DataTypes) => {
  const Inventory = sequelize.define(
    'Inventory',
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
      qr_code_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      qr_code_uuid: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      qr_code_value: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      material_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      available_quantity: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: 0,
      },
      reserved_quantity: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: 0,
      },
      damaged_quantity: {
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
      received_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.fn('NOW'),
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
      tableName: 'inventories',
      underscored: true,
    }
  );

  return Inventory;
};
