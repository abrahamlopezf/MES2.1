'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('process_run_inputs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      process_run_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'process_runs',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      traceable_item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'traceable_items',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      qr_code_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'qr_codes',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      material_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'materials',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      input_type: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: 'MAIN_INPUT',
      },

      quantity_planned: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
      },

      quantity_used: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: true,
      },

      unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },

      balance_before: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
      },

      balance_after: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
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

    await queryInterface.addIndex('process_run_inputs', ['process_run_id']);
    await queryInterface.addIndex('process_run_inputs', ['traceable_item_id']);
    await queryInterface.addIndex('process_run_inputs', ['qr_code_id']);
    await queryInterface.addIndex('process_run_inputs', ['material_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('process_run_inputs');
  },
};