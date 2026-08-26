'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const rolesTableInfo = await queryInterface.describeTable('roles');
    const usersTableInfo = await queryInterface.describeTable('users');
    const rolesIndexes = await queryInterface.showIndex('roles');
    await queryInterface.sequelize.transaction(async (transaction) => {
      const hasAreaId = !!usersTableInfo.area_id;

      if (hasAreaId) {
        // 1. Detectar roles compartidos (múltiples area_id o mezcla de NULL y NOT NULL)
        const [sharedRoles] = await queryInterface.sequelize.query(`
          SELECT role_id, COUNT(DISTINCT COALESCE(area_id::text, 'NULL')) as areas_count
          FROM users
          GROUP BY role_id
          HAVING COUNT(DISTINCT COALESCE(area_id::text, 'NULL')) > 1
        `, { transaction });

        if (sharedRoles && sharedRoles.length > 0) {
          console.error('CONFLICTING ROLES FOUND:', sharedRoles);
          throw new Error('Migration aborted: Found a single role assigned to users in different areas (or mixed with NULL). Cannot safely infer roles.area_id.');
        }
      }

      // 2. Add columns
      await queryInterface.addColumn('roles', 'area_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'areas', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      }, { transaction });

      await queryInterface.addColumn('roles', 'subarea_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('roles', 'level', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10,
      }, { transaction });

      // 3. Poblar roles.area_id asumiendo que ya descartamos inconsistencias
      if (hasAreaId) {
        await queryInterface.sequelize.query(`
          UPDATE roles
          SET area_id = u.area_id
          FROM (
            SELECT role_id, MAX(area_id) as area_id
            FROM users
            WHERE area_id IS NOT NULL
            GROUP BY role_id
          ) u
          WHERE roles.id = u.role_id
        `, { transaction });
      }

      // 4. Poblar roles.level (valores por default)
      await queryInterface.sequelize.query(`
        UPDATE roles SET level = 100 WHERE code = 'SUPERADMIN';
        UPDATE roles SET level = 90 WHERE code IN ('ADMIN', 'ADMIN_GENERAL');
        UPDATE roles SET level = 50 WHERE code LIKE 'ADMIN_%' AND code != 'ADMIN_GENERAL';
        UPDATE roles SET level = 20 WHERE code LIKE 'SUPERVISOR%';
      `, { transaction });

      // 5. Agregar el CHECK CONSTRAINT de integridad con SQL explícito
      await queryInterface.sequelize.query(`
        ALTER TABLE roles
        ADD CONSTRAINT roles_subarea_requires_area_chk
        CHECK (subarea_id IS NULL OR area_id IS NOT NULL);
      `, { transaction });

      // 6. Agregar FK Compuesta referenciando a subareas
      await queryInterface.addConstraint('roles', {
        fields: ['subarea_id', 'area_id'],
        type: 'foreign key',
        name: 'roles_subarea_area_fk',
        references: { table: 'subareas', fields: ['id', 'area_id'] },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        transaction
      });

      // 7. Modificar unique index por índice parcial con Soft Delete de forma robusta
      if (!rolesTableInfo.deleted_at) {
        await queryInterface.addColumn('roles', 'deleted_at', {
          type: Sequelize.DATE,
          allowNull: true,
        }, { transaction });
      }

      // Buscar constraint unique de 'code' en pg_constraint
      const [constraints] = await queryInterface.sequelize.query(`
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'roles'::regclass 
          AND contype = 'u' 
          AND pg_get_constraintdef(oid) LIKE '%(code)%'
      `, { transaction });

      for (const constraint of constraints) {
        await queryInterface.removeConstraint('roles', constraint.conname, { transaction });
      }

      const codeIndexes = rolesIndexes.filter(idx => 
        idx.unique && 
        idx.fields.length === 1 && 
        idx.fields[0].attribute === 'code'
      );
      
      for (const idx of codeIndexes) {
        try {
          await queryInterface.removeIndex('roles', idx.name, { transaction });
        } catch(e) {}
      }

      await queryInterface.addIndex('roles', ['code'], {
        unique: true,
        where: { deleted_at: null },
        name: 'roles_code_unique_active',
        transaction
      });
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex('roles', 'roles_code_unique_active', { transaction });
      
      // Intentar regresar a constraint única original
      await queryInterface.addConstraint('roles', {
        fields: ['code'],
        type: 'unique',
        name: 'roles_code_uk',
        transaction
      });

      await queryInterface.removeConstraint('roles', 'roles_subarea_area_fk', { transaction });
      await queryInterface.sequelize.query('ALTER TABLE roles DROP CONSTRAINT roles_subarea_requires_area_chk', { transaction });
      await queryInterface.removeColumn('roles', 'level', { transaction });
      await queryInterface.removeColumn('roles', 'subarea_id', { transaction });
      await queryInterface.removeColumn('roles', 'area_id', { transaction });
    });
  },
};
