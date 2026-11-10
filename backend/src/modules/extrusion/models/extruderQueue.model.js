module.exports = (sequelize, DataTypes) => {
  const ExtruderQueue = sequelize.define(
    'ExtruderQueue',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      extruder_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'ID de la máquina extrusora (1, 3, 4, 5)',
      },
      consumption_order_qr_id: {
        type: DataTypes.STRING(120),
        allowNull: false,
        comment: 'Código QR de la orden de consumo validada desde almacén',
      },
      consumption_order_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'FK a consumption_orders si aplica',
      },
      formula_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'FK a la fórmula asociada a la mezcla',
      },
      process_preparation_id: { type: DataTypes.INTEGER, allowNull: true },
      shift_session_id: { type: DataTypes.INTEGER, allowNull: true },
      mixture_balance_initial_kg: { type: DataTypes.DECIMAL(14, 3), allowNull: true },
      // Persist the exact output PTI/color chosen when the mixture was prepared.
      // These columns already exist in extruder_queues; defining them on the
      // model keeps shift handoff, queue transitions, and summaries from
      // silently dropping the snapshot when Sequelize loads a queue row.
      output_pti_product_id: { type: DataTypes.INTEGER, allowNull: true },
      output_pti_color: { type: DataTypes.STRING(80), allowNull: true },
      priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Nivel de prioridad en la cola (mayor número = mayor prioridad)',
      },
      status: {
        type: DataTypes.ENUM('EN_ESPERA', 'ACTIVA', 'PAUSADA', 'COMPLETADA', 'CANCELADA'),
        allowNull: false,
        defaultValue: 'EN_ESPERA',
      },
      is_silo_kit: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Campo legado; las preparaciones actuales son mezclas completas y el PP del silo queda trazado en sus entradas.',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'extruder_queues',
      timestamps: true,
      underscored: true,
    }
  );

  return ExtruderQueue;
};
