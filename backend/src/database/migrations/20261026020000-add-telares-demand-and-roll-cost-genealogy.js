'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE production_boms
        ADD COLUMN IF NOT EXISTS standard_output_meters DECIMAL(10,2);
      ALTER TABLE loom_runs
        ADD COLUMN IF NOT EXISTS weight_planned_kg DECIMAL(12,3);
      ALTER TABLE loom_backflush_consumptions
        ADD COLUMN IF NOT EXISTS source_loom_wip_item_id INTEGER REFERENCES loom_pti_wip_items(id) ON UPDATE CASCADE ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS unit_cost_per_kg_snapshot DECIMAL(14,6),
        ADD COLUMN IF NOT EXISTS material_cost_mxn DECIMAL(14,4),
        ADD COLUMN IF NOT EXISTS transformation_index_snapshot DECIMAL(8,4),
        ADD COLUMN IF NOT EXISTS transformed_cost_mxn DECIMAL(14,4);
      ALTER TABLE viajero_rolls
        ADD COLUMN IF NOT EXISTS cost_data_complete BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE viajero_rolls
        ALTER COLUMN calculated_roll_cost TYPE DECIMAL(14,4),
        ALTER COLUMN calculated_roll_cost DROP NOT NULL;
    `);
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
