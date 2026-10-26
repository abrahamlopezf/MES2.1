module.exports = (sequelize, DataTypes) => sequelize.define(
  'ViajeroRollOperatorSegment',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    viajero_roll_id: { type: DataTypes.INTEGER, allowNull: false },
    operator_id: { type: DataTypes.INTEGER, allowNull: false },
    shift_number: { type: DataTypes.INTEGER, allowNull: false },
    meters_start: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    meters_end: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    weight_start_kg: { type: DataTypes.DECIMAL(12, 3), allowNull: true },
    weight_end_kg: { type: DataTypes.DECIMAL(12, 3), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    recorded_by: { type: DataTypes.INTEGER, allowNull: true },
  },
  { tableName: 'viajero_roll_operator_segments', underscored: true, timestamps: true },
);
