const bcrypt = require('bcrypt');
const { sequelize } = require('../src/config/database');

async function createAdminExtrusion() {
  try {
    console.log('--- 1. Ensuring role ADMIN_EXT exists ---');
    let [roles] = await sequelize.query(`SELECT id, name, code, area_id FROM roles WHERE code = 'ADMIN_EXT'`);
    let roleId;
    if (roles.length > 0) {
      roleId = roles[0].id;
      console.log('Role ADMIN_EXT already exists with id:', roleId);
    } else {
      const [insertResult] = await sequelize.query(`
        INSERT INTO roles (name, code, description, area_id, is_active, created_at, updated_at)
        VALUES ('Administrador de Extrusión', 'ADMIN_EXT', 'Administrador del área de Extrusión con control de producción, fórmulas y usuarios del área.', 2, true, NOW(), NOW())
        RETURNING id
      `);
      roleId = insertResult[0].id;
      console.log('Created role ADMIN_EXT with id:', roleId);
    }

    console.log('--- 2. Assigning permissions to ADMIN_EXT ---');
    const targetPermCodes = [
      'dashboard.read',
      'charts.read',
      'reports.read',
      'reports.export',
      'areas.read',
      'operations.area.read',
      'operations.area.write',
      'materials.read',
      'inventory.view',
      'warehouse.orders.create',
      'users.read',
      'users.create',
      'users.update',
      'qr.read',
      'qr.generate',
      'qr.assign',
      'qr.cancel',
      'qr.events.read',
      'qr.create',
      'qr.history.read',
      'formulas.read',
      'formulas.manage',
      'scrap.view',
      'scrap.create',
      'scrap.transfer',
      'scrap.recycle',
      'scrap.manage',
      'extrusion.view',
      'extrusion.formulas.view',
      'extrusion.formulas.manage',
      'extrusion.orders.view',
      'extrusion.orders.create',
      'extrusion.wip.view',
      'extrusion.wip.manage',
      'extrusion.runs.manage'
    ];

    const [allPerms] = await sequelize.query(`SELECT id, code FROM permissions WHERE code IN (${targetPermCodes.map(c => `'${c}'`).join(',')})`);
    console.log(`Found ${allPerms.length} permissions matching target list.`);

    for (const perm of allPerms) {
      const [exists] = await sequelize.query(`SELECT 1 FROM role_permissions WHERE role_id = ${roleId} AND permission_id = ${perm.id}`);
      if (exists.length === 0) {
        await sequelize.query(`INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at) VALUES (${roleId}, ${perm.id}, NOW(), NOW())`);
      }
    }
    console.log('Permissions assigned to ADMIN_EXT.');

    console.log('--- 3. Creating or updating user admin_extrusion ---');
    const hash = await bcrypt.hash('Admin123!', 10);
    const [existingUsers] = await sequelize.query(`SELECT id, username FROM users WHERE username = 'admin_extrusion'`);
    if (existingUsers.length > 0) {
      const userId = existingUsers[0].id;
      await sequelize.query(`
        UPDATE users
        SET password_hash = '${hash}',
            role_id = ${roleId},
            is_active = true,
            must_change_password = false,
            first_name = 'Administrador',
            last_name = 'Extrusión',
            email = 'admin.extrusion@sistema.com',
            numero_nomina = 'ADM-EXT-001',
            updated_at = NOW()
        WHERE id = ${userId}
      `);
      console.log('Updated user admin_extrusion (id:', userId, ')');
    } else {
      const [insertUser] = await sequelize.query(`
        INSERT INTO users (
          first_name, last_name, email, username, password_hash, role_id, is_active,
          must_change_password, numero_nomina, created_at, updated_at
        ) VALUES (
          'Administrador', 'Extrusión', 'admin.extrusion@sistema.com', 'admin_extrusion',
          '${hash}', ${roleId}, true, false, 'ADM-EXT-001', NOW(), NOW()
        )
        RETURNING id
      `);
      console.log('Created user admin_extrusion with id:', insertUser[0].id);
    }

    console.log('--- 4. Verification ---');
    const [userCheck] = await sequelize.query(`
      SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.numero_nomina, u.is_active, r.name as role_name, r.code as role_code, r.area_id
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.username = 'admin_extrusion'
    `);
    console.log('Verified user:', userCheck[0]);

    process.exit(0);
  } catch (err) {
    console.error('Error creating admin_extrusion:', err);
    process.exit(1);
  }
}

createAdminExtrusion();
