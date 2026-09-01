const { DataTypes, Model } = require('sequelize');

class WasteRequest extends Model {}

const initWasteRequestModel = (sequelize) => {
  WasteRequest.init(
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
      lote_ids: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      tipo_baja_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
        defaultValue: 'PENDING',
        allowNull: false,
      },
      requested_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      resolved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      resolved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'WasteRequest',
      tableName: 'waste_requests',
      underscored: true,
      timestamps: true,
    }
  );

  return WasteRequest;
};

module.exports = initWasteRequestModel;
