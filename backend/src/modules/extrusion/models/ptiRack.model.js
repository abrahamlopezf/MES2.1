module.exports = (sequelize, DataTypes) => {
  const PtiRack = sequelize.define(
    'PtiRack',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      rack_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      qr_code: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true,
      },
      current_pti_type_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID del material de PTI que condiciona el rack exclusivamente',
      },
      current_quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      min_capacity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      max_capacity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 100,
      },
      status: {
        type: DataTypes.ENUM('VACIO', 'DISPONIBLE', 'LLENO'),
        allowNull: false,
        defaultValue: 'VACIO',
      },
      location_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: 'Área de Racks PTI',
      },
    },
    {
      tableName: 'pti_racks',
      timestamps: true,
      underscored: true,
      hooks: {
        beforeSave: (rack) => {
          const qty = Number(rack.current_quantity || 0);
          const maxCap = Number(rack.max_capacity || 100);

          if (qty <= 0) {
            rack.current_quantity = 0;
            rack.current_pti_type_id = null;
            rack.status = 'VACIO';
          } else if (qty >= maxCap) {
            rack.status = 'LLENO';
          } else {
            rack.status = 'DISPONIBLE';
          }
        },
      },
    }
  );

  return PtiRack;
};
