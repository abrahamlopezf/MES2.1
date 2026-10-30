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
      alert_stock_kg: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 10000.00,
        comment: 'Umbral preventivo de stock antes del mínimo crítico',
      },
      material_tag_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Etiqueta compartida que autoriza los materiales compatibles con este silo',
      },
      is_extrusion_feed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica si el silo abastece directamente la mezcladora de Extrusión',
      },
      current_stock_kg: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      material_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      current_lot_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: null,
      },
      current_lot_type: {
        type: DataTypes.STRING(10),
        allowNull: true,
        defaultValue: null,
        comment: 'Campo legado; la compatibilidad se determina mediante la etiqueta del material',
      },
      unit_cost: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: false,
        defaultValue: 0,
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
