'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('traceability_links', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      parent_traceable_item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'traceable_items',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      child_traceable_item_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'traceable_items',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      parent_qr_code_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'qr_codes',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      child_qr_code_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'qr_codes',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      link_type: {
        type: Sequelize.ENUM(
          'DIVISION',
          'TRANSFERENCIA_PARCIAL',
          'TRANSFORMACION',
          'MERMA',
          'CONSOLIDACION',
          'EMBARQUE'
        ),
        allowNull: false,
      },
      quantity_used: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: 0,
      },
      quantity_generated: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: 0,
      },
      scrap_quantity: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: 0,
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      process_area_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'areas',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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

    await queryInterface.addIndex('traceability_links', ['parent_traceable_item_id'], {
      name: 'traceability_links_parent_traceable_item_id_idx',
    });

    await queryInterface.addIndex('traceability_links', ['child_traceable_item_id'], {
      name: 'traceability_links_child_traceable_item_id_idx',
    });

    await queryInterface.addIndex('traceability_links', ['parent_qr_code_id'], {
      name: 'traceability_links_parent_qr_code_id_idx',
    });

    await queryInterface.addIndex('traceability_links', ['child_qr_code_id'], {
      name: 'traceability_links_child_qr_code_id_idx',
    });

    await queryInterface.addIndex('traceability_links', ['link_type'], {
      name: 'traceability_links_link_type_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('traceability_links');

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_traceability_links_link_type";'
    );
  },
};