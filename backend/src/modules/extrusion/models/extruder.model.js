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
      machine_number: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Número físico de extrusora informado por planta; no equivale al ID de base de datos.',
      },
      telares_subarea_code: {
        type: DataTypes.STRING(30),
        allowNull: true,
        comment: 'Destino de bobinas: TELARES_BANDA, TELARES_ROLLO o NO_APLICA.',
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
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      is_dynamic_member: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'La extrusora puede recibir fórmulas del grupo dinámico del cliente.',
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
