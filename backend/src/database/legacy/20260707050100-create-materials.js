'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('materials', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      material_category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'material_categories',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      code: {
        type: Sequelize.STRING(60),
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING(160),
        allowNull: false,
      },
      material_type: {
        type: Sequelize.ENUM(
          'MATERIA_PRIMA',
          'MATERIA_SECUNDARIA',
          'MATERIAL_GENERAL'
        ),
        allowNull: false,
      },
      default_unit: {
        type: Sequelize.ENUM(
          'KG',
          'PIEZA',
          'METRO',
          'LITRO',
          'ROLLO',
          'CAJA',
          'PAQUETE'
        ),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      technical_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      min_stock: {
        type: Sequelize.DECIMAL(12, 3),
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('materials', ['code'], {
      unique: true,
      name: 'idx_materials_code_unique',
    });

    await queryInterface.addIndex('materials', ['material_category_id'], {
      name: 'idx_materials_category_id',
    });

    await queryInterface.addIndex('materials', ['material_type'], {
      name: 'idx_materials_material_type',
    });

    await queryInterface.addIndex('materials', ['is_active'], {
      name: 'idx_materials_is_active',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('materials');

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_materials_material_type";'
    );

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_materials_default_unit";'
    );
  },
};