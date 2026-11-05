'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('AreaProcessScrapLog', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  area_id: { type: DataTypes.INTEGER, allowNull: false },
  viajero_roll_id: { type: DataTypes.INTEGER, allowNull: false },
  source_qr_code_id: { type: DataTypes.INTEGER, allowNull: false },
  output_qr_code_id: { type: DataTypes.INTEGER, allowNull: true },
  output_pti_code: { type: DataTypes.STRING(50), allowNull: false },
  specification_code: { type: DataTypes.STRING(50), allowNull: false },
  processed_meters: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  good_meters: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  scrap_meters: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
  good_weight_kg: { type: DataTypes.DECIMAL(14, 3), allowNull: false },
  scrap_weight_kg: { type: DataTypes.DECIMAL(14, 3), allowNull: true },
  reason: { type: DataTypes.STRING(80), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  recorded_by: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'area_process_scrap_logs',
  underscored: true,
  timestamps: true,
  updatedAt: false,
});
