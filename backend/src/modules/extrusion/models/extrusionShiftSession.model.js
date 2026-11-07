module.exports = (sequelize, DataTypes) => sequelize.define('ExtrusionShiftSession', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  shift_date: { type: DataTypes.DATEONLY, allowNull: false },
  shift_code: { type: DataTypes.STRING(30), allowNull: false },
  status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'ABIERTO' },
  supervisor_id: { type: DataTypes.INTEGER, allowNull: false },
  opened_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  closed_at: { type: DataTypes.DATE, allowNull: true },
  closed_by: { type: DataTypes.INTEGER, allowNull: true },
  closing_snapshot: { type: DataTypes.JSONB, allowNull: true },
}, { tableName: 'extrusion_shift_sessions', timestamps: true, underscored: true });
