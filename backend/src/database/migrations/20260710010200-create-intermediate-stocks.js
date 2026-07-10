'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('intermediate_stocks', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      intermediate_material_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'intermediate_materials',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      area_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'areas',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      rack_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'storage_racks',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      quantity_primary: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: 0,
      },

      primary_unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'CARRETE',
      },

      quantity_secondary: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: true,
        defaultValue: 0,
      },

      secondary_unit: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: 'KG',
      },

      min_stock_primary: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: 0,
      },

      max_stock_primary: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: true,
      },

      status: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'OK',
      },

      last_movement_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
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

    await queryInterface.addIndex('intermediate_stocks', ['intermediate_material_id']);
    await queryInterface.addIndex('intermediate_stocks', ['area_id']);
    await queryInterface.addIndex('intermediate_stocks', ['rack_id']);

    await queryInterface.addConstraint('intermediate_stocks', {
      fields: ['intermediate_material_id', 'rack_id'],
      type: 'unique',
      name: 'unique_intermediate_material_rack_stock',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('intermediate_stocks');
  },
};