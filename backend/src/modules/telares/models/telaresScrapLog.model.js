module.exports = (sequelize, DataTypes) => sequelize.define('TelaresScrapLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  loom_id: { type: DataTypes.INTEGER, allowNull: false },
  logged_date: { type: DataTypes.DATEONLY, allowNull: false },
  shift_number: { type: DataTypes.SMALLINT, allowNull: false },
  scrap_weight_kg: { type: DataTypes.DECIMAL(12, 3), allowNull: false },
  notes: { type: DataTypes.TEXT, allowNull: true },
  recorded_by: { type: DataTypes.INTEGER, allowNull: true },
  updated_by: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'telares_scrap_logs',
  timestamps: true,
  underscored: true,
  indexes: [{ unique: true, fields: ['loom_id', 'logged_date', 'shift_number'], name: 'uq_telares_scrap_loom_date_shift' }],
});
