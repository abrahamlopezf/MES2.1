'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('process_preparations', {
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

      formula_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'process_formulas',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      from_area_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'areas',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      to_area_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'areas',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      destination_qr_code_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'qr_codes',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      destination_traceable_item_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'traceable_items',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      target_intermediate_material_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      total_quantity: {
        type: Sequelize.DECIMAL(14, 3),
        allowNull: false,
      },

      unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },

      status: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'TRANSFERIDA',
      },

      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },

      prepared_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      prepared_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },

      received_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },

      received_at: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('process_preparations', ['formula_id']);
    await queryInterface.addIndex('process_preparations', ['from_area_id']);
    await queryInterface.addIndex('process_preparations', ['to_area_id']);
    await queryInterface.addIndex('process_preparations', ['destination_qr_code_id']);
    await queryInterface.addIndex('process_preparations', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('process_preparations');
  },
};