'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('material_lots', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
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
      internal_folio: {
        type: Sequelize.STRING(60),
        allowNull: false,
        unique: true,
      },
      supplier_lot: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      supplier_reference: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      received_quantity: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
      },
      current_quantity: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('DISPONIBLE', 'CONSUMIDO', 'CANCELADO'),
        allowNull: false,
        defaultValue: 'DISPONIBLE',
      },
      received_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      location: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      qr_code: {
        type: Sequelize.STRING(180),
        allowNull: true,
        unique: true,
      },
      notes: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex('material_lots', ['material_id'], {
      name: 'material_lots_material_id_idx',
    });

    await queryInterface.addIndex('material_lots', ['internal_folio'], {
      unique: true,
      name: 'material_lots_internal_folio_unique',
    });

    await queryInterface.addIndex('material_lots', ['qr_code'], {
      unique: true,
      name: 'material_lots_qr_code_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('material_lots');

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_material_lots_status";'
    );
  },
};