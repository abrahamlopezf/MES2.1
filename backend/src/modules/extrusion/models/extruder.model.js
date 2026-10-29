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
