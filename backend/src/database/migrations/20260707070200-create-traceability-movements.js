'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('traceability_movements', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      traceable_item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'traceable_items',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      qr_code_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'qr_codes',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      movement_type: {
        type: Sequelize.ENUM(
          'RECEPCION_MP',
          'ASIGNACION_AREA',
          'TRANSFERENCIA_AREA',
          'RECEPCION_AREA',
          'CONSUMO_PROCESO',
          'GENERACION_INTERMEDIA',
          'GENERACION_MERMA',
          'AJUSTE_ENTRADA',
          'AJUSTE_SALIDA',
          'CANCELACION',
          'FINALIZACION'
        ),
        allowNull: false,
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
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      performed_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      performed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
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

    await queryInterface.addIndex('traceability_movements', ['traceable_item_id'], {
      name: 'traceability_movements_traceable_item_id_idx',
    });

    await queryInterface.addIndex('traceability_movements', ['qr_code_id'], {
      name: 'traceability_movements_qr_code_id_idx',
    });

    await queryInterface.addIndex('traceability_movements', ['movement_type'], {
      name: 'traceability_movements_movement_type_idx',
    });

    await queryInterface.addIndex('traceability_movements', ['performed_at'], {
      name: 'traceability_movements_performed_at_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('traceability_movements');

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_traceability_movements_movement_type";'
    );
  },
};