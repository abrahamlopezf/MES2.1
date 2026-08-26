const { DataTypes, Model } = require('sequelize');

class User extends Model {}

const initUserModel = (sequelize) => {
  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      first_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      last_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      username: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
      },
      numero_nomina: {
        type: DataTypes.STRING(30),
        allowNull: true,
        unique: true,
      },
      telefono: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      must_change_password: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      avatar_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      password_change_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      last_password_change_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      underscored: true,
      timestamps: true,
      defaultScope: {
        attributes: {
          exclude: ['password_hash'],
        },
      },
      scopes: {
        withPassword: {
          attributes: {
            include: ['password_hash'],
          },
        },
      },
    }
  );

  return User;
};

module.exports = initUserModel;