'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('storage_racks', {
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
        type: Sequelize.STRING(160),
        allowNull: false,
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

      rack_type: {
        type: Sequelize.STRING(60),
        allowNull: false,
        defaultValue: 'MI_BUFFER',
      },

      qr_code_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'qr_codes',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      location_description: {
        type: Sequelize.STRING(220),
        allowNull: true,
      },

      capacity_primary: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: true,
      },

      primary_unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'CARRETE',
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

    await queryInterface.addIndex('storage_racks', ['code']);
    await queryInterface.addIndex('storage_racks', ['area_id']);
    await queryInterface.addIndex('storage_racks', ['qr_code_id']);
    await queryInterface.addIndex('storage_racks', ['is_active']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('storage_racks');
  },
};