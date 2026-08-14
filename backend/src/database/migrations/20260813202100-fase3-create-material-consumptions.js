'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable('material_consumptions', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        uuid: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false,
          unique: true,
        },
        order_number: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          }
        },
        date: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        notes: {
          type: Sequelize.TEXT,
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
        }
      }, { transaction });

      await queryInterface.createTable('material_consumption_items', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        consumption_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'material_consumptions',
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        material_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'materials',
            key: 'id'
          }
        },
        lote_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'lotes',
            key: 'id'
          }
        },
        qr_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'qr_codes',
            key: 'id'
          }
        },
        quantity: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
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
        }
      }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable('material_consumption_items', { transaction });
      await queryInterface.dropTable('material_consumptions', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
