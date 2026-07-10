const { DataTypes, Model } = require('sequelize');

class Area extends Model {}

const initAreaModel = (sequelize) => {
  Area.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'Area',
      tableName: 'areas',
      underscored: true,
      timestamps: true,
    }
  );

  return Area;
};

module.exports = initAreaModel;