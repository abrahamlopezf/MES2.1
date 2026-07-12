'use strict';

module.exports = {
    async up(queryInterface) {
        await queryInterface.bulkInsert('scrap_types', [
            {
                code: 'SCRAP-LIMPIO',
                name: 'Scrap Limpio',
                category: 'SCRAP',
                recyclable: true,
                description:
                    'Material recuperable generado durante producción.',
                is_active: true,
                created_at: new Date(),
                updated_at: new Date(),
            },

            {
                code: 'SCRAP-CONTAMINADO',
                name: 'Scrap Contaminado',
                category: 'SCRAP',
                recyclable: false,
                description:
                    'Material contaminado que no puede reutilizarse.',
                is_active: true,
                created_at: new Date(),
                updated_at: new Date(),
            },

            {
                code: 'MERMA',
                name: 'Merma',
                category: 'MERMA',
                recyclable: false,
                description:
                    'Pérdida inherente al proceso.',
                is_active: true,
                created_at: new Date(),
                updated_at: new Date(),
            },
        ]);
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete('scrap_types', null, {});
    },
};