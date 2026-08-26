'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('users');

    if (tableDescription.avatar_url) {
      console.log('⏭️  Column avatar_url already exists in users — skipping.');
      return;
    }

    await queryInterface.addColumn('users', 'avatar_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
      defaultValue: null,
    });

    console.log('✅ Column avatar_url added to users table.');
  },

  down: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('users');
    if (!tableDescription.avatar_url) return;
    await queryInterface.removeColumn('users', 'avatar_url');
  },
};
