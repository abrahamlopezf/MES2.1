const { Op } = require('sequelize');

const { Role, Permission, User, sequelize } = require('../../database/models');
const {
  SUPERADMIN_ROLE_CODE,
  isSuperadmin,
  throwHttpError,
} = require('../../shared/security/accessRules');

const roleInclude = [
  {
    model: Permission,
    as: 'permissions',
    through: {
      attributes: [],
    },
  },
];

const buildRoleResponse = (role) => {
  if (!role) return null;

  const plainRole = role.get ? role.get({ plain: true }) : role;

  return {
    id: plainRole.id,
    name: plainRole.name,
    code: plainRole.code,
    description: plainRole.description,
    is_system: plainRole.is_system,
    is_active: plainRole.is_active,
    created_at: plainRole.created_at,
    updated_at: plainRole.updated_at,
    permissions:
      plainRole.permissions?.map((permission) => ({
        id: permission.id,
        name: permission.name,
        code: permission.code,
        module: permission.module,
        description: permission.description,
      })) || [],
  };
};

const getRoleWhereForActor = (currentUser) => {
  if (isSuperadmin(currentUser)) return {};

  return {
    code: {
      [Op.ne]: SUPERADMIN_ROLE_CODE,
    },
  };
};

const findVisibleRoleById = async (roleId, currentUser, transaction = null) => {
  return Role.findOne({
    where: {
      id: roleId,
      ...getRoleWhereForActor(currentUser),
    },
    include: roleInclude,
    transaction,
  });
};

const validateUniqueRoleCode = async (code, excludeRoleId = null, transaction = null) => {
  const where = {
    code,
  };

  if (excludeRoleId) {
    where.id = {
      [Op.ne]: excludeRoleId,
    };
  }

  const existingRole = await Role.findOne({
    where,
    transaction,
  });

  if (existingRole) {
    throwHttpError('El código del rol ya está registrado.', 400);
  }
};

const validatePermissionIds = async (permissionIds = [], transaction = null) => {
  if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
    throwHttpError('Debes seleccionar al menos un permiso.', 400);
  }

  const permissions = await Permission.findAll({
    where: {
      id: permissionIds,
    },
    transaction,
  });

  if (permissions.length !== permissionIds.length) {
    throwHttpError('Uno o más permisos seleccionados no existen.', 400);
  }

  return permissions;
};

const assertRoleCanBeDeactivated = async (role, transaction = null) => {
  if (role.is_system) {
    throwHttpError('Los roles base del sistema no se pueden desactivar.', 400);
  }

  const activeUsersWithRole = await User.count({
    where: {
      role_id: role.id,
      is_active: true,
    },
    transaction,
  });

  if (activeUsersWithRole > 0) {
    throwHttpError('No puedes desactivar un rol con usuarios activos asignados.', 400);
  }
};

const getRoles = async (currentUser) => {
  const roles = await Role.findAll({
    where: getRoleWhereForActor(currentUser),
    include: roleInclude,
    order: [['id', 'ASC']],
  });

  return roles.map(buildRoleResponse);
};

const getRoleById = async (roleId, currentUser) => {
  const role = await findVisibleRoleById(roleId, currentUser);

  if (!role) {
    throwHttpError('Rol no encontrado.', 404);
  }

  return buildRoleResponse(role);
};

const createRole = async (payload, currentUser) => {
  if (!isSuperadmin(currentUser)) {
    throwHttpError('No tienes permisos para administrar roles.', 403);
  }

  return sequelize.transaction(async (transaction) => {
    const normalizedCode = payload.code.trim().toUpperCase();

    if (normalizedCode === SUPERADMIN_ROLE_CODE) {
      throwHttpError('No se puede crear otro rol Superadmin.', 400);
    }

    await validateUniqueRoleCode(normalizedCode, null, transaction);

    const permissions = await validatePermissionIds(payload.permission_ids, transaction);

    const role = await Role.create(
      {
        name: payload.name,
        code: normalizedCode,
        description: payload.description || null,
        is_system: false,
        is_active: payload.is_active ?? true,
      },
      {
        transaction,
      }
    );

    await role.setPermissions(permissions, {
      transaction,
    });

    const createdRole = await findVisibleRoleById(role.id, currentUser, transaction);

    return buildRoleResponse(createdRole);
  });
};

const updateRole = async (roleId, payload, currentUser) => {
  if (!isSuperadmin(currentUser)) {
    throwHttpError('No tienes permisos para administrar roles.', 403);
  }

  return sequelize.transaction(async (transaction) => {
    const role = await findVisibleRoleById(roleId, currentUser, transaction);

    if (!role) {
      throwHttpError('Rol no encontrado.', 404);
    }

    if (role.code === SUPERADMIN_ROLE_CODE) {
      throwHttpError('El rol Superadmin no se puede modificar desde este módulo.', 400);
    }

    const updateData = {
      name: payload.name ?? role.name,
      description: payload.description ?? role.description,
      is_active: payload.is_active ?? role.is_active,
    };

    await role.update(updateData, {
      transaction,
    });

    if (payload.permission_ids) {
      const permissions = await validatePermissionIds(payload.permission_ids, transaction);

      await role.setPermissions(permissions, {
        transaction,
      });
    }

    const updatedRole = await findVisibleRoleById(role.id, currentUser, transaction);

    return buildRoleResponse(updatedRole);
  });
};

const deleteRole = async (roleId, currentUser) => {
  if (!isSuperadmin(currentUser)) {
    throwHttpError('No tienes permisos para administrar roles.', 403);
  }

  return sequelize.transaction(async (transaction) => {
    const role = await findVisibleRoleById(roleId, currentUser, transaction);

    if (!role) {
      throwHttpError('Rol no encontrado.', 404);
    }

    if (role.code === SUPERADMIN_ROLE_CODE) {
      throwHttpError('El rol Superadmin no se puede desactivar.', 400);
    }

    await assertRoleCanBeDeactivated(role, transaction);

    await role.update(
      {
        is_active: false,
      },
      {
        transaction,
      }
    );

    const updatedRole = await findVisibleRoleById(role.id, currentUser, transaction);

    return buildRoleResponse(updatedRole);
  });
};

module.exports = {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
};