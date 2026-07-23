'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Modificar numero_nomina para permitir nulos
    await queryInterface.changeColumn('users', 'numero_nomina', {
      type: Sequelize.STRING(30),
      allowNull: true,
      unique: true, // Mantener unique pero ignorará los nulls por defecto en postgres
    });

    // 2. Agregar la columna telefono si no existe
    const tableInfo = await queryInterface.describeTable('users');
    if (!tableInfo.telefono) {
      await queryInterface.addColumn('users', 'telefono', {
        type: Sequelize.STRING(20),
        allowNull: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // 1. Revertir telefono
    const tableInfo = await queryInterface.describeTable('users');
    if (tableInfo.telefono) {
      await queryInterface.removeColumn('users', 'telefono');
    }

    // 2. Revertir numero_nomina (Puede fallar si hay nulos, pero es un downgrade)
    await queryInterface.changeColumn('users', 'numero_nomina', {
      type: Sequelize.STRING(30),
      allowNull: false,
      unique: true,
    });
  }
};
