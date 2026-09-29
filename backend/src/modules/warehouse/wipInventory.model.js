module.exports = (sequelize, DataTypes) => {
  const WipInventory = sequelize.define(
    'WipInventory',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      material_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      lote_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      qr_code_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      area_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: 'wip_inventories',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      underscored: true,
    }
  );

  WipInventory.associate = (models) => {
    WipInventory.belongsTo(models.Material, { foreignKey: 'material_id', as: 'material' });
    WipInventory.belongsTo(models.Lote, { foreignKey: 'lote_id', as: 'lote' });
    WipInventory.belongsTo(models.QrCode, { foreignKey: 'qr_code_id', as: 'qr_code' });
    WipInventory.belongsTo(models.Area, { foreignKey: 'area_id', as: 'area' });
  };

  return WipInventory;
};
