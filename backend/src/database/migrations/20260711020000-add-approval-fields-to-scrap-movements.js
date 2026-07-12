'use strict';

module.exports = {

    async up(queryInterface, Sequelize) {

        const table = await queryInterface.describeTable(
            'scrap_movements'
        );


        if (!table.approved_by) {

            await queryInterface.addColumn(
                'scrap_movements',
                'approved_by',
                {
                    type: Sequelize.INTEGER,
                    allowNull: true
                }
            );

        }

    },


    async down(queryInterface) {

        const table = await queryInterface.describeTable(
            'scrap_movements'
        );


        if (table.approved_by) {

            await queryInterface.removeColumn(
                'scrap_movements',
                'approved_by'
            );

        }

    }

};