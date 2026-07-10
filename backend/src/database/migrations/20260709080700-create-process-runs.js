'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('process_runs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      folio: {
        type: Sequelize.STRING(80),
        allowNull: false,
        unique: true,
      },

      process_area_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'areas',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      station_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      status: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'EN_PROCESO',
      },

      source_traceable_item_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'traceable_items',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      source_qr_code_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'qr_codes',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      started_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      started_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },

      finished_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      finished_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      notes: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex('process_runs', ['folio']);
    await queryInterface.addIndex('process_runs', ['process_area_id']);
    await queryInterface.addIndex('process_runs', ['status']);
    await queryInterface.addIndex('process_runs', ['source_traceable_item_id']);
    await queryInterface.addIndex('process_runs', ['source_qr_code_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('process_runs');
  },
};