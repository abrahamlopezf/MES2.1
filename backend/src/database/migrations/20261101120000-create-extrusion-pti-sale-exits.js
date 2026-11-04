'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const exists = tables.some((table) => (typeof table === 'string' ? table : table.tableName) === 'extrusion_pti_sale_exits');
    if (exists) {
      const columns = await queryInterface.describeTable('extrusion_pti_sale_exits');
      if (!columns.exit_code || !columns.source_rack_id || !columns.rack_qr_code_id) {
        throw new Error('La tabla extrusion_pti_sale_exits existe con una estructura incompatible; no se modificó.');
      }
      return;
    }
    await queryInterface.createTable('extrusion_pti_sale_exits', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      exit_code: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      source_rack_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'pti_racks', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      pti_product_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'pti_products', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      rack_qr_code_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'qr_codes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      quantity_pieces: { type: Sequelize.DECIMAL(12, 3), allowNull: false },
      quantity_kg: { type: Sequelize.DECIMAL(12, 3), allowNull: false },
      unit_cost_per_kg: { type: Sequelize.DECIMAL(14, 6), allowNull: true },
      total_cost: { type: Sequelize.DECIMAL(14, 4), allowNull: true },
      source_area_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'areas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      registered_by: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      registered_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.addIndex('extrusion_pti_sale_exits', ['registered_at', 'source_rack_id'], { name: 'idx_ext_pti_sale_exits_date_rack' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('extrusion_pti_sale_exits');
  },
};
