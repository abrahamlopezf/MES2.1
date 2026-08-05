module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Asegurar extensión pgcrypto para UUID gen_random_uuid()
    try { await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;'); } catch(e) {}

    try { await queryInterface.removeConstraint('stock_units', 'stock_units_material_id_fkey'); } catch(e) {}
    try { await queryInterface.removeConstraint('traceable_items', 'traceable_items_material_id_fkey'); } catch(e) {}
    
    const tablesToDrop = [
      'material_stock_movements',
      'material_lots',
      'material_stocks',
      'materials',
      'material_subcategories',
      'material_categories'
    ];
    for (const table of tablesToDrop) {
      try { await queryInterface.dropTable(table, { cascade: true }); } catch (e) {}
    }
  },
  down: async (queryInterface, Sequelize) => {}
};