const db = require('../../database/models');

const getPermissions = async () => {
  const permissions = await db.Permission.findAll({
    order: [
      ['module', 'ASC'],
      ['code', 'ASC'],
    ],
  });

  return permissions.map((permission) => {
    const plainPermission = permission.get({ plain: true });

    return {
      id: plainPermission.id,
      name: plainPermission.name,
      code: plainPermission.code,
      module: plainPermission.module,
      description: plainPermission.description,
      created_at: plainPermission.created_at,
      updated_at: plainPermission.updated_at,
    };
  });
};

module.exports = {
  getPermissions,
};