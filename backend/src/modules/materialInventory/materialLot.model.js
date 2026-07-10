const { MATERIAL_LOT_STATUS } = require('./materialInventory.constants');

module.exports = (sequelize, DataTypes) => {
  const MaterialLot = sequelize.define(
    'MaterialLot',
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
      internal_folio: {
        type: DataTypes.STRING(60),
        allowNull: false,
        unique: true,
      },
      supplier_lot: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      supplier_reference: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      received_quantity: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: false,
      },
      current_quantity: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: false,
      },
      unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM(...Object.values(MATERIAL_LOT_STATUS)),
        allowNull: false,
        defaultValue: MATERIAL_LOT_STATUS.DISPONIBLE,
      },
      received_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      location: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      qr_code: {
        type: DataTypes.STRING(180),
        allowNull: true,
        unique: true,
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
      tableName: 'material_lots',
      underscored: true,
      timestamps: true,
    }
  );

  return MaterialLot;
};