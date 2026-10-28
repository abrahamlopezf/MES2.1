'use strict';

/**
 * The lotes table was present in deployed databases but had no migration in
 * the tracked migration chain. Create its pre-refactor shape after materials
 * are rebuilt and before fase3-refactor-lotes consumes `amount`.
 *
 * Existing installations already have the post-refactor table. In that case
 * this migration validates the compatible shape and leaves every row/column
 * untouched.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const hasLotes = tables.some((table) => {
      const name = typeof table === 'string' ? table : table.tableName;
      return name === 'lotes';
    });

    if (hasLotes) {
      const columns = await queryInterface.describeTable('lotes');
      const hasRefactorShape = columns.initial_amount && columns.available_amount;
      if (!columns.material_id || (!columns.amount && !hasRefactorShape)) {
        throw new Error('La tabla lotes existe con una estructura inesperada; no se modificó.');
      }
      return;
    }

    await queryInterface.createTable('lotes', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      material_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'materials', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      folio: { type: Sequelize.STRING(100), allowNull: false, defaultValue: 'LEGACY-LOT' },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      qr_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'qr_codes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      location_id: { type: Sequelize.INTEGER, allowNull: true },
      date_received: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      is_frozen: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('lotes', ['material_id']);
  },

  async down() {
    // Keep warehouse lots and quantities during rollback.
  },
};
