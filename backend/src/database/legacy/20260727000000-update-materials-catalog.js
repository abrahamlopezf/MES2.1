'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('material_subcategories', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
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
      name: {
        type: Sequelize.STRING(160),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
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
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.createTable('material_units', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      code: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // We must drop ENUM types if they are strict postgres ENUMs. However, Sequelize often uses VARCHAR for ENUM if not using pure Postgres ENUM.
    // To be safe, we just remove the columns and add new ones.
    await queryInterface.removeColumn('materials', 'material_type');
    await queryInterface.removeColumn('materials', 'default_unit');

    await queryInterface.addColumn('materials', 'subcategory_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Allow null temporarily to not break existing data
      references: {
        model: 'material_subcategories',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    await queryInterface.addColumn('materials', 'unit_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'material_units',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('materials', 'unit_id');
    await queryInterface.removeColumn('materials', 'subcategory_id');
    
    await queryInterface.addColumn('materials', 'default_unit', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    
    await queryInterface.addColumn('materials', 'material_type', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.dropTable('material_units');
    await queryInterface.dropTable('material_subcategories');
  },
};
