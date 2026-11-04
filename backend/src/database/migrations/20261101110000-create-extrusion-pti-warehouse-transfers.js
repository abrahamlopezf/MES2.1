'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const exists = tables.some((table) => (typeof table === 'string' ? table : table.tableName) === 'extrusion_pti_warehouse_transfers');
    if (exists) {
      const columns = await queryInterface.describeTable('extrusion_pti_warehouse_transfers');
      if (!columns.transfer_code || !columns.status || !columns.transfer_qr_code_id) {
        throw new Error('La tabla extrusion_pti_warehouse_transfers existe con una estructura incompatible; no se modificó.');
      }
      await queryInterface.sequelize.query('CREATE INDEX IF NOT EXISTS idx_ext_pti_wh_transfer_status_date ON extrusion_pti_warehouse_transfers (status, dispatched_at);');
      return;
    }
    await queryInterface.createTable('extrusion_pti_warehouse_transfers', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      transfer_code: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      source_rack_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'pti_racks', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      pti_product_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'pti_products', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      material_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'materials', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      transfer_qr_code_id: { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'qr_codes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      received_lote_id: { type: Sequelize.INTEGER, allowNull: true, unique: true, references: { model: 'lotes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      quantity_pieces: { type: Sequelize.DECIMAL(12, 3), allowNull: false },
      quantity_kg: { type: Sequelize.DECIMAL(12, 3), allowNull: false },
      material_quantity: { type: Sequelize.DECIMAL(12, 3), allowNull: false },
      material_unit_code: { type: Sequelize.STRING(20), allowNull: false },
      unit_cost: { type: Sequelize.DECIMAL(12, 4), allowNull: false },
      total_cost: { type: Sequelize.DECIMAL(12, 4), allowNull: false },
      status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'PENDIENTE_RECEPCION' },
      source_area_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'areas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      warehouse_area_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'areas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      source_production_entry_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'extrusion_production_entries', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      source_reference: { type: Sequelize.STRING(120), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      dispatched_by: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      dispatched_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      received_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      received_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });
    await queryInterface.sequelize.query('CREATE INDEX IF NOT EXISTS idx_ext_pti_wh_transfer_status_date ON extrusion_pti_warehouse_transfers (status, dispatched_at);');
  },
  async down(queryInterface) {
    await queryInterface.dropTable('extrusion_pti_warehouse_transfers');
  },
};
