module.exports = (sequelize, DataTypes) => sequelize.define(
  'LoomPtiWip',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    loom_id: { type: DataTypes.INTEGER, allowNull: false },
    pti_product_id: { type: DataTypes.INTEGER, allowNull: false },
    source_rack_id: { type: DataTypes.INTEGER, allowNull: true },
    source_production_entry_id: { type: DataTypes.INTEGER, allowNull: true },
    source_extruder_id: { type: DataTypes.INTEGER, allowNull: true },
    destination_subarea_id: { type: DataTypes.INTEGER, allowNull: true },
    source_qr_code: { type: DataTypes.STRING(120), allowNull: true },
    color_snapshot: { type: DataTypes.STRING(240), allowNull: true },
    denier_snapshot: { type: DataTypes.INTEGER, allowNull: true },
    tape_width_mm_snapshot: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
    quantity_received_spools: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    quantity_remaining_spools: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    unit_weight_kg: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
    unit_cost_per_kg: { type: DataTypes.DECIMAL(14, 6), allowNull: true },
    received_by: { type: DataTypes.INTEGER, allowNull: true },
    received_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { tableName: 'loom_pti_wip_items', timestamps: true, underscored: true }
);
