'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {

        await queryInterface.createTable('process_outputs', {

            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },

            process_run_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'process_runs',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
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

            rack_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'intermediate_racks',
                    key: 'id'
                }
            },

            production_lot: {
                type: Sequelize.STRING(80),
                allowNull: false
            },

            /*shift_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'shifts',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },*/

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

            scrap_weight: {
                type: Sequelize.DECIMAL(12, 3),
                defaultValue: 0
            },

            waste_weight: {
                type: Sequelize.DECIMAL(12, 3),
                defaultValue: 0
            },

            status: {
                type: Sequelize.ENUM(
                    'GENERADO',
                    'REGISTRADO'
                ),
                defaultValue: 'GENERADO'
            },

            notes: {
                type: Sequelize.TEXT
            },

            created_by: {
                type: Sequelize.INTEGER
            },

            updated_by: {
                type: Sequelize.INTEGER
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
        await queryInterface.dropTable('process_outputs');
    }

};