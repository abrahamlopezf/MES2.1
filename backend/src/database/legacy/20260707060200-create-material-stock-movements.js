'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('material_stock_movements', {
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
      material_lot_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'material_lots',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      movement_type: {
        type: Sequelize.ENUM(
          'ENTRADA',
          'AJUSTE_ENTRADA',
          'AJUSTE_SALIDA',
          'SALIDA_PROCESO',
          'CANCELACION'
        ),
        allowNull: false,
      },
      source: {
        type: Sequelize.ENUM(
          'INVENTARIO_INICIAL',
          'RECEPCION',
          'AJUSTE_MANUAL',
          'PROCESO',
          'SISTEMA'
        ),
        allowNull: false,
        defaultValue: 'RECEPCION',
      },
      quantity: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      balance_after: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
      },
      reference_folio: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      moved_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
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

    await queryInterface.addIndex('material_stock_movements', ['material_id'], {
      name: 'material_stock_movements_material_id_idx',
    });

    await queryInterface.addIndex('material_stock_movements', ['material_lot_id'], {
      name: 'material_stock_movements_material_lot_id_idx',
    });

    await queryInterface.addIndex('material_stock_movements', ['movement_type'], {
      name: 'material_stock_movements_movement_type_idx',
    });

    await queryInterface.addIndex('material_stock_movements', ['moved_at'], {
      name: 'material_stock_movements_moved_at_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('material_stock_movements');

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_material_stock_movements_movement_type";'
    );

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_material_stock_movements_source";'
    );
  },
};