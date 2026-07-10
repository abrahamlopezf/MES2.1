'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('qr_batches', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      batch_code: {
        type: Sequelize.STRING(80),
        allowNull: false,
        unique: true,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
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
      status: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: 'CREATED',
      },
      notes: {
        type: Sequelize.TEXT,
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
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('qr_batches', ['batch_code'], {
      unique: true,
      name: 'idx_qr_batches_batch_code',
    });

    await queryInterface.addIndex('qr_batches', ['assigned_area_id'], {
      name: 'idx_qr_batches_assigned_area_id',
    });

    await queryInterface.addIndex('qr_batches', ['status'], {
      name: 'idx_qr_batches_status',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('qr_batches');
  },
};