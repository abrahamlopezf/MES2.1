'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('process_preparation_inputs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      preparation_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'process_preparations',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },

      formula_item_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'process_formula_items',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      source_traceable_item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'traceable_items',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      source_qr_code_id: {
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
        allowNull: false,
        references: {
          model: 'materials',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      quantity: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
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

    await queryInterface.addIndex('process_preparation_inputs', ['preparation_id']);
    await queryInterface.addIndex('process_preparation_inputs', ['source_traceable_item_id']);
    await queryInterface.addIndex('process_preparation_inputs', ['source_qr_code_id']);
    await queryInterface.addIndex('process_preparation_inputs', ['material_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('process_preparation_inputs');
  },
};