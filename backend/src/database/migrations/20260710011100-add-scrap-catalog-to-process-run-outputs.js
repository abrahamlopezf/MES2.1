'use strict';

module.exports = {

    async up(queryInterface, Sequelize) {

        await queryInterface.addColumn(
            'process_run_outputs',
            'scrap_catalog_id',
            {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'scrap_catalog',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            }
        );

    },


    async down(queryInterface) {

        await queryInterface.removeColumn(
            'process_run_outputs',
            'scrap_catalog_id'
        );

    }

};