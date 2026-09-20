const { sequelize } = require('../src/config/database');

async function fix() {
  try {
    await sequelize.authenticate();
    console.log('Conectado a la base de datos');
    
    const [roles] = await sequelize.query(`SELECT id FROM roles WHERE code = 'ADMIN_ALM'`);
    const [perms] = await sequelize.query(`SELECT id FROM permissions WHERE code = 'inventory.receive'`);

    if (roles.length > 0 && perms.length > 0) {
      const adminAlmId = roles[0].id;
      const receivePermId = perms[0].id;
      
      await sequelize.query(`
        INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
        SELECT ${adminAlmId}, ${receivePermId}, NOW(), NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM role_permissions 
          WHERE role_id = ${adminAlmId} AND permission_id = ${receivePermId}
        )
      `);
      console.log('Permiso inventory.receive asignado exitosamente a ADMIN_ALM');
    } else {
      console.log('Role ADMIN_ALM o permiso inventory.receive no encontrado');
    }
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

fix();
