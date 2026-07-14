const { Model, DataTypes } = require("sequelize");

class ScrapStockMovement extends Model {}

const initScrapStockMovementModel = (sequelize) => {
  ScrapStockMovement.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      process_run_output_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      scrap_catalog_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      from_rack_id: {
        type: DataTypes.INTEGER,
      },

      to_rack_id: {
        type: DataTypes.INTEGER,
      },

      movement_type: {
        type: DataTypes.ENUM("ENTRY", "TRANSFER", "EXIT"),
      },

      quantity: {
        type: DataTypes.DECIMAL(12, 3),
        allowNull: false,
      },

      unit: {
        type: DataTypes.STRING,
        defaultValue: "KG",
      },

      status: {
        type: DataTypes.STRING,
      },

      notes: {
        type: DataTypes.TEXT,
      },

      created_by: {
        type: DataTypes.INTEGER,
      },

      updated_by: {
        type: DataTypes.INTEGER,
      },

      approved_by: {
        type: DataTypes.INTEGER,
      },
    },
    {
      sequelize,
      tableName: "scrap_stock_movements",
      underscored: true,
      timestamps: true,
    },
  );

  return ScrapStockMovement;
};

module.exports = initScrapStockMovementModel;
