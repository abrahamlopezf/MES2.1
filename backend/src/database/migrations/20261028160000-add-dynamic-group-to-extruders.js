'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('extruders');
    if (!columns.is_dynamic_member) {
      await queryInterface.addColumn('extruders', 'is_dynamic_member', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'La extrusora puede recibir fórmulas del grupo dinámico del cliente.',
      });
    }

    // La pertenencia inicial al grupo dinámico proviene de la decisión del cliente.
    await queryInterface.sequelize.query(`
      UPDATE extruders
      SET is_dynamic_member = (code IN ('EXT-02', 'EXT-04', 'EXT-05')),
          updated_at = NOW()
      WHERE code = 'EXT-01'
         OR code IN ('EXT-02', 'EXT-04', 'EXT-05', 'EXT-LIQ');
    `);
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable('extruders');
    if (columns.is_dynamic_member) {
      await queryInterface.removeColumn('extruders', 'is_dynamic_member');
    }
  },
};
