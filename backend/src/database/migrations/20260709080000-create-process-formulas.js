'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('process_formulas', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      code: {
        type: Sequelize.STRING(80),
        allowNull: false,
        unique: true,
      },

      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      target_area_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'areas',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      // Lo dejamos nullable por ahora porque el catálogo de MI lo haremos después.
      target_intermediate_material_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },

      status: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'ACTIVA',
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.addIndex('process_formulas', ['code']);
    await queryInterface.addIndex('process_formulas', ['target_area_id']);
    await queryInterface.addIndex('process_formulas', ['status']);
    await queryInterface.addIndex('process_formulas', ['is_active']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('process_formulas');
  },
};