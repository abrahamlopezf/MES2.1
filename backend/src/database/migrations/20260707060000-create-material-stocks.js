'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('material_stocks', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      material_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'materials',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      current_quantity: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: 0,
      },
      reserved_quantity: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: 0,
      },
      available_quantity: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: 0,
      },
      default_unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      last_movement_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('material_stocks', ['material_id'], {
      unique: true,
      name: 'material_stocks_material_id_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('material_stocks');
  },
};