'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('scrap_types', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false,
            },

            code: {
                type: Sequelize.STRING(50),
                allowNull: false,
                unique: true,
            },

            name: {
                type: Sequelize.STRING(120),
                allowNull: false,
            },

            category: {
                type: Sequelize.ENUM(
                    'SCRAP',
                    'MERMA'
                ),
                allowNull: false,
            },

            recyclable: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },

            description: {
                type: Sequelize.TEXT,
                allowNull: true,
            },

            is_active: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },

            created_by: {
                type: Sequelize.INTEGER,
                allowNull: true,
            },

            updated_by: {
                type: Sequelize.INTEGER,
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
            },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('scrap_types');
    },
};