'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('qr_events', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      qr_code_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'qr_codes',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      event_type: {
        type: Sequelize.STRING(60),
        allowNull: false,
      },
      from_status: {
        type: Sequelize.STRING(40),
        allowNull: true,
      },
      to_status: {
        type: Sequelize.STRING(40),
        allowNull: true,
      },
      from_area_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'areas',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      to_area_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'areas',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      performed_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('qr_events', ['qr_code_id'], {
      name: 'idx_qr_events_qr_code_id',
    });

    await queryInterface.addIndex('qr_events', ['event_type'], {
      name: 'idx_qr_events_event_type',
    });

    await queryInterface.addIndex('qr_events', ['performed_by'], {
      name: 'idx_qr_events_performed_by',
    });

    await queryInterface.addIndex('qr_events', ['created_at'], {
      name: 'idx_qr_events_created_at',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('qr_events');
  },
};