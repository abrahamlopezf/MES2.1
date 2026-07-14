'use strict';

module.exports = {

    async up(queryInterface, Sequelize) {

        await queryInterface.createTable('scrap_causes', {

            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },

            code: {
                type: Sequelize.STRING(50),
                allowNull: false,
                unique: true
            },

            name: {
                type: Sequelize.STRING(120),
                allowNull: false
            },

            description: {
                type: Sequelize.TEXT
            },

            category: {
                type: Sequelize.ENUM(
                    'SCRAP',
                    'MERMA',
                    'REPROCESS'
                ),
                allowNull: false
            },

            active: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },

            created_by: {
                type: Sequelize.INTEGER
            },

            updated_by: {
                type: Sequelize.INTEGER
            },

            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },

            updated_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }

        });

    },

    async down(queryInterface) {

        await queryInterface.dropTable('scrap_causes');

        await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_scrap_causes_category";
    `);

    }

};