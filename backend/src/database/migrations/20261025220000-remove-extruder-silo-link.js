'use strict';

module.exports = {
  async up(queryInterface) {
    const columns = await queryInterface.describeTable('extruders');
    if (columns.silo_id) await queryInterface.removeColumn('extruders', 'silo_id');
    if (columns.modo_silo) await queryInterface.removeColumn('extruders', 'modo_silo');
  },

  async down(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('extruders');
    if (!columns.modo_silo) {
      await queryInterface.addColumn('extruders', 'modo_silo', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
    if (!columns.silo_id) {
      await queryInterface.addColumn('extruders', 'silo_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'silos', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }
  },
};
