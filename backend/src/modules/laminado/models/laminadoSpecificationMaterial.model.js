module.exports = (sequelize, DataTypes) => {
  const LaminadoSpecificationMaterial = sequelize.define(
    'LaminadoSpecificationMaterial',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      laminado_spec_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'laminado_specifications',
          key: 'id',
        },
      },
      material_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'materials',
          key: 'id',
        },
      },
      quantity: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 0.000,
      },
      unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'KG',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'laminado_specification_materials',
      timestamps: true,
      underscored: true,
    }
  );

  return LaminadoSpecificationMaterial;
};
