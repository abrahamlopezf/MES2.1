module.exports = (sequelize, DataTypes) => sequelize.define(
  'ExtrusionShiftClosure',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    extruder_id: { type: DataTypes.INTEGER, allowNull: false },
    shift_date: { type: DataTypes.DATEONLY, allowNull: false },
    shift_code: { type: DataTypes.STRING(30), allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'CERRADO' },
    estimated_scrap_kg: { type: DataTypes.DECIMAL(14, 3), allowNull: false, defaultValue: 0 },
    actual_scrap_kg: { type: DataTypes.DECIMAL(14, 3), allowNull: false, defaultValue: 0 },
    variance_kg: { type: DataTypes.DECIMAL(14, 3), allowNull: false, defaultValue: 0 },
    estimated_scrap_cost: { type: DataTypes.DECIMAL(14, 4), allowNull: false, defaultValue: 0 },
    actual_scrap_cost: { type: DataTypes.DECIMAL(14, 4), allowNull: false, defaultValue: 0 },
    variance_cost: { type: DataTypes.DECIMAL(14, 4), allowNull: false, defaultValue: 0 },
    closed_by: { type: DataTypes.INTEGER, allowNull: true },
    closed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: 'extrusion_shift_closures', timestamps: true, underscored: true }
);
