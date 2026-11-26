'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('TelaresScrapObservation', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  viajero_roll_id: { type: DataTypes.INTEGER, allowNull: false },
  source_qr_code_id: { type: DataTypes.INTEGER, allowNull: false },
  destination_area_code: { type: DataTypes.STRING(24), allowNull: false },
  detecting_area_id: { type: DataTypes.INTEGER, allowNull: false },
  meter_start: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  meter_end: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  scrap_meters: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
  estimated_weight_kg: { type: DataTypes.DECIMAL(14, 3), allowNull: false },
  reason: { type: DataTypes.STRING(120), allowNull: false },
  notes: { type: DataTypes.TEXT, allowNull: true },
  recorded_by: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'telares_scrap_observations', underscored: true, timestamps: true, updatedAt: false });
