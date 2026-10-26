module.exports = (sequelize, DataTypes) => sequelize.define(
  'SystemSetting',
  {
    key: { type: DataTypes.STRING(120), primaryKey: true, allowNull: false },
    value: { type: DataTypes.TEXT, allowNull: false },
    updated_by: { type: DataTypes.INTEGER, allowNull: true },
  },
  { tableName: 'system_settings', timestamps: true, underscored: true }
);
