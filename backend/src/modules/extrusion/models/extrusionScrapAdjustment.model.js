module.exports = (sequelize, DataTypes) => sequelize.define(
  'ExtrusionScrapAdjustment',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    scrap_log_id: { type: DataTypes.INTEGER, allowNull: false },
    previous_weight_kg: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
    corrected_weight_kg: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
    correction_reason: { type: DataTypes.TEXT, allowNull: false },
    corrected_by: { type: DataTypes.INTEGER, allowNull: true },
  },
  { tableName: 'extrusion_scrap_adjustments', timestamps: true, createdAt: true, updatedAt: false, underscored: true }
);
