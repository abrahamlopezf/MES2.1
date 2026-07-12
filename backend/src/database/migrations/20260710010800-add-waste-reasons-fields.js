'use strict';

module.exports = {

    async up(queryInterface, Sequelize) {

        await queryInterface.addColumn(
            'scrap_catalog',
            'waste_reason',
            {
                type: Sequelize.STRING(150),
                allowNull: true
            }
        );


        await queryInterface.addColumn(
            'scrap_catalog',
            'category',
            {
                type: Sequelize.STRING(50),
                allowNull: true
            }
        );


    },


    async down(queryInterface) {

        await queryInterface.removeColumn(
            'scrap_catalog',
            'waste_reason'
        );


        await queryInterface.removeColumn(
            'scrap_catalog',
            'category'
        );

    }

};