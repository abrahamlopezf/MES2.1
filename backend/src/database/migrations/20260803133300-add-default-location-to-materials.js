'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('materials', 'default_location_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'operational_areas',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('materials', 'default_location_id');
  }
};
