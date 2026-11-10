'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('password_resets', 'code_hash', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });

    // Los códigos legados se almacenaban en claro y no se pueden convertir con
    // seguridad sin volver a exponerlos; se invalidan y el siguiente flujo usa hash.
    await queryInterface.bulkUpdate(
      'password_resets',
      { code: '000000', used: true },
      { used: false }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('password_resets', 'code_hash');
  },
};
