'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('stock_units', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      qr_code_uuid: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      qr_code_value: {
        type: Sequelize.STRING(100),
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
      quantity: {
        type: Sequelize.DECIMAL(12, 3),
        allowNull: false,
        defaultValue: 0,
      },
      unit_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'material_units',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      location: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      received_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'AVAILABLE',
      },
      notes: {
        type: Sequelize.TEXT,
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('stock_units');
  },
};
