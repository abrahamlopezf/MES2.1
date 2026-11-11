'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS superadmin_permission_grants (
          role_id INTEGER NOT NULL,
          permission_id INTEGER NOT NULL,
          PRIMARY KEY (role_id, permission_id),
          FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
          FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
        );
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION traceflow_sync_superadmin_permissions(target_role_id INTEGER)
        RETURNS VOID AS $$
        BEGIN
          WITH inserted AS (
            INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
            SELECT target_role_id, p.id, NOW(), NOW()
            FROM permissions p
            ON CONFLICT DO NOTHING
            RETURNING role_id, permission_id
          )
          INSERT INTO superadmin_permission_grants (role_id, permission_id)
          SELECT role_id, permission_id FROM inserted
          ON CONFLICT DO NOTHING;
        END;
        $$ LANGUAGE plpgsql;

        CREATE OR REPLACE FUNCTION traceflow_grant_new_permission_to_superadmin()
        RETURNS TRIGGER AS $$
        DECLARE target_role_id INTEGER;
        BEGIN
          SELECT id INTO target_role_id FROM roles WHERE code = 'SUPERADMIN' LIMIT 1;
          IF target_role_id IS NOT NULL THEN
            PERFORM traceflow_sync_superadmin_permissions(target_role_id);
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE OR REPLACE FUNCTION traceflow_grant_existing_permissions_to_superadmin()
        RETURNS TRIGGER AS $$
        BEGIN
          IF NEW.code = 'SUPERADMIN' THEN
            PERFORM traceflow_sync_superadmin_permissions(NEW.id);
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trg_traceflow_superadmin_new_permission ON permissions;
        CREATE TRIGGER trg_traceflow_superadmin_new_permission
          AFTER INSERT ON permissions
          FOR EACH ROW EXECUTE FUNCTION traceflow_grant_new_permission_to_superadmin();

        DROP TRIGGER IF EXISTS trg_traceflow_superadmin_new_role ON roles;
        CREATE TRIGGER trg_traceflow_superadmin_new_role
          AFTER INSERT ON roles
          FOR EACH ROW EXECUTE FUNCTION traceflow_grant_existing_permissions_to_superadmin();
      `, { transaction });

      await queryInterface.sequelize.query(`
        SELECT traceflow_sync_superadmin_permissions(id)
        FROM roles
        WHERE code = 'SUPERADMIN';
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        DELETE FROM role_permissions rp
        USING superadmin_permission_grants grants
        WHERE rp.role_id = grants.role_id
          AND rp.permission_id = grants.permission_id;

        DROP TRIGGER IF EXISTS trg_traceflow_superadmin_new_permission ON permissions;
        DROP TRIGGER IF EXISTS trg_traceflow_superadmin_new_role ON roles;
        DROP FUNCTION IF EXISTS traceflow_grant_new_permission_to_superadmin();
        DROP FUNCTION IF EXISTS traceflow_grant_existing_permissions_to_superadmin();
        DROP FUNCTION IF EXISTS traceflow_sync_superadmin_permissions(INTEGER);
        DROP TABLE IF EXISTS superadmin_permission_grants;
      `, { transaction });
    });
  },
};
