'use strict';

module.exports = {

    async up(queryInterface, Sequelize) {

        await queryInterface.createTable('process_output_items', {

            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },

            process_output_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'process_outputs',
                    key: 'id'
                },
                onDelete: 'CASCADE'
            },

            intermediate_material_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'intermediate_materials',
                    key: 'id'
                }
            },

            produced_units: {
                type: Sequelize.DECIMAL(12, 3),
                allowNull: false
            },

            produced_weight: {
                type: Sequelize.DECIMAL(12, 3),
                allowNull: false
            },

            unit_weight: {
                type: Sequelize.DECIMAL(12, 3),
                allowNull: false
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

    },

    async down(queryInterface) {

        await queryInterface.dropTable('process_output_items');

    }

};