'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('qr_codes', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      qr_code: {
        type: Sequelize.STRING(120),
        allowNull: false,
        unique: true,
      },
      batch_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'qr_batches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      assigned_area_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'areas',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      current_area_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'areas',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      status: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: 'GENERADO',
      },
      entity_type: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },
      entity_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      assigned_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      assigned_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      used_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      used_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cancelled_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      cancelled_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      cancel_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.addIndex('qr_codes', ['qr_code'], {
      unique: true,
      name: 'idx_qr_codes_qr_code',
    });

    await queryInterface.addIndex('qr_codes', ['batch_id'], {
      name: 'idx_qr_codes_batch_id',
    });

    await queryInterface.addIndex('qr_codes', ['assigned_area_id'], {
      name: 'idx_qr_codes_assigned_area_id',
    });

    await queryInterface.addIndex('qr_codes', ['current_area_id'], {
      name: 'idx_qr_codes_current_area_id',
    });

    await queryInterface.addIndex('qr_codes', ['status'], {
      name: 'idx_qr_codes_status',
    });

    await queryInterface.addIndex('qr_codes', ['entity_type', 'entity_id'], {
      name: 'idx_qr_codes_entity',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('qr_codes');
  },
};