'use strict';

module.exports = {

    async up(queryInterface) {

        await queryInterface.bulkInsert(
            'scrap_catalog',
            [
                {
                    code: 'SCRAP-CORTE',
                    name: 'Scrap de corte',
                    description: 'Material sobrante generado durante operaciones de corte',
                    unit: 'KG',
                    waste_reason: 'Sobrante de proceso',
                    category: 'PROCESO',
                    active: true,
                    created_at: new Date(),
                    updated_at: new Date()
                },

                {
                    code: 'SCRAP-RECHAZO',
                    name: 'Producto rechazado',
                    description: 'Producto que no cumple especificaciones de calidad',
                    unit: 'KG',
                    waste_reason: 'Defecto de calidad',
                    category: 'CALIDAD',
                    active: true,
                    created_at: new Date(),
                    updated_at: new Date()
                },

                {
                    code: 'SCRAP-MERMA',
                    name: 'Merma de producción',
                    description: 'Pérdida normal generada durante transformación',
                    unit: 'KG',
                    waste_reason: 'Merma operacional',
                    category: 'PRODUCCION',
                    active: true,
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ]
        );

    },


    async down(queryInterface) {

        await queryInterface.bulkDelete(
            'scrap_catalog',
            {
                code: [
                    'SCRAP-CORTE',
                    'SCRAP-RECHAZO',
                    'SCRAP-MERMA'
                ]
            }
        );

    }

};