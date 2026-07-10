module.exports = (sequelize, DataTypes) => {
  const MaterialStock = sequelize.define(
    'MaterialStock',
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
        unique: true,
      },
      current_quantity: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: 0,
      },
      reserved_quantity: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: 0,
      },
      available_quantity: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: 0,
      },
      default_unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      last_movement_at: {
        type: DataTypes.DATE,
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
      tableName: 'material_stocks',
      underscored: true,
      timestamps: true,
    }
  );

  return MaterialStock;
};