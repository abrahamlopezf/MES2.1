module.exports = (sequelize, DataTypes) => {
  const Formula = sequelize.define(
    'Formula',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      batch_size_kg: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 500.00,
        comment: 'Peso total de la mezcla en kg (habitualmente 500kg)'
      },
      cost_index: {
        type: DataTypes.DECIMAL(8, 4),
        allowNull: false,
        defaultValue: 1.1500,
        comment: 'Índice de multiplicación para el valor de la mezcla/fórmula'
      },
      expected_yield_pieces: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Cantidad teórica de piezas de PTI producidas por mezcla'
      },
      expected_yield_kg: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Rendimiento total esperado en kg de PTI'
      },
      allowed_extruders: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [1, 3, 4, 5],
        comment: 'Lista de IDs de extrusoras autorizadas para esta fórmula'
      },
      restricted_extruders: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Lista de IDs de máquinas donde está explícitamente prohibida'
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'formulas',
      timestamps: true,
      underscored: true,
    }
  );

  return Formula;
};
