module.exports = (sequelize, DataTypes) => {
  const MaterialUnit = sequelize.define(
    'MaterialUnit',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'material_units',
      underscored: true,
      timestamps: true,
    }
  );

  return MaterialUnit;
};
