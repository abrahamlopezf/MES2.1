'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('ExtrusionShiftMixtureHandoff', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  from_shift_session_id: { type: DataTypes.INTEGER, allowNull: false },
  to_shift_session_id: { type: DataTypes.INTEGER, allowNull: true },
  extruder_id: { type: DataTypes.INTEGER, allowNull: false },
  queue_id: { type: DataTypes.INTEGER, allowNull: false },
  process_preparation_id: { type: DataTypes.INTEGER, allowNull: true },
  mixture_qr: { type: DataTypes.STRING(120), allowNull: false },
  formula_id: { type: DataTypes.INTEGER, allowNull: true },
  pti_color: { type: DataTypes.STRING(240), allowNull: true },
  remaining_balance_kg: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'RECIBIDO' },
  balance_captured_by: { type: DataTypes.INTEGER, allowNull: true },
  balance_captured_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  accepted_by: { type: DataTypes.INTEGER, allowNull: true },
  accepted_at: { type: DataTypes.DATE, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'extrusion_shift_mixture_handoffs', timestamps: true, underscored: true });
