'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const table = await queryInterface.describeTable('scrap_containers');

        if (!table.scrap_catalog_id) {
            await queryInterface.addColumn('scrap_containers', 'scrap_catalog_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'scrap_catalog',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            });
        }

        if (!table.rack_id) {
            await queryInterface.addColumn('scrap_containers', 'rack_id', {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: {
                    model: 'storage_racks',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            });
        }

        if (!table.current_quantity) {
            await queryInterface.addColumn('scrap_containers', 'current_quantity', {
                type: Sequelize.DECIMAL(12, 3),
                allowNull: false,
                defaultValue: 0.000
            });
        }
    },

    async down(queryInterface) {
        const table = await queryInterface.describeTable('scrap_containers');

        if (table.current_quantity) {
            await queryInterface.removeColumn('scrap_containers', 'current_quantity');
        }
        if (table.rack_id) {
            await queryInterface.removeColumn('scrap_containers', 'rack_id');
        }
        if (table.scrap_catalog_id) {
            await queryInterface.removeColumn('scrap_containers', 'scrap_catalog_id');
        }
    }
};
