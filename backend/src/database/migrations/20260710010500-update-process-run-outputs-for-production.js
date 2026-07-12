'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable(
            'process_run_outputs'
        );

        if (!table.updated_by) {
            await queryInterface.addColumn(
                'process_run_outputs',
                'updated_by',
                {
                    type: Sequelize.INTEGER,
                    allowNull: true
                }
            );
        }
    },

    async down(queryInterface) {
        const table = await queryInterface.describeTable(
            'process_run_outputs'
        );

        if (table.updated_by) {
            await queryInterface.removeColumn(
                'process_run_outputs',
                'updated_by'
            );
        }
    }
};