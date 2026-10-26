module.exports = (sequelize, DataTypes) => {
  const ProcessPreparationInput = sequelize.define(
    'ProcessPreparationInput',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      preparation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      formula_item_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      source_traceable_item_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      source_qr_code_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      material_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      quantity: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: false,
      },

      unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },

      balance_before: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: false,
      },

      balance_after: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: false,
      },

      source_lote_id: { type: DataTypes.INTEGER, allowNull: true },
      source_silo_id: { type: DataTypes.INTEGER, allowNull: true },
      source_lot_number: { type: DataTypes.STRING(120), allowNull: true },
      unit_cost_snapshot: { type: DataTypes.DECIMAL(12, 4), allowNull: true },
      extended_cost_snapshot: { type: DataTypes.DECIMAL(14, 4), allowNull: true },
    },
    {
      tableName: 'process_preparation_inputs',
      timestamps: true,
      underscored: true,
    }
  );

  return ProcessPreparationInput;
};
