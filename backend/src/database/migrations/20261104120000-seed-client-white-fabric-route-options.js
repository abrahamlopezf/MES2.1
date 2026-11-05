'use strict';

const WHITE_FABRIC_ROUTE_OPTIONS = JSON.stringify([
  ['TELARES', 'CORTE'],
  ['TELARES', 'LAMINADO'],
  ['TELARES', 'LONAS'],
  ['TELARES', 'VENTA'],
]);
const BAND_ROUTE_OPTIONS = JSON.stringify([
  ['TELARES', 'CORTE'],
  ['TELARES', 'ALMACEN'],
  ['TELARES', 'VENTA'],
]);

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE production_boms
      SET allowed_routes = CAST(:routes AS jsonb),
          default_route = '["TELARES", "LAMINADO"]'::json,
          updated_at = NOW()
      WHERE product_kind = 'ROLLO_TELA'
        AND ounces_yd2 IN (5.0, 6.5, 7.2, 8.0)
        AND LOWER(CONCAT_WS(' ', output_color, name, output_product_name)) LIKE '%blanc%'
    `, { replacements: { routes: WHITE_FABRIC_ROUTE_OPTIONS } });

    // El PDF de Tejido de Banda confirma las mismas salidas para Banda/Cintilla;
    // la terminal traduce CORTE a corte de banda o corte de cinta según el PTI.
    await queryInterface.sequelize.query(`
      UPDATE production_boms
      SET allowed_routes = CAST(:routes AS jsonb),
          default_route = '["TELARES", "CORTE"]'::json,
          updated_at = NOW()
      WHERE code IN (
        'BOM-BAN-2.0-4500', 'BOM-BAN-3.0-4500',
        'BOM-BAN-1.5-1700', 'BOM-CIN-13MM-3000'
      )
        AND product_kind IN ('BANDA', 'CINTA')
    `, { replacements: { routes: BAND_ROUTE_OPTIONS } });
  },

  // Route configuration is intentionally retained if this migration is rolled back.
  async down() {},
};
