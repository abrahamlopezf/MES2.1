'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Catálogo de Especificaciones de Globo (globo_specifications)
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS globo_specifications (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        process_type VARCHAR(50) NOT NULL DEFAULT 'EXPANSION',
        target_width_cm DECIMAL(10,2) NOT NULL DEFAULT 60.00,
        target_grammage_g_per_m DECIMAL(10,2) NOT NULL DEFAULT 70.00,
        output_product_name VARCHAR(150) NOT NULL DEFAULT 'Rollo Globo Calibrado',
        expected_output_quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
        expected_output_unit VARCHAR(20) NOT NULL DEFAULT 'ROLLO',
        standard_output_meters DECIMAL(10,2) DEFAULT 1000.00,
        standard_waste_percentage DECIMAL(5,2) NOT NULL DEFAULT 1.50,
        cost_transformation_index DECIMAL(8,4) NOT NULL DEFAULT 1.0000,
        loom_roll_requirements JSONB NOT NULL DEFAULT '{"allowed_bom_ids":[], "min_width_cm": 45.0, "max_width_cm": 65.0, "fabric_type": "TUBULAR", "meters_per_output": 1000, "notes": ""}'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Materiales de Almacén Requeridos para Globo (globo_specification_materials)
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS globo_specification_materials (
        id SERIAL PRIMARY KEY,
        globo_spec_id INTEGER NOT NULL REFERENCES globo_specifications(id) ON UPDATE CASCADE ON DELETE CASCADE,
        material_id INTEGER NOT NULL REFERENCES materials(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        quantity DECIMAL(10,3) NOT NULL DEFAULT 0.000,
        unit VARCHAR(20) NOT NULL DEFAULT 'KG',
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Catálogo de Especificaciones de Laminado (laminado_specifications)
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS laminado_specifications (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        lamination_type VARCHAR(50) NOT NULL DEFAULT 'EXTRUSION_COATING',
        target_width_cm DECIMAL(10,2) NOT NULL DEFAULT 50.00,
        coating_grammage_g_per_m2 DECIMAL(10,2) NOT NULL DEFAULT 20.00,
        output_product_name VARCHAR(150) NOT NULL DEFAULT 'Rollo Laminado Terminado',
        expected_output_quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
        expected_output_unit VARCHAR(20) NOT NULL DEFAULT 'ROLLO',
        standard_output_meters DECIMAL(10,2) DEFAULT 1000.00,
        standard_waste_percentage DECIMAL(5,2) NOT NULL DEFAULT 2.00,
        cost_transformation_index DECIMAL(8,4) NOT NULL DEFAULT 1.0500,
        loom_roll_requirements JSONB NOT NULL DEFAULT '{"allowed_bom_ids":[], "accepts_from_globo": true, "min_width_cm": 40.0, "max_width_cm": 75.0, "fabric_type": "TUBULAR", "meters_per_output": 1000, "notes": ""}'::jsonb,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 4. Materiales de Almacén Requeridos para Laminado (laminado_specification_materials)
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS laminado_specification_materials (
        id SERIAL PRIMARY KEY,
        laminado_spec_id INTEGER NOT NULL REFERENCES laminado_specifications(id) ON UPDATE CASCADE ON DELETE CASCADE,
        material_id INTEGER NOT NULL REFERENCES materials(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        quantity DECIMAL(10,3) NOT NULL DEFAULT 0.000,
        unit VARCHAR(20) NOT NULL DEFAULT 'KG',
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 5. Roles de Globo, Laminado y Telares (compatible con índice parcial roles_code_unique_active)
    await queryInterface.sequelize.query(`
      DO $$
      DECLARE
        v_globo_area_id INTEGER;
        v_laminado_area_id INTEGER;
        v_telares_area_id INTEGER;
      BEGIN
        PERFORM setval(pg_get_serial_sequence('roles', 'id'), COALESCE((SELECT MAX(id) FROM roles), 1), (SELECT MAX(id) IS NOT NULL FROM roles));
        PERFORM setval(pg_get_serial_sequence('permissions', 'id'), COALESCE((SELECT MAX(id) FROM permissions), 1), (SELECT MAX(id) IS NOT NULL FROM permissions));
        PERFORM setval(pg_get_serial_sequence('role_permissions', 'id'), COALESCE((SELECT MAX(id) FROM role_permissions), 1), (SELECT MAX(id) IS NOT NULL FROM role_permissions));

        SELECT id INTO v_globo_area_id FROM areas WHERE code = 'GLOBO' LIMIT 1;
        SELECT id INTO v_laminado_area_id FROM areas WHERE code = 'LAMINADO' LIMIT 1;
        SELECT id INTO v_telares_area_id FROM areas WHERE code = 'TELARES' LIMIT 1;

        UPDATE roles r
        SET name = v.name,
            area_id = COALESCE(v.area_id, r.area_id),
            is_active = true,
            deleted_at = NULL,
            updated_at = NOW()
        FROM (VALUES
          ('Administrador de Globo', 'ADMIN_GLOBO', v_globo_area_id),
          ('Supervisor de Globo', 'SUPERVISOR_GLOBO', v_globo_area_id),
          ('Operador de Globo', 'OPERADOR_GLOBO', v_globo_area_id),
          ('Administrador de Laminado', 'ADMIN_LAMINADO', v_laminado_area_id),
          ('Supervisor de Laminado', 'SUPERVISOR_LAMINADO', v_laminado_area_id),
          ('Operador de Laminado', 'OPERADOR_LAMINADO', v_laminado_area_id),
          ('Administrador de Telares', 'ADMIN_TELARES', v_telares_area_id)
        ) AS v(name, code, area_id)
        WHERE r.code = v.code;

        INSERT INTO roles (name, code, area_id, is_active, created_at, updated_at)
        SELECT v.name, v.code, v.area_id, true, NOW(), NOW()
        FROM (VALUES
          ('Administrador de Globo', 'ADMIN_GLOBO', v_globo_area_id),
          ('Supervisor de Globo', 'SUPERVISOR_GLOBO', v_globo_area_id),
          ('Operador de Globo', 'OPERADOR_GLOBO', v_globo_area_id),
          ('Administrador de Laminado', 'ADMIN_LAMINADO', v_laminado_area_id),
          ('Supervisor de Laminado', 'SUPERVISOR_LAMINADO', v_laminado_area_id),
          ('Operador de Laminado', 'OPERADOR_LAMINADO', v_laminado_area_id),
          ('Administrador de Telares', 'ADMIN_TELARES', v_telares_area_id)
        ) AS v(name, code, area_id)
        WHERE NOT EXISTS (
          SELECT 1 FROM roles r WHERE r.code = v.code
        );
      END $$;
    `);

    // 6. Nuevos Permisos de Catálogos y WIP
    const permissions = [
      { code: 'globo.catalog.manage', name: 'Administrar Catálogo de Globo', module: 'Globo', description: 'Crear, modificar y desactivar especificaciones y fórmulas de Globo.' },
      { code: 'globo.wip.view', name: 'Ver WIP de Globo', module: 'Globo', description: 'Consultar el inventario de piso y rollos en custodia de Globo.' },
      { code: 'laminado.catalog.manage', name: 'Administrar Catálogo de Laminado', module: 'Laminado', description: 'Crear, modificar y desactivar especificaciones de recubrimiento de Laminado.' },
      { code: 'laminado.wip.view', name: 'Ver WIP de Laminado', module: 'Laminado', description: 'Consultar el inventario de piso, resinas y rollos en custodia de Laminado.' },
    ];

    for (const perm of permissions) {
      await queryInterface.sequelize.query(
        `INSERT INTO permissions (code, name, module, description, created_at, updated_at)
         VALUES (:code, :name, :module, :description, NOW(), NOW())
         ON CONFLICT (code) DO NOTHING;`,
        { replacements: perm }
      );
    }

    // Asignar permisos a roles de administración
    await queryInterface.sequelize.query(`
      INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
      SELECT r.id, p.id, NOW(), NOW()
      FROM roles r
      CROSS JOIN permissions p
      WHERE (r.code IN ('SUPERADMIN', 'ADMIN_GENERAL', 'ADMIN_GRAL')
             AND p.code IN ('globo.catalog.manage', 'globo.wip.view', 'laminado.catalog.manage', 'laminado.wip.view', 'globo.view', 'globo.process', 'laminado.view', 'laminado.process'))
         OR (r.code = 'ADMIN_GLOBO'
             AND p.code IN ('globo.catalog.manage', 'globo.wip.view', 'globo.view', 'globo.process'))
         OR (r.code = 'ADMIN_LAMINADO'
             AND p.code IN ('laminado.catalog.manage', 'laminado.wip.view', 'laminado.view', 'laminado.process'))
      ON CONFLICT DO NOTHING;
    `);

    // Asignar permisos de visualización a supervisores y operadores
    await queryInterface.sequelize.query(`
      INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
      SELECT r.id, p.id, NOW(), NOW()
      FROM roles r
      CROSS JOIN permissions p
      WHERE (r.code = 'SUPERVISOR_GLOBO' AND p.code IN ('globo.view', 'globo.wip.view', 'globo.process'))
         OR (r.code = 'OPERADOR_GLOBO' AND p.code IN ('globo.view', 'globo.process', 'globo.wip.view'))
         OR (r.code = 'SUPERVISOR_LAMINADO' AND p.code IN ('laminado.view', 'laminado.wip.view', 'laminado.process'))
         OR (r.code = 'OPERADOR_LAMINADO' AND p.code IN ('laminado.view', 'laminado.process', 'laminado.wip.view'))
      ON CONFLICT DO NOTHING;
    `);

    // Los catálogos y existencias WIP quedan vacíos hasta que la empresa registre sus recetas y movimientos reales.
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('laminado_specification_materials');
    await queryInterface.dropTable('laminado_specifications');
    await queryInterface.dropTable('globo_specification_materials');
    await queryInterface.dropTable('globo_specifications');
  }
};
