module.exports = (sequelize, DataTypes) => {
  const ProcessRunInput = sequelize.define(
    'ProcessRunInput',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      process_run_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      traceable_item_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      qr_code_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      material_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      input_type: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: 'MAIN_INPUT',
      },

      quantity_planned: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: false,
      },

      quantity_used: {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: true,
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

      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: 'process_run_inputs',
      timestamps: true,
      underscored: true,
    }
  );

  return ProcessRunInput;
};