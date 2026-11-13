module.exports = (sequelize, DataTypes) => sequelize.define('CorteLaminadoOrderItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER, allowNull: false },
  roll_id: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'REQUESTED' },
  picked_by: { type: DataTypes.INTEGER, allowNull: true },
  picked_at: { type: DataTypes.DATE, allowNull: true },
  processed_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'corte_laminado_order_items', timestamps: true, underscored: true });
