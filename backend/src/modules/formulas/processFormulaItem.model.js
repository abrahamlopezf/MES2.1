module.exports = (sequelize, DataTypes) => {
  const ProcessFormulaItem = sequelize.define(
    'ProcessFormulaItem',
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

      material_role: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'BASE',
      },

      calculation_type: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'FIXED_QUANTITY',
      },

      quantity: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: true,
      },

      percentage: {
        type: DataTypes.DECIMAL(8, 4),
        allowNull: true,
      },

      unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },

      tolerance_min: {
        type: DataTypes.DECIMAL(8, 4),
        allowNull: true,
      },

      tolerance_max: {
        type: DataTypes.DECIMAL(8, 4),
        allowNull: true,
      },

      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },

      is_required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'process_formula_items',
      timestamps: true,
      underscored: true,
    }
  );

  return ProcessFormulaItem;
};