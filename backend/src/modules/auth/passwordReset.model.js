const { DataTypes, Model } = require('sequelize');

class PasswordReset extends Model {}

const initPasswordResetModel = (sequelize) => {
  PasswordReset.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(6),
        allowNull: false,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      used: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'PasswordReset',
      tableName: 'password_resets',
      underscored: true,
      timestamps: true,
    }
  );

  return PasswordReset;
};

module.exports = initPasswordResetModel;
