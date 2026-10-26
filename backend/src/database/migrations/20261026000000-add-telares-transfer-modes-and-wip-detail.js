'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const rackColumns = await queryInterface.describeTable('pti_racks');
    if (!rackColumns.container_type) {
      await queryInterface.addColumn('pti_racks', 'container_type', {
        type: Sequelize.STRING(30), allowNull: false, defaultValue: 'RACK',
        comment: 'RACK para modo de traspaso parcial o CARRITO para unidad de transporte completa.',
      });
    }
    if (!rackColumns.tare_weight_kg) {
      await queryInterface.addColumn('pti_racks', 'tare_weight_kg', {
        type: Sequelize.DECIMAL(10, 2), allowNull: true,
        comment: 'Tara medida del contenedor; se mantiene nula hasta conocer el dato real.',
      });
    }
    if (!tables.includes('system_settings')) {
      await queryInterface.createTable('system_settings', {
        key: { type: Sequelize.STRING(120), primaryKey: true, allowNull: false },
        value: { type: Sequelize.TEXT, allowNull: false },
        updated_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      });
    }
    await queryInterface.sequelize.query(`
      INSERT INTO system_settings (key, value, created_at, updated_at)
      VALUES ('telares.pti_transfer_mode', 'RACK_PARTIAL', NOW(), NOW())
      ON CONFLICT (key) DO NOTHING;
    `);

    if (!tables.includes('loom_pti_wip_items')) {
      await queryInterface.createTable('loom_pti_wip_items', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        loom_id: {
          type: Sequelize.INTEGER, allowNull: false,
          references: { model: 'looms', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
        },
        pti_product_id: {
          type: Sequelize.INTEGER, allowNull: false,
          references: { model: 'pti_products', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
        },
        source_rack_id: {
          type: Sequelize.INTEGER, allowNull: true,
          references: { model: 'pti_racks', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        source_production_entry_id: {
          type: Sequelize.INTEGER, allowNull: true,
          references: { model: 'extrusion_production_entries', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        source_extruder_id: {
          type: Sequelize.INTEGER, allowNull: true,
          references: { model: 'extruders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        destination_subarea_id: {
          type: Sequelize.INTEGER, allowNull: true,
          references: { model: 'subareas', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        source_qr_code: { type: Sequelize.STRING(120), allowNull: true },
        color_snapshot: { type: Sequelize.STRING(240), allowNull: true },
        denier_snapshot: { type: Sequelize.INTEGER, allowNull: true },
        tape_width_mm_snapshot: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
        quantity_received_spools: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        quantity_remaining_spools: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
        unit_weight_kg: { type: Sequelize.DECIMAL(10, 3), allowNull: false },
        unit_cost_per_kg: { type: Sequelize.DECIMAL(14, 6), allowNull: true },
        received_by: {
          type: Sequelize.INTEGER, allowNull: true,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        received_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      });
    }
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_loom_pti_wip_loom_product_balance
      ON loom_pti_wip_items (loom_id, pti_product_id, quantity_remaining_spools);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_loom_pti_wip_loom_product_balance;');
    await queryInterface.dropTable('loom_pti_wip_items');
    await queryInterface.dropTable('system_settings');
    const rackColumns = await queryInterface.describeTable('pti_racks');
    if (rackColumns.tare_weight_kg) await queryInterface.removeColumn('pti_racks', 'tare_weight_kg');
    if (rackColumns.container_type) await queryInterface.removeColumn('pti_racks', 'container_type');
  },
};
