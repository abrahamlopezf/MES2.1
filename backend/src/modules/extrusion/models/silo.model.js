module.exports = (sequelize, DataTypes) => {
  const Silo = sequelize.define(
    'Silo',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      capacity_kg: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 40000.00,
      },
      min_capacity_kg: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 5000.00,
        comment: 'Nivel mínimo de seguridad / punto de reorden para evitar desabasto',
      },
      current_stock_kg: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 25000.00,
      },
      material_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      current_lot_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: 'LOT-SILO-01',
      },
      current_lot_type: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'A',
        comment: 'Tipo de Lote cargado en el silo: A, B o C (Extrusora 4 prohíbe B)',
      },
      unit_cost: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: false,
        defaultValue: 28.5000,
      },
      location_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: 'silos',
      timestamps: true,
      underscored: true,
    }
  );

  return Silo;
};
