const { sequelize, Role, Permission } = require('./src/database/models');

async function run() {
  try {
    const role = await Role.findOne({ where: { code: 'ADMIN_ALM' } });
    if (!role) {
      console.log('Role ADMIN_ALM not found');
      process.exit(1);
    }
    
    // Ensure permission exists
    let permission = await Permission.findOne({ where: { code: 'materials.delete' } });
    if (!permission) {
      permission = await Permission.create({
        code: 'materials.delete',
        name: 'Eliminar Materiales',
        description: 'Permite eliminar/desactivar materiales',
        module: 'MasterData'
      });
      console.log('Created permission materials.delete');
    }
    
    // Check if relation exists
    const [existing] = await sequelize.query(`SELECT 1 FROM role_permissions WHERE role_id = ${role.id} AND permission_id = ${permission.id}`);
    if (existing.length === 0) {
      await sequelize.query(`INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at) VALUES (${role.id}, ${permission.id}, NOW(), NOW())`);
      console.log('Assigned materials.delete to ADMIN_ALM');
    } else {
      console.log('ADMIN_ALM already had materials.delete');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error assigning permission:', error);
    process.exit(1);
  }
}
run();
