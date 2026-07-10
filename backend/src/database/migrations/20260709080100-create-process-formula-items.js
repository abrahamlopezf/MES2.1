'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('process_formula_items', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      formula_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'process_formulas',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
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

      material_role: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'BASE',
      },

      calculation_type: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'FIXED_QUANTITY',
      },

      quantity: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: true,
      },

      percentage: {
        type: Sequelize.DECIMAL(8, 4),
        allowNull: true,
      },

      unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },

      tolerance_min: {
        type: Sequelize.DECIMAL(8, 4),
        allowNull: true,
      },

      tolerance_max: {
        type: Sequelize.DECIMAL(8, 4),
        allowNull: true,
      },

      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },

      is_required: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.addIndex('process_formula_items', ['formula_id']);
    await queryInterface.addIndex('process_formula_items', ['material_id']);
    await queryInterface.addIndex('process_formula_items', ['material_role']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('process_formula_items');
  },
};