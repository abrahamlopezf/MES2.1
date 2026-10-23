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
