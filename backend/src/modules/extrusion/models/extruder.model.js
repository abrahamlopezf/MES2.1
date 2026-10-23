module.exports = (sequelize, DataTypes) => {
  const Extruder = sequelize.define(
    'Extruder',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'STANDARD',
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      modo_silo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Toggle híbrido: true = alimentación automatizada por Silo; false = alimentación manual por costales',
      },
      silo_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'FK al silo asignado cuando opera en modo_silo',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Notas operativas o especificaciones de exclusividad (ej. exclusiva rafia cinturón)',
      },
    },
    {
      tableName: 'extruders',
      timestamps: true,
      underscored: true,
    }
  );

  return Extruder;
};
