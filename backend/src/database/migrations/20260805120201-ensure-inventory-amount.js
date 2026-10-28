'use strict';

/**
 * Runtime warehouse code and deployed schema use inventories.amount. The
 * original refactor produced available_quantity instead. Reconcile only when
 * amount is absent; existing amount values are always preserved.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('inventories');
    if (columns.amount) return;

    const sourceColumn = columns.available_quantity
      ? 'available_quantity'
      : columns.quantity
        ? 'quantity'
        : null;
    if (!sourceColumn) {
      throw new Error('inventories.amount no existe y no hay una columna de cantidad para recuperarlo.');
    }

    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn('inventories', 'amount', {
        type: Sequelize.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: 0,
      }, { transaction });
      // Copy the legacy available balance only into the newly added field.
      await queryInterface.sequelize.query(
        `UPDATE inventories SET amount = COALESCE("${sourceColumn}", 0)`,
        { transaction },
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down() {
    // Deliberately retain inventory balances; rollback must not delete stock.
  },
};
