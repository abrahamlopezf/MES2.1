'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('production_boms', 'standard_output_meters', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Metros que representan expected_output_quantity para prorratear insumos por producto terminado.',
    });
    await queryInterface.addColumn('loom_runs', 'weight_planned_kg', {
      type: Sequelize.DECIMAL(12, 3),
      allowNull: true,
      comment: 'Peso objetivo ingresado al plan de corrida; metros_planned conserva su equivalencia calculada.',
    });
    await queryInterface.addColumn('loom_backflush_consumptions', 'source_loom_wip_item_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'loom_pti_wip_items', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('loom_backflush_consumptions', 'unit_cost_per_kg_snapshot', {
      type: Sequelize.DECIMAL(14, 6), allowNull: true,
    });
    await queryInterface.addColumn('loom_backflush_consumptions', 'material_cost_mxn', {
      type: Sequelize.DECIMAL(14, 4), allowNull: true,
    });
    await queryInterface.addColumn('loom_backflush_consumptions', 'transformation_index_snapshot', {
      type: Sequelize.DECIMAL(8, 4), allowNull: true,
    });
    await queryInterface.addColumn('loom_backflush_consumptions', 'transformed_cost_mxn', {
      type: Sequelize.DECIMAL(14, 4), allowNull: true,
    });
    await queryInterface.addColumn('viajero_rolls', 'cost_data_complete', {
      type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false,
    });
    await queryInterface.changeColumn('viajero_rolls', 'calculated_roll_cost', {
      type: Sequelize.DECIMAL(14, 4), allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('viajero_rolls', 'calculated_roll_cost', {
      type: Sequelize.DECIMAL(14, 4), allowNull: false, defaultValue: 0,
    });
    for (const [table, column] of [
      ['viajero_rolls', 'cost_data_complete'],
      ['loom_backflush_consumptions', 'transformed_cost_mxn'],
      ['loom_backflush_consumptions', 'transformation_index_snapshot'],
      ['loom_backflush_consumptions', 'material_cost_mxn'],
      ['loom_backflush_consumptions', 'unit_cost_per_kg_snapshot'],
      ['loom_backflush_consumptions', 'source_loom_wip_item_id'],
      ['loom_runs', 'weight_planned_kg'],
      ['production_boms', 'standard_output_meters'],
    ]) await queryInterface.removeColumn(table, column);
  },
};
