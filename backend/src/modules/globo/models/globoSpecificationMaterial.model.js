module.exports = (sequelize, DataTypes) => {
  const GloboSpecificationMaterial = sequelize.define(
    'GloboSpecificationMaterial',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      globo_spec_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'globo_specifications',
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
      tableName: 'globo_specification_materials',
      timestamps: true,
      underscored: true,
    }
  );

  return GloboSpecificationMaterial;
};
