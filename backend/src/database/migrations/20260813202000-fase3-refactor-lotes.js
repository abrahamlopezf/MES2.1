'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn('lotes', 'initial_amount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('lotes', 'available_amount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      }, { transaction });

      // Copy data from amount
      await queryInterface.sequelize.query(
        `UPDATE lotes SET initial_amount = amount, available_amount = amount;`,
        { transaction }
      );

      // Make columns not null
      await queryInterface.changeColumn('lotes', 'initial_amount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      }, { transaction });

      await queryInterface.changeColumn('lotes', 'available_amount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      }, { transaction });

      // Drop original amount
      await queryInterface.removeColumn('lotes', 'amount', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn('lotes', 'amount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      }, { transaction });

      await queryInterface.sequelize.query(
        `UPDATE lotes SET amount = initial_amount;`,
        { transaction }
      );

      await queryInterface.changeColumn('lotes', 'amount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      }, { transaction });

      await queryInterface.removeColumn('lotes', 'initial_amount', { transaction });
      await queryInterface.removeColumn('lotes', 'available_amount', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
