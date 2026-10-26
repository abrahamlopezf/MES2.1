module.exports = (sequelize, DataTypes) => sequelize.define(
  'ExtrusionTransition',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    extruder_id: { type: DataTypes.INTEGER, allowNull: false },
    from_queue_id: { type: DataTypes.INTEGER, allowNull: true },
    to_queue_id: { type: DataTypes.INTEGER, allowNull: false },
    from_mixture_qr: { type: DataTypes.STRING(120), allowNull: false },
    to_mixture_qr: { type: DataTypes.STRING(120), allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ABIERTA' },
    shift_code: { type: DataTypes.STRING(30), allowNull: true },
    started_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    closed_at: { type: DataTypes.DATE, allowNull: true },
    started_by: { type: DataTypes.INTEGER, allowNull: true },
    closed_by: { type: DataTypes.INTEGER, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: 'extrusion_transitions', timestamps: true, underscored: true }
);
