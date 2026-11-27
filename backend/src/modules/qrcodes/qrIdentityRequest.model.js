'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('QrIdentityRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  area_id: { type: DataTypes.INTEGER, allowNull: false },
  requested_by: { type: DataTypes.INTEGER, allowNull: false },
  requested_quantity: { type: DataTypes.INTEGER, allowNull: false },
  notes: { type: DataTypes.TEXT, allowNull: true },
  requested_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  delivered_by: { type: DataTypes.INTEGER, allowNull: true },
  delivered_at: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'qr_identity_requests',
  underscored: true,
  timestamps: true,
});
