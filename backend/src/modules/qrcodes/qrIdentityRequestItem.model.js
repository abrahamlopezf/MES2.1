'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('QrIdentityRequestItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  request_id: { type: DataTypes.INTEGER, allowNull: false },
  qr_code_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  qr_area_assignment_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  delivered_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'qr_identity_request_items',
  underscored: true,
  timestamps: true,
});
