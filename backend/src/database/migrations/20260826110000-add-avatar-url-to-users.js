'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'avatar_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
      defaultValue: null,
      after: 'must_change_password',
    });

    console.log('✅ Column avatar_url added to users table.');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'avatar_url');
  },
};
