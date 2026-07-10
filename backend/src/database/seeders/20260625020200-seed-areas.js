'use strict';

module.exports = {
  async up(queryInterface) {
    const areas = [
      ['Almacén', 'ALMACEN', 'Área de recepción, control y salida de materia prima.'],
      ['Extrusión', 'EXTRUSION', 'Área de proceso de extrusión.'],
      ['Telares', 'TELARES', 'Área de telares.'],
      ['Laminado', 'LAMINADO', 'Área de laminado.'],
      ['Globo', 'GLOBO', 'Área de globo.'],
      ['Corte', 'CORTE', 'Área de corte.'],
      ['Confección', 'CONFECCION', 'Área de confección.'],
      ['Imprenta', 'IMPRENTA', 'Área de imprenta.'],
      ['Pegado', 'PEGADO', 'Área de pegado.'],
      ['Ensamblado', 'ENSAMBLADO', 'Área de ensamblado.'],
      ['Etiquetado', 'ETIQUETADO', 'Área de etiquetado.'],
      ['Doblado', 'DOBLADO', 'Área de doblado.'],
      ['Prensado', 'PRENSADO', 'Área de prensado.'],
      ['Embarque', 'EMBARQUE', 'Área de embarque.'],
      ['Finanzas', 'FINANZAS', 'Área financiera.'],
      ['Administración', 'ADMINISTRACION', 'Área administrativa.'],
    ];

    for (const [name, code, description] of areas) {
      await queryInterface.sequelize.query(
        `
        INSERT INTO areas (name, code, description, is_active, created_at, updated_at)
        VALUES (:name, :code, :description, true, NOW(), NOW())
        ON CONFLICT (code)
        DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          is_active = true,
          updated_at = NOW();
        `,
        {
          replacements: {
            name,
            code,
            description,
          },
        }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('areas', null, {});
  },
};