'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS tipos_baja (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          description VARCHAR(255),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        SELECT setval(
          pg_get_serial_sequence('tipos_baja', 'id'),
          COALESCE((SELECT MAX(id) FROM tipos_baja), 1),
          (SELECT COUNT(*) > 0 FROM tipos_baja)
        );

        INSERT INTO tipos_baja (name, description, is_active, created_at, updated_at)
        VALUES
          ('Material dañado', 'Daño físico al material', TRUE, NOW(), NOW()),
          ('Merma', 'Pérdida en proceso', TRUE, NOW(), NOW()),
          ('Caducidad', 'Material expirado', TRUE, NOW(), NOW()),
          ('Contaminación', 'Material contaminado', TRUE, NOW(), NOW()),
          ('Error de recepción', 'Ajuste por error al recibir', TRUE, NOW(), NOW()),
          ('Otro', 'Motivo no clasificado', TRUE, NOW(), NOW()),
          ('Devolución', 'Devolución a proveedor o salida por rechazo tras ingreso', TRUE, NOW(), NOW())
        ON CONFLICT (name) DO UPDATE
          SET is_active = TRUE,
              description = COALESCE(tipos_baja.description, EXCLUDED.description);

        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_waste_requests_status') THEN
            CREATE TYPE enum_waste_requests_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
          END IF;
        END $$;

        CREATE TABLE IF NOT EXISTS waste_requests (
          id SERIAL PRIMARY KEY,
          material_id INTEGER NOT NULL REFERENCES materials(id) ON UPDATE CASCADE ON DELETE CASCADE,
          lote_ids JSON NOT NULL,
          tipo_baja_id INTEGER NOT NULL REFERENCES tipos_baja(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          notes TEXT,
          status enum_waste_requests_status NOT NULL DEFAULT 'PENDING',
          requested_by INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
          resolved_by INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
          resolved_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        SELECT setval(
          pg_get_serial_sequence('waste_requests', 'id'),
          COALESCE((SELECT MAX(id) FROM waste_requests), 1),
          (SELECT COUNT(*) > 0 FROM waste_requests)
        );
      `, { transaction });
    });
  },

  async down() {
    // Retain operational catalog and requests on rollback.
  },
};

