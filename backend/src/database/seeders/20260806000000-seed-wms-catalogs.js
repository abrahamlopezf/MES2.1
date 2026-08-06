'use strict';

const db = require('../models');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Warehouses
    const warehouses = [
      { code: 'MP', name: 'Materia Prima' },
      { code: 'PT', name: 'Producto Terminado' },
      { code: 'CQ', name: 'Calidad' },
      { code: 'SCR', name: 'Scrap' },
      { code: 'EXP', name: 'Embarques' }
    ];
    for (const item of warehouses) {
      await db.Warehouse.findOrCreate({ where: { code: item.code }, defaults: item });
    }

    // 2. Storage Location Types
    const locationTypes = [
      { code: 'RACK', name: 'Rack' },
      { code: 'FLOOR', name: 'Piso' },
      { code: 'BUFFER', name: 'Buffer' },
      { code: 'STAGING', name: 'Staging' },
      { code: 'QUARANTINE', name: 'Cuarentena' },
      { code: 'SHIPPING', name: 'Embarques' },
      { code: 'SCRAP', name: 'Scrap' }
    ];
    for (const item of locationTypes) {
      await db.StorageLocationType.findOrCreate({ where: { code: item.code }, defaults: item });
    }

    // 3. Storage Location Statuses
    const locationStatuses = [
      { code: 'ACTIVE', name: 'Activo' },
      { code: 'INACTIVE', name: 'Inactivo' },
      { code: 'BLOCKED', name: 'Bloqueado' },
      { code: 'FULL', name: 'Lleno' },
      { code: 'MAINTENANCE', name: 'Mantenimiento' }
    ];
    for (const item of locationStatuses) {
      await db.StorageLocationStatus.findOrCreate({ where: { code: item.code }, defaults: item });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Para simplificar, en down solemos no hacer nada o borrar todo.
    // Al ser catálogos base, no se recomienda borrarlos, pero se podría implementar un destroy general.
  }
};
