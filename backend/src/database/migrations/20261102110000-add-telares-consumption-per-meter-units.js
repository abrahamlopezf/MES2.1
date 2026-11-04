'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const exists = tables.some((table) => (typeof table === 'string' ? table : table.tableName) === 'production_bom_items');
    if (!exists) throw new Error('No existe production_bom_items; no se puede agregar la unidad de consumo por metro.');

    const columns = await queryInterface.describeTable('production_bom_items');
    if (!columns.consumption_per_meter) {
      await queryInterface.addColumn('production_bom_items', 'consumption_per_meter', {
        type: Sequelize.DECIMAL(12, 6),
        allowNull: true,
        comment: 'Consumo del PTI por metro de producto terminado; la unidad se indica en consumption_per_meter_unit',
      });
    }
    if (!columns.consumption_per_meter_unit) {
      await queryInterface.addColumn('production_bom_items', 'consumption_per_meter_unit', {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Unidad del consumo por metro: KG o PIEZAS',
      });
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    const exists = tables.some((table) => (typeof table === 'string' ? table : table.tableName) === 'production_bom_items');
    if (!exists) return;
    const columns = await queryInterface.describeTable('production_bom_items');
    if (columns.consumption_per_meter_unit) await queryInterface.removeColumn('production_bom_items', 'consumption_per_meter_unit');
    if (columns.consumption_per_meter) await queryInterface.removeColumn('production_bom_items', 'consumption_per_meter');
  },
};
