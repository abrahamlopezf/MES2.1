'use strict';

module.exports = {

    async up(queryInterface, Sequelize) {

        await queryInterface.createTable('process_output_items', {

            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },

            process_run_output_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'process_run_outputs',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },

            material_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'materials',
                    key: 'id'
                }
            },

            quantity: {
                type: Sequelize.DECIMAL(12, 3),
                allowNull: false,
                defaultValue: 0
            },

            unit: {
                type: Sequelize.STRING(20),
                allowNull: false
            },

            item_type: {
                type: Sequelize.STRING(30),
                allowNull: false,
                defaultValue: 'PRODUCTO'
            },

            notes: {
                type: Sequelize.TEXT,
                allowNull: true
            },

            created_at: {
                allowNull: false,
                type: Sequelize.DATE
            },

            updated_at: {
                allowNull: false,
                type: Sequelize.DATE
            }

        });

    },


    async down(queryInterface) {

        await queryInterface.dropTable(
            'process_output_items'
        );

    }

};