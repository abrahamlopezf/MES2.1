'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {

        await queryInterface.createTable('scrap_movements', {

            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },

            process_run_output_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'process_run_outputs',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },

            scrap_catalog_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'scrap_catalog',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT'
            },


            from_rack_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'storage_racks',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },


            to_rack_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'storage_racks',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },


            movement_type: {
                type: Sequelize.ENUM(
                    'TRANSFERENCIA',
                    'RECICLAJE',
                    'BAJA',
                    'REPROCESO'
                ),
                allowNull: false,
                defaultValue: 'TRANSFERENCIA'
            },


            quantity: {
                type: Sequelize.DECIMAL(12, 3),
                allowNull: false
            },


            unit: {
                type: Sequelize.STRING(20),
                allowNull: false,
                defaultValue: 'KG'
            },


            status: {
                type: Sequelize.ENUM(
                    'GENERADO',
                    'EN_REVISION',
                    'AUTORIZADO',
                    'TRANSFERIDO',
                    'CANCELADO'
                ),
                allowNull: false,
                defaultValue: 'GENERADO'
            },


            movement_date: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },


            notes: {
                type: Sequelize.TEXT,
                allowNull: true
            },


            created_by: {
                type: Sequelize.INTEGER,
                allowNull: true
            },


            approved_by: {
                type: Sequelize.INTEGER,
                allowNull: true
            },


            updated_by: {
                type: Sequelize.INTEGER,
                allowNull: true
            },


            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },


            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }

        });

    },


    async down(queryInterface) {

        await queryInterface.dropTable('scrap_movements');

        await queryInterface.sequelize.query(
            `DROP TYPE IF EXISTS "enum_scrap_movements_movement_type";`
        );

        await queryInterface.sequelize.query(
            `DROP TYPE IF EXISTS "enum_scrap_movements_status";`
        );

    }
};