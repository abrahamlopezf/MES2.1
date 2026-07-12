'use strict';

module.exports = {

    async up(queryInterface) {

        await queryInterface.sequelize.query(`

            UPDATE storage_racks
            SET rack_type = 'GENERAL'
            WHERE rack_type IS NULL
               OR rack_type = '';

        `);

    },


    async down(queryInterface) {

        // No revertimos datos porque solamente normalizamos valores existentes

    }

};