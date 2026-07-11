'use strict';

module.exports = {

    async up(queryInterface, Sequelize) {

        await queryInterface.createTable('intermediate_stock_movements', {

            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },

            stock_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'intermediate_stock',
                    key: 'id'
                }
            },

            movement_type: {
                type: Sequelize.ENUM(

                    'ENTRADA',

                    'SALIDA',

                    'SCRAP',

                    'MERMA',

                    'AJUSTE'

                )
            },

            quantity_primary: {
                type: Sequelize.DECIMAL(12, 3)
            },

            quantity_secondary: {
                type: Sequelize.DECIMAL(12, 3)
            },

            balance_primary: {
                type: Sequelize.DECIMAL(12, 3)
            },

            balance_secondary: {
                type: Sequelize.DECIMAL(12, 3)
            },

            reference_type: {
                type: Sequelize.STRING(80)
            },

            reference_id: {
                type: Sequelize.INTEGER
            },

            performed_by: {
                type: Sequelize.INTEGER
            },

            metadata: {
                type: Sequelize.JSONB
            },

            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }

        });

    },

    async down(queryInterface) {

        await queryInterface.dropTable('intermediate_stock_movements');

    }

};