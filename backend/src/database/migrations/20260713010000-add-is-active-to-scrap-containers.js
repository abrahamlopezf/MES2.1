'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('scrap_containers');
        if (!table.is_active) {
            await queryInterface.addColumn(
                'scrap_containers',
                'is_active',
                {
                    type: Sequelize.BOOLEAN,
                    allowNull: false,
                    defaultValue: true
                }
            );
        }
    },

    async down(queryInterface) {
        const table = await queryInterface.describeTable('scrap_containers');
        if (table.is_active) {
            await queryInterface.removeColumn(
                'scrap_containers',
                'is_active'
            );
        }
    }
};