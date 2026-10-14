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
