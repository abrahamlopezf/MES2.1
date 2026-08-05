'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Rename table
      await queryInterface.renameTable('stock_units', 'inventories', { transaction });

      // 2. Add UUID
      await queryInterface.addColumn('inventories', 'uuid', {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        unique: true
      }, { transaction });

      // 3. Add qr_code_id integer reference
      await queryInterface.addColumn('inventories', 'qr_code_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'qr_codes',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }, { transaction });

      // 4. Add new quantity fields
      await queryInterface.addColumn('inventories', 'available_quantity', {
        type: Sequelize.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: 0
      }, { transaction });

      await queryInterface.addColumn('inventories', 'reserved_quantity', {
        type: Sequelize.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: 0
      }, { transaction });

      await queryInterface.addColumn('inventories', 'damaged_quantity', {
        type: Sequelize.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: 0
      }, { transaction });

      // 5. Migrate data if any (we assume DB is empty or we can just copy quantity to available_quantity)
      await queryInterface.sequelize.query(`
        UPDATE inventories 
        SET available_quantity = quantity
      `, { transaction });

      // 6. Remove old quantity
      await queryInterface.removeColumn('inventories', 'quantity', { transaction });

      // 7. Remove user_id (it belongs to movements)
      const constraints = await queryInterface.showConstraint('inventories');
      const userConstraints = constraints.filter(c => c.columnNames && c.columnNames.includes('user_id') && c.constraintType === 'FOREIGN KEY');
      for (const c of userConstraints) {
        await queryInterface.removeConstraint('inventories', c.constraintName, { transaction });
      }
      await queryInterface.removeColumn('inventories', 'user_id', { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn('inventories', 'user_id', {
        type: Sequelize.INTEGER,
        allowNull: true
      }, { transaction });
      await queryInterface.addColumn('inventories', 'quantity', {
        type: Sequelize.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: 0
      }, { transaction });
      
      await queryInterface.removeColumn('inventories', 'damaged_quantity', { transaction });
      await queryInterface.removeColumn('inventories', 'reserved_quantity', { transaction });
      await queryInterface.removeColumn('inventories', 'available_quantity', { transaction });
      await queryInterface.removeColumn('inventories', 'qr_code_id', { transaction });
      await queryInterface.removeColumn('inventories', 'uuid', { transaction });

      await queryInterface.renameTable('inventories', 'stock_units', { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
