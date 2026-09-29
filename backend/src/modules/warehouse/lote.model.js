const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Lote = sequelize.define('Lote', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    material_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    folio: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'LEGACY-LOT', // For existing database rows
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    qr_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    supplier_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    location_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    date_received: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    initial_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    available_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    is_frozen: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    unit_cost: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: true,
    },
    total_cost: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: true,
    },
  }, {
    tableName: 'lotes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      afterSave: (lote) => {
        if (lote.material_id) syncInventoryAsync(sequelize, lote.material_id);
      },
      afterDestroy: (lote) => {
        if (lote.material_id) syncInventoryAsync(sequelize, lote.material_id);
      },
      afterBulkCreate: (lotes) => {
        const materialIds = [...new Set(lotes.map(l => l.material_id))];
        materialIds.forEach(id => {
          if (id) syncInventoryAsync(sequelize, id);
        });
      }
    }
  });

  return Lote;
};

// Función asíncrona ("tras bambalinas") para recalcular el inventario basado en los lotes activos.
// Se ejecuta fuera del flujo principal (Promise suelta) para no bloquear las transacciones.
function syncInventoryAsync(sequelize, material_id) {
  setTimeout(async () => {
    try {
      const Lote = sequelize.models.Lote;
      const Inventory = sequelize.models.Inventory;
      if (!Lote || !Inventory) return;

      const totalResult = await Lote.sum('available_amount', {
        where: { material_id, is_active: true }
      });
      const total = totalResult || 0;

      let inventory = await Inventory.findOne({ where: { material_id } });
      if (inventory) {
        inventory.amount = total;
        await inventory.save();
      } else if (total > 0) {
        await Inventory.create({ material_id, amount: total });
      }
    } catch (err) {
      console.error(`[Background Sync] Error syncing inventory for material ${material_id}:`, err);
    }
  }, 100); // Pequeño retraso para permitir que la transacción principal haga commit
}
