'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const exists = tables.some((table) => (typeof table === 'string' ? table : table.tableName) === 'telares_scrap_logs');
    if (!exists) {
      await queryInterface.createTable('telares_scrap_logs', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        loom_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'looms', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
        logged_date: { type: Sequelize.DATEONLY, allowNull: false },
        shift_number: { type: Sequelize.SMALLINT, allowNull: false },
        scrap_weight_kg: { type: Sequelize.DECIMAL(12, 3), allowNull: false },
        notes: { type: Sequelize.TEXT, allowNull: true },
        recorded_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        updated_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    } else {
      const columns = await queryInterface.describeTable('telares_scrap_logs');
      for (const required of ['loom_id', 'logged_date', 'shift_number', 'scrap_weight_kg', 'recorded_by', 'updated_by']) {
        if (!columns[required]) throw new Error(`La tabla telares_scrap_logs existe sin la columna ${required}; no se modificó.`);
      }
    }
    await queryInterface.sequelize.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_telares_scrap_loom_date_shift ON telares_scrap_logs (loom_id, logged_date, shift_number);');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('telares_scrap_logs');
  },
};
