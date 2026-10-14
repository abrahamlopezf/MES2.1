'use strict';

/**
  * Migración para módulo de Extrusión:
  * - formulas
  * - formula_ingredients
  * - pti_racks
  * - extruder_queues
  * - extrusion_scrap_logs
  */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Tipos ENUM
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_pti_racks_status" AS ENUM ('VACIO', 'DISPONIBLE', 'LLENO');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE TYPE "enum_extruder_queues_status" AS ENUM ('EN_ESPERA', 'ACTIVA', 'PAUSADA', 'COMPLETADA', 'CANCELADA');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // 2. Tablas
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS formulas (
        id SERIAL PRIMARY KEY,
        code VARCHAR(80) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        batch_size_kg DECIMAL(10,2) NOT NULL DEFAULT 500.00,
        expected_yield_pieces DECIMAL(10,2) NOT NULL,
        expected_yield_kg DECIMAL(10,2) NOT NULL,
        allowed_extruders JSON DEFAULT '[1, 3, 4, 5]',
        restricted_extruders JSON DEFAULT '[]',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS formula_ingredients (
        id SERIAL PRIMARY KEY,
        formula_id INTEGER NOT NULL REFERENCES formulas(id) ON UPDATE CASCADE ON DELETE CASCADE,
        material_id INTEGER NOT NULL REFERENCES materials(id) ON UPDATE CASCADE,
        quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
        percentage DECIMAL(6,2) NOT NULL DEFAULT 0,
        unit VARCHAR(20) NOT NULL DEFAULT 'KG',
        is_restricted_on_machine_4 BOOLEAN NOT NULL DEFAULT false,
        restricted_machine_ids JSON DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS pti_racks (
        id SERIAL PRIMARY KEY,
        rack_code VARCHAR(50) NOT NULL UNIQUE,
        qr_code VARCHAR(120) NOT NULL UNIQUE,
        current_pti_type_id INTEGER REFERENCES materials(id) ON UPDATE CASCADE ON DELETE SET NULL,
        current_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
        min_capacity DECIMAL(10,2) NOT NULL DEFAULT 0,
        max_capacity DECIMAL(10,2) NOT NULL DEFAULT 100,
        status "enum_pti_racks_status" NOT NULL DEFAULT 'VACIO',
        location_name VARCHAR(100) DEFAULT 'Área de Racks PTI',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS extruder_queues (
        id SERIAL PRIMARY KEY,
        extruder_id INTEGER NOT NULL,
        consumption_order_qr_id VARCHAR(120) NOT NULL,
        consumption_order_id INTEGER REFERENCES consumption_orders(id) ON UPDATE CASCADE ON DELETE SET NULL,
        formula_id INTEGER REFERENCES formulas(id) ON UPDATE CASCADE ON DELETE SET NULL,
        priority INTEGER NOT NULL DEFAULT 1,
        status "enum_extruder_queues_status" NOT NULL DEFAULT 'EN_ESPERA',
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS extrusion_scrap_logs (
        id SERIAL PRIMARY KEY,
        extruder_id INTEGER NOT NULL,
        from_mixture_qr_id VARCHAR(120) NOT NULL,
        to_mixture_qr_id VARCHAR(120) NOT NULL,
        scrap_weight_kg DECIMAL(10,2) NOT NULL,
        reason VARCHAR(100) NOT NULL DEFAULT 'PURGA_TRANSICION',
        logged_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_extruder_queues_machine_status ON extruder_queues (extruder_id, status);
      CREATE INDEX IF NOT EXISTS idx_pti_racks_qr ON pti_racks (qr_code);
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS extrusion_scrap_logs CASCADE;
      DROP TABLE IF EXISTS extruder_queues CASCADE;
      DROP TABLE IF EXISTS pti_racks CASCADE;
      DROP TABLE IF EXISTS formula_ingredients CASCADE;
      DROP TABLE IF EXISTS formulas CASCADE;
      DROP TYPE IF EXISTS "enum_extruder_queues_status";
      DROP TYPE IF EXISTS "enum_pti_racks_status";
    `);
  }
};
