module.exports = (sequelize, DataTypes) => {
  const ProcessFormula = sequelize.define(
    'ProcessFormula',
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

      target_area_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      target_intermediate_material_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },

      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'ACTIVA',
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: 'process_formulas',
      timestamps: true,
      underscored: true,
    }
  );

  return ProcessFormula;
};