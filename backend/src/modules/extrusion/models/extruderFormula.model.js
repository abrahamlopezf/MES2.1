module.exports = (sequelize, DataTypes) => {
  const ExtruderFormula = sequelize.define(
    'ExtruderFormula',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      extruder_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'extruders',
          key: 'id',
        },
      },
      formula_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'formulas',
          key: 'id',
        },
      },
      is_allowed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'extrusoras_formulas',
      timestamps: true,
      underscored: true,
    }
  );

  return ExtruderFormula;
};
