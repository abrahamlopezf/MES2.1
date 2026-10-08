'use strict';

/**
 * Crea `consumption_orders` y `consumption_order_items` de forma idempotente.
 * En local existían por sync(); en producción (Neon) nunca se crearon.
 */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_consumption_orders_status" AS ENUM ('PENDIENTE', 'PREPARANDO', 'SURTIDA', 'CANCELADA');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS consumption_orders (
        id SERIAL PRIMARY KEY,
        uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        order_number VARCHAR(50) NOT NULL UNIQUE,
        status "enum_consumption_orders_status" NOT NULL DEFAULT 'PENDIENTE',
        requested_by INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE,
        requesting_area_id INTEGER REFERENCES areas(id) ON UPDATE CASCADE ON DELETE SET NULL,
        resolved_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
        qr_code_id INTEGER REFERENCES qr_codes(id) ON UPDATE CASCADE ON DELETE SET NULL,
        notes TEXT,
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS consumption_order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES consumption_orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
        material_id INTEGER NOT NULL REFERENCES materials(id) ON UPDATE CASCADE,
        lote_id INTEGER REFERENCES lotes(id) ON UPDATE CASCADE ON DELETE SET NULL,
        requested_quantity DECIMAL(10,2) NOT NULL,
        fulfilled_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
        unit_id INTEGER REFERENCES material_units(id) ON UPDATE CASCADE ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS consumption_order_items_order_id ON consumption_order_items (order_id);`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS consumption_orders_status ON consumption_orders (status);`);
  },

  down: async () => {
    // No-op intencional: no se eliminan órdenes de consumo en rollback.
  }
};
