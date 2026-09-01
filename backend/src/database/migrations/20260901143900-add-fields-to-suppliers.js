'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn('suppliers', 'commercial_name', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('suppliers', 'category', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('suppliers', 'tax_id', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      }, { transaction });

      await queryInterface.addColumn('suppliers', 'phone', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('suppliers', 'email', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('suppliers', 'commercial_name', { transaction });
      await queryInterface.removeColumn('suppliers', 'category', { transaction });
      await queryInterface.removeColumn('suppliers', 'tax_id', { transaction });
      await queryInterface.removeColumn('suppliers', 'phone', { transaction });
      await queryInterface.removeColumn('suppliers', 'email', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
