'use strict';

module.exports = {

    async up(queryInterface, Sequelize) {

        await queryInterface.createTable('scrap_container_stock', {

            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },

            container_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'scrap_containers',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },

            quantity: {
                type: Sequelize.DECIMAL(12, 3),
                allowNull: false,
                defaultValue: 0
            },

            unit: {
                type: Sequelize.STRING(20),
                allowNull: false,
                defaultValue: 'KG'
            },

            last_movement_at: {
                type: Sequelize.DATE
            },

            metadata: {
                type: Sequelize.JSONB
            },

            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },

            updated_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }

        });

    }

    ,
    async down(queryInterface) {
        await queryInterface.dropTable('scrap_container_stock');
    }

};