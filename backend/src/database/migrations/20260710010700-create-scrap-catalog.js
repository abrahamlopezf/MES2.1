'use strict';

module.exports = {

    async up(queryInterface, Sequelize) {

        await queryInterface.createTable('scrap_catalog', {

            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },

            code: {
                type: Sequelize.STRING(50),
                allowNull: false,
                unique: true
            },

            name: {
                type: Sequelize.STRING(150),
                allowNull: false
            },

            description: {
                type: Sequelize.TEXT,
                allowNull: true
            },

            unit: {
                type: Sequelize.STRING(20),
                allowNull: false,
                defaultValue: 'KG'
            },

            active: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
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
            'scrap_catalog'
        );

    }

};