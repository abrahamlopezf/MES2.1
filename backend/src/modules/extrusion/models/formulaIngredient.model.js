module.exports = (sequelize, DataTypes) => {
  const FormulaIngredient = sequelize.define(
    'FormulaIngredient',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      formula_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      material_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      equivalence_tag_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Only materials tagged with this tag may substitute for the formula ingredient.'
      },
      quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      percentage: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0,
      },
      unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'KG',
      },
      is_restricted_on_machine_4: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Verdadero si el material es POLIPROPILENO (B) o está prohibido en Extrusora 4'
      },
      restricted_machine_ids: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Lista de IDs de máquinas donde este ingrediente está prohibido'
      },
    },
    {
      tableName: 'formula_ingredients',
      timestamps: true,
      underscored: true,
    }
  );

  return FormulaIngredient;
};
