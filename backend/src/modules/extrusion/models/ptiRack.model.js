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
      current_pti_product_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Producto PTI exacto que condiciona el rack, incluyendo fórmula y color.',
      },
      destination_subarea_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Subárea de Telares a la que se destina el PTI de este rack',
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
      unit_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Precio unitario por bobina PTI almacenada en el rack (editable por el usuario)',
      },
      unit_cost_per_kg: {
        type: DataTypes.DECIMAL(14, 6),
        allowNull: true,
        comment: 'Costo transformado promedio ponderado por kilogramo del PTI almacenado.',
      },
      unit_weight_kg: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: true,
        defaultValue: null,
        comment: 'Peso unitario estándar por bobina PTI en kg (para conversión peso <-> piezas)',
      },
      container_type: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'RACK',
        comment: 'Tipo de contenedor: CARRITO (transporte) o RACK (estático)',
      },
      tare_weight_kg: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null,
        comment: 'Tara medida del contenedor en kg; nula mientras no se confirme.',
      },
      net_weight_kg: {
        type: DataTypes.VIRTUAL,
        get() {
          const qty = Number(this.getDataValue('current_quantity') || 0);
          const unitW = Number(this.getDataValue('unit_weight_kg') || 0);
          return Number((qty * unitW).toFixed(2));
        },
      },
      gross_weight_kg: {
        type: DataTypes.VIRTUAL,
        get() {
          const tare = Number(this.getDataValue('tare_weight_kg') || 0);
          const qty = Number(this.getDataValue('current_quantity') || 0);
          const unitW = Number(this.getDataValue('unit_weight_kg') || 0);
          return Number((tare + (qty * unitW)).toFixed(2));
        },
      },
      total_value: {
        type: DataTypes.VIRTUAL,
        get() {
          const qty = Number(this.getDataValue('current_quantity') || 0);
          const price = Number(this.getDataValue('unit_price') || 0);
          return Number((qty * price).toFixed(2));
        },
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
            rack.current_pti_product_id = null;
            rack.destination_subarea_id = null;
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
