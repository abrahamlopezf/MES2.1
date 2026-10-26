'use strict';

module.exports = {
  up: async (queryInterface) => {
    // Only untouched examples inserted by the original module migration are deactivated.
    // A changed description or updated_at timestamp protects user-customized records.
    await queryInterface.sequelize.query(`
      UPDATE globo_specifications
      SET is_active = false,
          description = 'Plantilla de ejemplo no validada por cliente: ' || description,
          updated_at = NOW()
      WHERE (code, description) IN (
        ('GLO-EXP-60', 'Expansión de diámetro tubular para costal azucarero reforzado'),
        ('GLO-FUE-50', 'Proceso de formación de fuelle lateral para empaque harinero')
      )
        AND created_at = updated_at;

      UPDATE laminado_specifications
      SET is_active = false,
          description = 'Plantilla de ejemplo no validada por cliente: ' || description,
          updated_at = NOW()
      WHERE (code, description) IN (
        ('LAM-PEBD-20G', 'Recubrimiento por extrusión de polietileno baja densidad para saco harinero impermeable'),
        ('LAM-BOPP-60', 'Laminación con película biorientada para acabado fotográfico premium'),
        ('LAM-AGRO-72', 'Recubrimiento con aditivo protector UV de alta resistencia a la intemperie')
      )
        AND created_at = updated_at;
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      UPDATE globo_specifications
      SET is_active = true,
          description = regexp_replace(description, '^Plantilla de ejemplo no validada por cliente: ', ''),
          updated_at = NOW()
      WHERE description LIKE 'Plantilla de ejemplo no validada por cliente: %'
        AND code IN ('GLO-EXP-60', 'GLO-FUE-50');

      UPDATE laminado_specifications
      SET is_active = true,
          description = regexp_replace(description, '^Plantilla de ejemplo no validada por cliente: ', ''),
          updated_at = NOW()
      WHERE description LIKE 'Plantilla de ejemplo no validada por cliente: %'
        AND code IN ('LAM-PEBD-20G', 'LAM-BOPP-60', 'LAM-AGRO-72');
    `);
  },
};
