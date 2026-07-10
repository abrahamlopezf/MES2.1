'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('process_run_outputs', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false,
            },

            folio: {
                type: Sequelize.STRING(100),
                allowNull: false,
                unique: true,
            },

            process_run_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'process_runs',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },

            source_traceable_item_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'traceable_items',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },

            source_qr_code_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'qr_codes',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },

            intermediate_material_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'intermediate_materials',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
            },

            rack_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'storage_racks',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
            },

            intermediate_stock_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'intermediate_stocks',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },

            output_type: {
                type: Sequelize.STRING(40),
                allowNull: false,
                defaultValue: 'GOOD_OUTPUT',
            },

            quantity_primary: {
                type: Sequelize.DECIMAL(14, 3),
                allowNull: false,
            },

            primary_unit: {
                type: Sequelize.STRING(20),
                allowNull: false,
                defaultValue: 'CARRETE',
            },

            quantity_secondary: {
                type: Sequelize.DECIMAL(14, 3),
                allowNull: true,
            },

            secondary_unit: {
                type: Sequelize.STRING(20),
                allowNull: true,
                defaultValue: 'KG',
            },

            status: {
                type: Sequelize.STRING(30),
                allowNull: false,
                defaultValue: 'REGISTRADO',
            },

            produced_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },

            notes: {
                type: Sequelize.TEXT,
                allowNull: true,
            },

            metadata: {
                type: Sequelize.JSONB,
                allowNull: true,
            },

            created_by: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
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
            },
        });

        await queryInterface.addIndex('process_run_outputs', ['folio']);
        await queryInterface.addIndex('process_run_outputs', ['process_run_id']);
        await queryInterface.addIndex('process_run_outputs', ['intermediate_material_id']);
        await queryInterface.addIndex('process_run_outputs', ['rack_id']);
        await queryInterface.addIndex('process_run_outputs', ['intermediate_stock_id']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('process_run_outputs');
    },
};