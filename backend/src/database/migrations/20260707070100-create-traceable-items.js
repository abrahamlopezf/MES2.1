'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('traceable_items', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      qr_code_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'qr_codes',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      item_type: {
        type: Sequelize.ENUM(
          'RAW_MATERIAL_LOT',
          'PROCESS_INPUT',
          'INTERMEDIATE_PRODUCT',
          'SCRAP',
          'FINISHED_PRODUCT',
          'SHIPMENT'
        ),
        allowNull: false,
      },
      material_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'materials',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      product_name: {
        type: Sequelize.STRING(180),
        allowNull: true,
      },
      origin_area_id: {
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
        allowNull: false,
        references: {
          model: 'areas',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      quantity_initial: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
      },
      quantity_current: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM(
          'DISPONIBLE',
          'EN_PROCESO',
          'TRANSFERIDO',
          'RECIBIDO',
          'CONSUMIDO',
          'FINALIZADO',
          'CANCELADO',
          'DANADO'
        ),
        allowNull: false,
        defaultValue: 'DISPONIBLE',
      },
      reference_folio: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      supplier_lot: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      supplier_reference: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      location: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
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

    await queryInterface.addIndex('traceable_items', ['qr_code_id'], {
      unique: true,
      name: 'traceable_items_qr_code_id_unique',
    });

    await queryInterface.addIndex('traceable_items', ['item_type'], {
      name: 'traceable_items_item_type_idx',
    });

    await queryInterface.addIndex('traceable_items', ['material_id'], {
      name: 'traceable_items_material_id_idx',
    });

    await queryInterface.addIndex('traceable_items', ['current_area_id'], {
      name: 'traceable_items_current_area_id_idx',
    });

    await queryInterface.addIndex('traceable_items', ['status'], {
      name: 'traceable_items_status_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('traceable_items');

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_traceable_items_item_type";'
    );

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_traceable_items_status";'
    );
  },
};