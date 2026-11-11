'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const names = tables.map((table) => typeof table === 'string' ? table : table.tableName);
    if (!names.includes('process_preparations')) return;

    await queryInterface.changeColumn('process_preparations', 'destination_qr_code_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'qr_codes', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_process_preparations_paused_mix_drafts
      ON process_preparations (from_area_id, status, updated_at);
    `);
  },

  async down(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const names = tables.map((table) => typeof table === 'string' ? table : table.tableName);
    if (!names.includes('process_preparations')) return;
    await queryInterface.removeIndex('process_preparations', 'idx_process_preparations_paused_mix_drafts').catch(() => {});
    // Older schemas required this value. Do not discard paused drafts on rollback.
    await queryInterface.changeColumn('process_preparations', 'destination_qr_code_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'qr_codes', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
  },
};
