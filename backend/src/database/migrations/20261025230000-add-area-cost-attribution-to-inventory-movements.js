'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('inventory_movements');
    const additions = [
      ['area_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'areas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }],
      ['consumption_order_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'consumption_orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }],
      ['consumption_order_item_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'consumption_order_items', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }],
      ['cost_treatment', {
        type: Sequelize.STRING(30),
        allowNull: true,
        comment: 'WIP_TRANSFER conserva valor en proceso; DIRECT_EXPENSE carga costo al área.',
      }],
    ];

    for (const [name, definition] of additions) {
      if (!columns[name]) await queryInterface.addColumn('inventory_movements', name, definition);
    }
    await queryInterface.addIndex('inventory_movements', ['area_id', 'cost_treatment', 'created_at'], {
      name: 'idx_inventory_movements_area_cost_treatment_date',
      unique: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('inventory_movements', 'idx_inventory_movements_area_cost_treatment_date');
    const columns = await queryInterface.describeTable('inventory_movements');
    for (const name of ['cost_treatment', 'consumption_order_item_id', 'consumption_order_id', 'area_id']) {
      if (columns[name]) await queryInterface.removeColumn('inventory_movements', name);
    }
  },
};
