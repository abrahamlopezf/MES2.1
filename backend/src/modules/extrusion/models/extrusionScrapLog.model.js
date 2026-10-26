module.exports = (sequelize, DataTypes) => {
  const ExtrusionScrapLog = sequelize.define(
    'ExtrusionScrapLog',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      extruder_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Máquina donde se produjo la purga (1, 3, 4, 5)',
      },
      from_mixture_qr_id: {
        type: DataTypes.STRING(120),
        allowNull: false,
        comment: 'QR de la mezcla que fue interrumpida/pausada',
      },
      to_mixture_qr_id: {
        type: DataTypes.STRING(120),
        allowNull: true,
        comment: 'QR de la nueva mezcla que entra (si es transición) o null si es merma operativa',
      },
      scrap_weight_kg: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Peso en kg de la purga/merma de transición generada',
      },
      transition_id: { type: DataTypes.INTEGER, allowNull: true },
      category: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'OPERATIVA' },
      color: { type: DataTypes.STRING(80), allowNull: true },
      estimated_weight_kg: { type: DataTypes.DECIMAL(12, 3), allowNull: true },
      actual_weight_kg: { type: DataTypes.DECIMAL(12, 3), allowNull: true },
      valuation_unit_cost: { type: DataTypes.DECIMAL(14, 6), allowNull: true },
      valuation_total_cost: { type: DataTypes.DECIMAL(14, 4), allowNull: true },
      valuation_status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'PENDIENTE' },
      source_material_id: { type: DataTypes.INTEGER, allowNull: true },
      source_lote_id: { type: DataTypes.INTEGER, allowNull: true },
      source_qr_code_id: { type: DataTypes.INTEGER, allowNull: true },
      from_mix_share: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      to_mix_share: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      shift_code: { type: DataTypes.STRING(30), allowNull: true },
      mixture_consumption_applied: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      actual_weight_method: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'PESAJE_DIRECTO' },
      shift_closure_id: { type: DataTypes.INTEGER, allowNull: true },
      weighed_by: { type: DataTypes.INTEGER, allowNull: true },
      weighed_at: { type: DataTypes.DATE, allowNull: true },
      reason: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: 'PURGA_TRANSICION',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Detalles u observaciones de la merma/scrap',
      },
      logged_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID del usuario que registró el cambio y pesaje',
      },
    },
    {
      tableName: 'extrusion_scrap_logs',
      timestamps: true,
      underscored: true,
    }
  );

  return ExtrusionScrapLog;
};
