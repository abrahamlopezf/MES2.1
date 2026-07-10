const { DataTypes, Model } = require('sequelize');

class Permission extends Model {}

const initPermissionModel = (sequelize) => {
  Permission.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      module: {
        type: DataTypes.STRING(80),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Permission',
      tableName: 'permissions',
      underscored: true,
      timestamps: true,
    }
  );

  return Permission;
};

module.exports = initPermissionModel;