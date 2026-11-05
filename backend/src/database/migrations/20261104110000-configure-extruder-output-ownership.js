'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const [legacyQueues] = await queryInterface.sequelize.query(`
        SELECT q.id, q.status FROM extruder_queues q
        JOIN extruders e ON e.id = q.extruder_id
        WHERE e.code = 'EXT-LIQ' AND q.status IN ('ACTIVA', 'EN_ESPERA', 'PAUSADA')
        LIMIT 5;
      `, { transaction });
      if (legacyQueues.length) {
        throw new Error('La migración detectó mezclas activas/en espera en la extrusora ficticia Liquitank. Reasigna o termina esas mezclas antes de retirar esa máquina del catálogo.');
      }
      await queryInterface.sequelize.query(`
        ALTER TABLE extruders
          ADD COLUMN IF NOT EXISTS machine_number INTEGER,
          ADD COLUMN IF NOT EXISTS telares_subarea_code VARCHAR(30);
        ALTER TABLE pti_products
          ADD COLUMN IF NOT EXISTS extrusion_machine_id INTEGER,
          ADD COLUMN IF NOT EXISTS telares_subarea_code VARCHAR(30);

        CREATE TABLE IF NOT EXISTS _20261104110000_extruder_output_backup (
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          row_data JSONB NOT NULL,
          PRIMARY KEY (table_name, record_id)
        );
        INSERT INTO _20261104110000_extruder_output_backup (table_name, record_id, row_data)
          SELECT 'extruders', id::TEXT, to_jsonb(e) FROM extruders e
          WHERE code IN ('EXT-01', 'EXT-02', 'EXT-04', 'EXT-05', 'EXT-LIQ')
          ON CONFLICT DO NOTHING;
        INSERT INTO _20261104110000_extruder_output_backup (table_name, record_id, row_data)
          SELECT 'pti_products', id::TEXT, to_jsonb(p) FROM pti_products p
          WHERE extrusion_machine_number IN (1, 2, 4, 5)
          ON CONFLICT DO NOTHING;
        INSERT INTO _20261104110000_extruder_output_backup (table_name, record_id, row_data)
          SELECT 'formulas', id::TEXT, to_jsonb(f) FROM formulas f WHERE code LIKE 'F-EXT-LIQ-%'
          ON CONFLICT DO NOTHING;
        INSERT INTO _20261104110000_extruder_output_backup (table_name, record_id, row_data)
          SELECT 'extrusoras_formulas', ef.id::TEXT, to_jsonb(ef)
          FROM extrusoras_formulas ef
          JOIN extruders e ON e.id = ef.extruder_id
          JOIN formulas f ON f.id = ef.formula_id
          WHERE e.code IN ('EXT-01', 'EXT-LIQ') AND f.code LIKE 'F-EXT-LIQ-%'
          ON CONFLICT DO NOTHING;

        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pti_products_extrusion_machine_id_fkey') THEN
            ALTER TABLE pti_products ADD CONSTRAINT pti_products_extrusion_machine_id_fkey
              FOREIGN KEY (extrusion_machine_id) REFERENCES extruders(id) ON UPDATE CASCADE ON DELETE SET NULL;
          END IF;
        END $$;

        CREATE UNIQUE INDEX IF NOT EXISTS uq_extruders_machine_number
          ON extruders(machine_number) WHERE machine_number IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_pti_products_extrusion_machine_id
          ON pti_products(extrusion_machine_id);

        -- Liquitank es una referencia de cliente, no una máquina física.
        -- Se conserva el registro histórico, pero se retira del catálogo operativo.
        UPDATE extruders
        SET machine_number = CASE code WHEN 'EXT-01' THEN 1 WHEN 'EXT-02' THEN 2 WHEN 'EXT-04' THEN 4 WHEN 'EXT-05' THEN 5 ELSE NULL END,
            telares_subarea_code = CASE code WHEN 'EXT-01' THEN 'TELARES_BANDA' WHEN 'EXT-02' THEN 'TELARES_ROLLO' WHEN 'EXT-04' THEN 'TELARES_ROLLO' WHEN 'EXT-05' THEN 'TELARES_ROLLO' ELSE 'NO_APLICA' END,
            is_active = CASE WHEN code = 'EXT-LIQ' THEN FALSE ELSE is_active END,
            status = CASE WHEN code = 'EXT-LIQ' THEN 'MAINTENANCE' ELSE status END,
            is_dynamic_member = CASE WHEN code = 'EXT-LIQ' THEN FALSE ELSE is_dynamic_member END,
            updated_at = NOW()
        WHERE code IN ('EXT-01', 'EXT-02', 'EXT-04', 'EXT-05', 'EXT-LIQ');

        -- Mantiene la configuración de cliente Liquitank en la máquina 1 indicada
        -- por planta, sin convertir “Liquitank” en una máquina ni alterar fórmulas.
        UPDATE formulas
        SET allowed_extruders = '[1]'::json,
            restricted_extruders = '[2,4,5]'::json,
            extruder_assignment_mode = 'EXTRUDER_1',
            updated_at = NOW()
        WHERE code LIKE 'F-EXT-LIQ-%';

        UPDATE extrusoras_formulas ef
        SET is_allowed = FALSE, updated_at = NOW()
        FROM extruders e, formulas f
        WHERE ef.extruder_id = e.id AND ef.formula_id = f.id
          AND e.code = 'EXT-LIQ' AND f.code LIKE 'F-EXT-LIQ-%';
        INSERT INTO extrusoras_formulas (extruder_id, formula_id, is_allowed, notes, created_at, updated_at)
        SELECT target.id, f.id, TRUE, 'Fórmula de cliente Liquitank preparada en Extrusora 1', NOW(), NOW()
        FROM extruders target CROSS JOIN formulas f
        WHERE target.code = 'EXT-01' AND f.code LIKE 'F-EXT-LIQ-%'
        ON CONFLICT (extruder_id, formula_id) DO UPDATE SET is_allowed = TRUE,
          notes = EXCLUDED.notes, updated_at = NOW();

        UPDATE pti_products p
        SET extrusion_machine_id = e.id,
            telares_subarea_code = e.telares_subarea_code,
            updated_at = NOW()
        FROM extruders e
        WHERE p.extrusion_machine_number = e.machine_number AND e.is_active = TRUE;
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        UPDATE extruders e SET
          machine_number = NULLIF(b.row_data->>'machine_number', '')::INTEGER,
          telares_subarea_code = b.row_data->>'telares_subarea_code',
          is_active = (b.row_data->>'is_active')::BOOLEAN,
          status = b.row_data->>'status',
          is_dynamic_member = (b.row_data->>'is_dynamic_member')::BOOLEAN
        FROM _20261104110000_extruder_output_backup b
        WHERE b.table_name = 'extruders' AND e.id::TEXT = b.record_id;
        UPDATE pti_products p SET
          extrusion_machine_id = NULLIF(b.row_data->>'extrusion_machine_id', '')::INTEGER,
          telares_subarea_code = b.row_data->>'telares_subarea_code'
        FROM _20261104110000_extruder_output_backup b
        WHERE b.table_name = 'pti_products' AND p.id::TEXT = b.record_id;
        UPDATE formulas f SET
          allowed_extruders = (b.row_data->'allowed_extruders')::JSON,
          restricted_extruders = (b.row_data->'restricted_extruders')::JSON,
          extruder_assignment_mode = b.row_data->>'extruder_assignment_mode',
          updated_at = NOW()
        FROM _20261104110000_extruder_output_backup b
        WHERE b.table_name = 'formulas' AND f.id::TEXT = b.record_id;
        DELETE FROM extrusoras_formulas ef USING extruders e, formulas f
        WHERE ef.extruder_id = e.id AND ef.formula_id = f.id
          AND e.code IN ('EXT-01', 'EXT-LIQ') AND f.code LIKE 'F-EXT-LIQ-%';
        INSERT INTO extrusoras_formulas (id, extruder_id, formula_id, is_allowed, notes, created_at, updated_at)
        SELECT (b.row_data->>'id')::INTEGER, (b.row_data->>'extruder_id')::INTEGER,
          (b.row_data->>'formula_id')::INTEGER, (b.row_data->>'is_allowed')::BOOLEAN,
          b.row_data->>'notes', (b.row_data->>'created_at')::TIMESTAMPTZ, (b.row_data->>'updated_at')::TIMESTAMPTZ
        FROM _20261104110000_extruder_output_backup b
        WHERE b.table_name = 'extrusoras_formulas'
        ON CONFLICT (id) DO UPDATE SET is_allowed = EXCLUDED.is_allowed, notes = EXCLUDED.notes,
          extruder_id = EXCLUDED.extruder_id, formula_id = EXCLUDED.formula_id, updated_at = EXCLUDED.updated_at;
        ALTER TABLE pti_products DROP CONSTRAINT IF EXISTS pti_products_extrusion_machine_id_fkey;
        DROP INDEX IF EXISTS idx_pti_products_extrusion_machine_id;
        DROP INDEX IF EXISTS uq_extruders_machine_number;
        ALTER TABLE pti_products DROP COLUMN IF EXISTS extrusion_machine_id, DROP COLUMN IF EXISTS telares_subarea_code;
        ALTER TABLE extruders DROP COLUMN IF EXISTS machine_number, DROP COLUMN IF EXISTS telares_subarea_code;
        DROP TABLE IF EXISTS _20261104110000_extruder_output_backup;
      `, { transaction });
    });
  },
};
