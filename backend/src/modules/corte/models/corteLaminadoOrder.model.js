module.exports = (sequelize, DataTypes) => sequelize.define('CorteLaminadoOrder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_number: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'REQUESTED' },
  requested_by: { type: DataTypes.INTEGER, allowNull: false },
  requested_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'corte_laminado_orders', timestamps: true, underscored: true });
