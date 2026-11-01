'use strict';

// Catálogo de referencia de Telares Banda/Cintilla.
// No activa productos ni asigna consumos, gramajes lineales o costos no confirmados.
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        UPDATE production_boms
        SET is_provisional = TRUE, is_active = FALSE, updated_at = NOW()
        WHERE code IN (
          'BOM-TEL-3.0-TUB', 'BOM-TEL-5.0-TUB', 'BOM-TEL-5.0-PLA',
          'BOM-TEL-6.0-TUB', 'BOM-TEL-6.0-PLA', 'BOM-TEL-6.5-TUB',
          'BOM-TEL-6.5-PLA', 'BOM-TEL-7.2-TUB', 'BOM-TEL-7.2-PLA',
          'BOM-TEL-8.0-TUB'
        );

        DO $$
        DECLARE
          v_area_id INTEGER;
          v_band_subarea_id INTEGER;
        BEGIN
          SELECT id INTO v_area_id FROM areas WHERE code = 'TELARES' LIMIT 1;
          IF v_area_id IS NULL THEN RETURN; END IF;

          SELECT id INTO v_band_subarea_id
          FROM subareas
          WHERE area_id = v_area_id
            AND (UPPER(nomenclature) = 'TB' OR LOWER(name) LIKE '%banda%')
            AND deleted_at IS NULL
          ORDER BY id
          LIMIT 1;
          IF v_band_subarea_id IS NULL THEN RETURN; END IF;

          INSERT INTO production_boms (
            code, name, description, subarea_id, product_kind, output_product_name,
            output_color, output_width_value, output_width_unit, target_width_cm,
            target_weight_g_per_m, output_denier, tensile_strength_lb, units_per_pallet,
            packaging_type, output_weight_kg, expected_output_quantity, expected_output_unit,
            standard_output_meters, default_route, fabric_type, tape_color,
            weft_denier, warp_denier, cost_transformation_index, is_provisional,
            general_considerations, is_active, created_at, updated_at
          )
          VALUES
            (
              'BOM-BAN-2.0-4500', 'Banda 2 pulgadas · 4500 lb · rollo de 80 m',
              'Ficha de referencia del diagrama de Tejido de Banda. Los consumos, gramaje y costos requieren confirmación de Planta.',
              v_band_subarea_id, 'BANDA', 'Rollo de Banda 2 pulgadas', 'MULTICOLOR',
              2.00, 'PULGADA', 5.08, 0, 4600, 4500, 100,
              'Tarima con 100 rollos de 80 m', NULL, 1, 'ROLLO', 80,
              '["TELARES", "CORTE"]'::json, 'PLANA', 'N/A', '3000/4600 por confirmar', '4600',
              1.0000, TRUE, 'Borrador inactivo: consumo de PTI, gramaje lineal, mezcla de deniers y costo pendientes de confirmación.', FALSE, NOW(), NOW()
            ),
            (
              'BOM-BAN-3.0-4500', 'Banda 3 pulgadas blanca · 4500 lb · rollo de 80 m',
              'Ficha de referencia del diagrama de Tejido de Banda. Los consumos, gramaje y costos requieren confirmación de Planta.',
              v_band_subarea_id, 'BANDA', 'Rollo de Banda 3 pulgadas blanca', 'BLANCO',
              3.00, 'PULGADA', 7.62, 0, 4600, 4500, 100,
              'Tarima con 100 rollos de 80 m', NULL, 1, 'ROLLO', 80,
              '["TELARES", "CORTE"]'::json, 'PLANA', 'N/A', '3000/4600 por confirmar', '4600',
              1.0000, TRUE, 'Borrador inactivo: consumo de PTI, gramaje lineal, mezcla de deniers y costo pendientes de confirmación.', FALSE, NOW(), NOW()
            ),
            (
              'BOM-BAN-1.5-1700', 'Banda 1.5 pulgadas blanca/azul · 1700 lb · rollo de 80 m',
              'Ficha de referencia del diagrama de Tejido de Banda. Los consumos, gramaje y costos requieren confirmación de Planta.',
              v_band_subarea_id, 'BANDA', 'Rollo de Banda 1.5 pulgadas', 'BLANCO/AZUL',
              1.50, 'PULGADA', 3.81, 0, 3000, 1700, 150,
              'Tarima con 150 rollos de 80 m', NULL, 1, 'ROLLO', 80,
              '["TELARES", "CORTE"]'::json, 'PLANA', 'N/A', '3000 por confirmar', '3000',
              1.0000, TRUE, 'Borrador inactivo: consumo de PTI, gramaje lineal, variante de color y costo pendientes de confirmación.', FALSE, NOW(), NOW()
            ),
            (
              'BOM-CIN-13MM-3000', 'Cintilla 13 mm blanca/azul · caja aproximada de 120 kg',
              'Ficha de referencia del diagrama de Tejido de Banda. El peso de caja es aproximado; consumo y costo requieren confirmación de Planta.',
              v_band_subarea_id, 'CINTA', 'Caja de Cintilla 13 mm', 'BLANCO/AZUL',
              13.00, 'MM', 1.30, 0, 3000, 3000, 1,
              'Caja de aproximadamente 120 kg', NULL, 1, 'CAJA', NULL,
              '["TELARES", "CORTE"]'::json, 'PLANA', 'N/A', '3000 por confirmar', '3000',
              1.0000, TRUE, 'Borrador inactivo: peso exacto, consumo de PTI, longitud y costo pendientes de confirmación.', FALSE, NOW(), NOW()
            )
          ON CONFLICT (code) DO NOTHING;
        END $$;
      `, { transaction });
    });
  },

  // No elimina fichas, relaciones ni historial si esta migración ya se aplicó.
  down: async () => {},
};
