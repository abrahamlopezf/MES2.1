const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TipoBaja = sequelize.define('TipoBaja', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'tipos_baja',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  return TipoBaja;
};
