'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const columns = await queryInterface.describeTable('extruder_queues', { transaction });
      if (!columns.output_pti_product_id) {
        await queryInterface.addColumn('extruder_queues', 'output_pti_product_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'PTI de salida capturado al encolar la mezcla',
        }, { transaction });
      }
      if (!columns.output_pti_color) {
        await queryInterface.addColumn('extruder_queues', 'output_pti_color', {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'Color de salida capturado al encolar la mezcla',
        }, { transaction });
      }

      await queryInterface.sequelize.query(`
        UPDATE extruder_queues q
        SET output_pti_product_id = p.id,
            output_pti_color = p.color
        FROM pti_products p
        WHERE p.formula_id = q.formula_id
          AND q.output_pti_product_id IS NULL;
      `, { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface) => {
    const columns = await queryInterface.describeTable('extruder_queues');
    if (columns.output_pti_color) await queryInterface.removeColumn('extruder_queues', 'output_pti_color');
    if (columns.output_pti_product_id) await queryInterface.removeColumn('extruder_queues', 'output_pti_product_id');
  },
};
