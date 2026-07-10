'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('intermediate_materials', {
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
        type: Sequelize.STRING(180),
        allowNull: false,
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      production_area_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'areas',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      base_material_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'materials',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      material_family: {
        type: Sequelize.STRING(60),
        allowNull: false,
        defaultValue: 'HILO',
      },

      color: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },

      color_code: {
        type: Sequelize.STRING(40),
        allowNull: true,
      },

      caliber_value: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: true,
      },

      caliber_unit: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },

      thread_type: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },

      presentation: {
        type: Sequelize.STRING(80),
        allowNull: false,
        defaultValue: 'CARRETE',
      },

      primary_unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'CARRETE',
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

      min_stock_secondary: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: true,
      },

      max_stock_secondary: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: true,
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      metadata: {
        type: Sequelize.JSONB,
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

    await queryInterface.addIndex('intermediate_materials', ['code']);
    await queryInterface.addIndex('intermediate_materials', ['production_area_id']);
    await queryInterface.addIndex('intermediate_materials', ['base_material_id']);
    await queryInterface.addIndex('intermediate_materials', ['is_active']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('intermediate_materials');
  },
};