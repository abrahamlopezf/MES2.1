const { DataTypes, Model } = require('sequelize');

class Subarea extends Model {}

const initSubareaModel = (sequelize) => {
  Subarea.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      area_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      nomenclature: {
        type: DataTypes.STRING(10),
        allowNull: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'Subarea',
      tableName: 'subareas',
      timestamps: true,
      paranoid: true, // handles deleted_at
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    }
  );

  return Subarea;
};

module.exports = {
  Subarea,
  initSubareaModel,
};
