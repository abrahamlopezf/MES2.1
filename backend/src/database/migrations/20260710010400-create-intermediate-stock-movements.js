'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('intermediate_stock_movements', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false,
            },

            intermediate_stock_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'intermediate_stocks',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
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

            movement_type: {
                type: Sequelize.STRING(50),
                allowNull: false,
            },

            quantity_primary: {
                type: Sequelize.DECIMAL(14, 3),
                allowNull: false,
            },

            primary_unit: {
                type: Sequelize.STRING(20),
                allowNull: false,
            },

            quantity_secondary: {
                type: Sequelize.DECIMAL(14, 3),
                allowNull: true,
            },

            secondary_unit: {
                type: Sequelize.STRING(20),
                allowNull: true,
            },

            balance_before_primary: {
                type: Sequelize.DECIMAL(14, 3),
                allowNull: false,
            },

            balance_after_primary: {
                type: Sequelize.DECIMAL(14, 3),
                allowNull: false,
            },

            balance_before_secondary: {
                type: Sequelize.DECIMAL(14, 3),
                allowNull: true,
            },

            balance_after_secondary: {
                type: Sequelize.DECIMAL(14, 3),
                allowNull: true,
            },

            reference_type: {
                type: Sequelize.STRING(50),
                allowNull: true,
            },

            reference_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
            },

            reference_folio: {
                type: Sequelize.STRING(100),
                allowNull: true,
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

        await queryInterface.addIndex('intermediate_stock_movements', ['intermediate_stock_id']);
        await queryInterface.addIndex('intermediate_stock_movements', ['intermediate_material_id']);
        await queryInterface.addIndex('intermediate_stock_movements', ['rack_id']);
        await queryInterface.addIndex('intermediate_stock_movements', ['movement_type']);
        await queryInterface.addIndex('intermediate_stock_movements', ['reference_type', 'reference_id']);
    },

    async down(queryInterface) {
        await queryInterface.dropTable('intermediate_stock_movements');
    },
};