'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('subareas', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        area_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'areas',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        nomenclature: {
          type: Sequelize.STRING(10),
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
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      }, { transaction });

      // Add unique constraint for (id, area_id) to allow composite FK from roles
      await queryInterface.addConstraint('subareas', {
        fields: ['id', 'area_id'],
        type: 'unique',
        name: 'subareas_id_area_id_uk',
        transaction
      });
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('subareas', { transaction });
    });
  },
};
