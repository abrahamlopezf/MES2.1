'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Crear tabla silos
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS silos (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        capacity_kg DECIMAL(12,2) NOT NULL DEFAULT 40000.00,
        current_stock_kg DECIMAL(12,2) NOT NULL DEFAULT 25000.00,
        material_id INTEGER REFERENCES materials(id) ON UPDATE CASCADE ON DELETE SET NULL,
        current_lot_number VARCHAR(100) DEFAULT 'LOT-SILO-01',
        current_lot_type VARCHAR(10) DEFAULT 'A',
        unit_cost DECIMAL(10,4) NOT NULL DEFAULT 28.5000,
        location_id INTEGER REFERENCES material_locations(id) ON UPDATE CASCADE ON DELETE SET NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Crear tabla extruders (catálogo oficial de extrusoras con toggle modo_silo)
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS extruders (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        modo_silo BOOLEAN NOT NULL DEFAULT false,
        silo_id INTEGER REFERENCES silos(id) ON UPDATE CASCADE ON DELETE SET NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Crear tabla extrusoras_formulas (Matriz de compatibilidad receta-máquina)
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS extrusoras_formulas (
        id SERIAL PRIMARY KEY,
        extruder_id INTEGER NOT NULL REFERENCES extruders(id) ON UPDATE CASCADE ON DELETE CASCADE,
        formula_id INTEGER NOT NULL REFERENCES formulas(id) ON UPDATE CASCADE ON DELETE CASCADE,
        is_allowed BOOLEAN NOT NULL DEFAULT true,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_extruder_formula UNIQUE (extruder_id, formula_id)
      );
    `);

    // 4. Agregar columnas de soporte en extruder_queues y process_preparations
    await queryInterface.sequelize.query(`
      ALTER TABLE extruder_queues 
      ADD COLUMN IF NOT EXISTS is_silo_kit BOOLEAN NOT NULL DEFAULT false;

      ALTER TABLE process_preparations 
      ADD COLUMN IF NOT EXISTS is_silo_kit BOOLEAN NOT NULL DEFAULT false;
    `);

    // 5. Poblar Silos iniciales
    await queryInterface.sequelize.query(`
      INSERT INTO silos (id, code, name, capacity_kg, current_stock_kg, current_lot_number, current_lot_type, unit_cost, is_active, created_at, updated_at)
      VALUES
        (1, 'SILO-01', 'Silo Principal 1 (PP Resina A)', 40000.00, 28000.00, 'LOTE-SILO-PP-A-01', 'A', 28.5000, true, NOW(), NOW()),
        (2, 'SILO-02', 'Silo Auxiliar 2 (PP Resina A)', 40000.00, 22000.00, 'LOTE-SILO-PP-A-02', 'A', 28.5000, true, NOW(), NOW()),
        (3, 'SILO-03', 'Silo 3 (PP Resina B)', 35000.00, 18500.00, 'LOTE-SILO-PP-B-01', 'B', 26.0000, true, NOW(), NOW()),
        (4, 'SILO-04', 'Silo 4 (PP Resina C)', 30000.00, 12000.00, 'LOTE-SILO-PP-C-01', 'C', 24.5000, true, NOW(), NOW())
      ON CONFLICT (code) DO UPDATE SET
        capacity_kg = EXCLUDED.capacity_kg,
        current_stock_kg = EXCLUDED.current_stock_kg;

      SELECT setval('silos_id_seq', (SELECT MAX(id) FROM silos));
    `);

    // 6. Poblar Extrusoras iniciales (1, 2, 4, 5 y Liquitank)
    await queryInterface.sequelize.query(`
      INSERT INTO extruders (id, code, name, type, status, modo_silo, silo_id, is_active, created_at, updated_at)
      VALUES
        (1, 'EXT-01', 'Extrusora 1', 'CINTURON', 'ACTIVE', false, 1, true, NOW(), NOW()),
        (2, 'EXT-02', 'Extrusora 2', 'STANDARD', 'ACTIVE', false, 1, true, NOW(), NOW()),
        (4, 'EXT-04', 'Extrusora 4', 'STANDARD', 'ACTIVE', false, 1, true, NOW(), NOW()),
        (5, 'EXT-05', 'Extrusora 5', 'STANDARD', 'ACTIVE', false, 2, true, NOW(), NOW()),
        (6, 'EXT-LIQ', 'Extrusora Liquitank', 'LIQUITANK', 'ACTIVE', false, 1, true, NOW(), NOW())
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type;

      SELECT setval('extruders_id_seq', (SELECT MAX(id) FROM extruders));
    `);

    // 7. Configurar Matriz de Compatibilidad inicial (extrusoras_formulas) y actualizar formulas.allowed_extruders
    // Extrusora 1: Exclusivo Rafia para cinturón (F-EXT-01-FIXED y F-EXT-1-...)
    // Extrusora 2: Fórmulas permitidas
    // Extrusora 4: Fórmulas sin PP-B
    // Extrusora 5: Fórmulas dinámicas
    // Extrusora 6 (Liquitank): Fórmulas Liquitank

    // Actualizar JSONs en tabla formulas para coincidir con la matriz oficial del PDF
    await queryInterface.sequelize.query(`
      -- Extrusora 1: Rafia cinturón EXCLUSIVA
      UPDATE formulas SET allowed_extruders = '[1]'::json, restricted_extruders = '[2, 4, 5, 6]'::json
      WHERE code LIKE 'F-EXT-1-%' OR code = 'F-EXT-01-FIXED';

      -- Fórmulas Liquitank
      UPDATE formulas SET allowed_extruders = '[6]'::json, restricted_extruders = '[1, 2, 4, 5]'::json
      WHERE code LIKE 'F-EXT-LIQ-%';

      -- Mezcla Blanca Extrusora 2
      UPDATE formulas SET allowed_extruders = '[2]'::json, restricted_extruders = '[1, 4, 6]'::json
      WHERE code = 'F-EXT-2-BLANCA';

      -- Mezcla Blanca Extrusora 4 (Sin PP-B)
      UPDATE formulas SET allowed_extruders = '[4]'::json, restricted_extruders = '[1, 6]'::json
      WHERE code = 'F-EXT-4-BLANCA';

      -- Mezcla Blanca Extrusora 5
      UPDATE formulas SET allowed_extruders = '[5]'::json, restricted_extruders = '[1, 4, 6]'::json
      WHERE code = 'F-EXT-5-BLANCA';

      -- Colores estándar (Azul, Verde, Morado, Rojo, Natural): Autorizadas en 2, 4, 5
      UPDATE formulas SET allowed_extruders = '[2, 4, 5]'::json, restricted_extruders = '[1, 6]'::json
      WHERE code IN ('F-EXT-AZUL', 'F-EXT-VERDE', 'F-EXT-MORADO', 'F-EXT-ROJO', 'F-EXT-NATURAL', 'F-EXT-DIN-STD');

      -- Colores con PP-B (Negro, Verde Óptico): Prohibidas estrictamente en Extrusora 4
      UPDATE formulas SET allowed_extruders = '[2, 5]'::json, restricted_extruders = '[1, 4, 6]'::json
      WHERE code IN ('F-EXT-NEGRO', 'F-EXT-VERDE-OPT', 'F-EXT-DIN-PPB');

      -- Amarillo Antiestático (F-EXT-AMARILLO-ANTI): Autorizada en 2, 4, 5
      UPDATE formulas SET allowed_extruders = '[2, 4, 5]'::json, restricted_extruders = '[1, 6]'::json
      WHERE code = 'F-EXT-AMARILLO-ANTI';
    `);

    // Insertar relaciones en extrusoras_formulas
    await queryInterface.sequelize.query(`
      DELETE FROM extrusoras_formulas;

      -- 1. Extrusora 1: Rafia
      INSERT INTO extrusoras_formulas (extruder_id, formula_id, is_allowed, notes)
      SELECT 1, id, true, 'Exclusivo Rafia para Cinturón'
      FROM formulas WHERE code LIKE 'F-EXT-1-%' OR code = 'F-EXT-01-FIXED';

      -- 2. Extrusora 2: Permitidas
      INSERT INTO extrusoras_formulas (extruder_id, formula_id, is_allowed, notes)
      SELECT 2, id, true, 'Autorizada en Extrusora 2'
      FROM formulas WHERE code IN ('F-EXT-2-BLANCA', 'F-EXT-AZUL', 'F-EXT-VERDE', 'F-EXT-MORADO', 'F-EXT-ROJO', 'F-EXT-NEGRO', 'F-EXT-VERDE-OPT', 'F-EXT-AMARILLO-ANTI', 'F-EXT-NATURAL', 'F-EXT-DIN-STD');

      -- 4. Extrusora 4: Permitidas (Hard-block: CERO PP-B)
      INSERT INTO extrusoras_formulas (extruder_id, formula_id, is_allowed, notes)
      SELECT 4, id, true, 'Autorizada en Extrusora 4 (Sin PP-B)'
      FROM formulas WHERE code IN ('F-EXT-4-BLANCA', 'F-EXT-AZUL', 'F-EXT-VERDE', 'F-EXT-MORADO', 'F-EXT-ROJO', 'F-EXT-AMARILLO-ANTI', 'F-EXT-NATURAL', 'F-EXT-DIN-STD');

      -- 5. Extrusora 5: Permitidas
      INSERT INTO extrusoras_formulas (extruder_id, formula_id, is_allowed, notes)
      SELECT 5, id, true, 'Autorizada en Extrusora 5'
      FROM formulas WHERE code IN ('F-EXT-5-BLANCA', 'F-EXT-AZUL', 'F-EXT-VERDE', 'F-EXT-MORADO', 'F-EXT-ROJO', 'F-EXT-NEGRO', 'F-EXT-VERDE-OPT', 'F-EXT-AMARILLO-ANTI', 'F-EXT-NATURAL', 'F-EXT-DIN-STD');

      -- 6. Liquitank: Fórmulas Liquitank
      INSERT INTO extrusoras_formulas (extruder_id, formula_id, is_allowed, notes)
      SELECT 6, id, true, 'Fórmula exclusiva Liquitank'
      FROM formulas WHERE code LIKE 'F-EXT-LIQ-%';
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS extrusoras_formulas CASCADE;
      DROP TABLE IF EXISTS extruders CASCADE;
      DROP TABLE IF EXISTS silos CASCADE;

      ALTER TABLE extruder_queues DROP COLUMN IF EXISTS is_silo_kit;
      ALTER TABLE process_preparations DROP COLUMN IF EXISTS is_silo_kit;
    `);
  }
};
