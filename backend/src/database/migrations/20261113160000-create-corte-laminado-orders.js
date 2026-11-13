'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS corte_laminado_orders (
          id SERIAL PRIMARY KEY,
          order_number VARCHAR(40) NOT NULL UNIQUE,
          status VARCHAR(24) NOT NULL DEFAULT 'REQUESTED',
          requested_by INTEGER NOT NULL REFERENCES users(id),
          requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS corte_laminado_order_items (
          id SERIAL PRIMARY KEY,
          order_id INTEGER NOT NULL REFERENCES corte_laminado_orders(id),
          roll_id INTEGER NOT NULL REFERENCES viajero_rolls(id),
          status VARCHAR(24) NOT NULL DEFAULT 'REQUESTED',
          picked_by INTEGER REFERENCES users(id),
          picked_at TIMESTAMPTZ,
          processed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT corte_laminado_order_items_order_roll_uk UNIQUE (order_id, roll_id)
        );
        CREATE INDEX IF NOT EXISTS corte_laminado_order_status_idx ON corte_laminado_orders(status, requested_at);
        CREATE INDEX IF NOT EXISTS corte_laminado_order_items_roll_status_idx ON corte_laminado_order_items(roll_id, status);
        CREATE UNIQUE INDEX IF NOT EXISTS corte_laminado_one_open_reservation_per_roll
          ON corte_laminado_order_items(roll_id)
          WHERE status IN ('REQUESTED', 'PICKED');
      `, { transaction });

      // Corte is the requester for Lamination's physical pickup; it is not a Telares decision.
      await queryInterface.sequelize.query(`
        DO $$ DECLARE v_area_id INTEGER; BEGIN
          INSERT INTO areas (name, code, description, is_active, created_at, updated_at)
          SELECT 'Corte', 'CORTE', 'Solicitud de rollos a Laminado y seguimiento de órdenes.', true, NOW(), NOW()
          WHERE NOT EXISTS (SELECT 1 FROM areas WHERE code = 'CORTE');
          SELECT id INTO v_area_id FROM areas WHERE code = 'CORTE' ORDER BY id LIMIT 1;
          UPDATE roles SET area_id = v_area_id, is_active = true, deleted_at = NULL,
            level = CASE WHEN code = 'ADMIN_CORTE' THEN 50 WHEN code = 'SUPERVISOR_CORTE' THEN 20 ELSE 10 END,
            updated_at = NOW()
            WHERE code IN ('ADMIN_CORTE', 'SUPERVISOR_CORTE', 'OPERADOR_CORTE');
          INSERT INTO roles (name, code, area_id, level, is_system, is_active, created_at, updated_at)
          SELECT v.name, v.code, v_area_id, v.level, true, true, NOW(), NOW()
          FROM (VALUES
            ('Administrador de Corte', 'ADMIN_CORTE', 50),
            ('Supervisor de Corte', 'SUPERVISOR_CORTE', 20),
            ('Operador de Corte', 'OPERADOR_CORTE', 10)
          ) AS v(name, code, level)
          WHERE NOT EXISTS (SELECT 1 FROM roles r WHERE r.code = v.code AND r.deleted_at IS NULL);
        END $$;
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS corte_laminado_one_open_reservation_per_roll;
        DROP TABLE IF EXISTS corte_laminado_order_items;
        DROP TABLE IF EXISTS corte_laminado_orders;
      `, { transaction });
    });
  },
};
