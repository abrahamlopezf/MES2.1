'use strict';

/**
 * The QR catalog model and operational services still read/write these nullable
 * compatibility fields. The Phase 2 refactor removed them from older databases,
 * which made QR batch creation and Telares roll finalization fail at runtime.
 * TraceabilityEvent remains the audit source; these fields support current
 * operational lookups until all callers are migrated to event-based queries.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('qr_codes');
    const additions = {
      current_area_id: { type: Sequelize.INTEGER, allowNull: true },
      entity_type: { type: Sequelize.STRING(80), allowNull: true },
      entity_id: { type: Sequelize.INTEGER, allowNull: true },
      used_by: { type: Sequelize.INTEGER, allowNull: true },
      used_at: { type: Sequelize.DATE, allowNull: true },
    };

    for (const [column, definition] of Object.entries(additions)) {
      if (!columns[column]) await queryInterface.addColumn('qr_codes', column, definition);
    }

    const indexes = await queryInterface.showIndex('qr_codes');
    if (!indexes.some((index) => index.name === 'idx_qr_codes_current_area_id_compat')) {
      await queryInterface.addIndex('qr_codes', ['current_area_id'], {
        name: 'idx_qr_codes_current_area_id_compat',
      });
    }
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex('qr_codes');
    if (indexes.some((index) => index.name === 'idx_qr_codes_current_area_id_compat')) {
      await queryInterface.removeIndex('qr_codes', 'idx_qr_codes_current_area_id_compat');
    }

    const columns = await queryInterface.describeTable('qr_codes');
    for (const column of ['used_at', 'used_by', 'entity_id', 'entity_type', 'current_area_id']) {
      if (columns[column]) await queryInterface.removeColumn('qr_codes', column);
    }
  },
};
