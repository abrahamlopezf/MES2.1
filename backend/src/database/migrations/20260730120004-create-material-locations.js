'use strict';

/** Restore the missing baseline for the warehouse location catalog. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const exists = tables.some((table) => {
      const name = typeof table === 'string' ? table : table.tableName;
      return name === 'material_locations';
    });
    if (exists) {
      const columns = await queryInterface.describeTable('material_locations');
      if (!columns.id || !columns.code || !columns.name) {
        throw new Error('material_locations existe con una estructura inesperada; no se modificó.');
      }
      return;
    }

    await queryInterface.createTable('material_locations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      uuid: { type: Sequelize.UUID, allowNull: false, defaultValue: Sequelize.UUIDV4, unique: true },
      code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      description: { type: Sequelize.STRING(255), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  async down() {
    // Keep location master data on rollback.
  },
};
