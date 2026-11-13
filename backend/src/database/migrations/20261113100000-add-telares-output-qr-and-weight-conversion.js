'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const bomColumns = await queryInterface.describeTable('production_boms');
    if (!bomColumns.weight_conversion_width_m) {
      await queryInterface.addColumn('production_boms', 'weight_conversion_width_m', {
        type: Sequelize.DECIMAL(10, 4), allowNull: true,
        comment: 'Ancho Manga en metros usado por la conversión del Excel.',
      });
    }
    if (!bomColumns.weight_conversion_factor) {
      await queryInterface.addColumn('production_boms', 'weight_conversion_factor', {
        type: Sequelize.DECIMAL(8, 4), allowNull: true,
        comment: 'Factor de capas editable por ficha; normalmente 2 tubular y 1 plana.',
      });
    }
    const rollColumns = await queryInterface.describeTable('viajero_rolls');
    if (!rollColumns.virgin_qr_code_id) {
      await queryInterface.addColumn('viajero_rolls', 'virgin_qr_code_id', {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'qr_codes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
      });
    }
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_viajero_rolls_virgin_qr_code_id
      ON viajero_rolls (virgin_qr_code_id) WHERE virgin_qr_code_id IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS uq_viajero_rolls_virgin_qr_code_id;');
    const rollColumns = await queryInterface.describeTable('viajero_rolls');
    if (rollColumns.virgin_qr_code_id) await queryInterface.removeColumn('viajero_rolls', 'virgin_qr_code_id');
    const bomColumns = await queryInterface.describeTable('production_boms');
    if (bomColumns.weight_conversion_factor) await queryInterface.removeColumn('production_boms', 'weight_conversion_factor');
    if (bomColumns.weight_conversion_width_m) await queryInterface.removeColumn('production_boms', 'weight_conversion_width_m');
  },
};
