const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

const db = require('../../database/models');
const env = require('../../config/env');

const buildUserPayload = (user) => {
  const plainUser = user.get({ plain: true });

  return {
    id: plainUser.id,
    first_name: plainUser.first_name,
    last_name: plainUser.last_name,
    email: plainUser.email,
    username: plainUser.username,
    numero_nomina: plainUser.numero_nomina,
    telefono: plainUser.telefono,
    avatar_url: plainUser.avatar_url || null,
    is_active: plainUser.is_active,
    must_change_password: plainUser.must_change_password,
    last_login_at: plainUser.last_login_at,
    role: plainUser.role
      ? {
          id: plainUser.role.id,
          name: plainUser.role.name,
          code: plainUser.role.code,
        }
      : null,
    area: plainUser.role?.area
      ? {
          id: plainUser.role.area.id,
          name: plainUser.role.area.name,
          code: plainUser.role.area.code,
        }
      : null,
    permissions: plainUser.role?.permissions
      ? plainUser.role.permissions.map((permission) => permission.code)
      : [],
  };
};

const generateToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      roleCode: user.role?.code,
      areaId: user.role?.area?.id || null,
    },
    env.jwt.secret,
    {
      expiresIn: env.jwt.expiresIn,
    }
  );
};

const findUserWithSecurityData = async (where, includePassword = false) => {
  const userModel = includePassword ? db.User.unscoped() : db.User;

  return userModel.findOne({
    where,
    include: [
      {
        model: db.Role,
        as: 'role',
        where: {
          is_active: true,
        },
        include: [
          {
            model: db.Permission,
            as: 'permissions',
            through: {
              attributes: [],
            },
          },
          {
            model: db.Area,
            as: 'area',
            required: false,
          },
        ],
      },
    ],
  });
};

const login = async ({ identifier, password }) => {
  const user = await findUserWithSecurityData(
    {
      [Op.or]: [
        { username: identifier },
        { numero_nomina: identifier },
      ],
    },
    true
  );

  if (!user) {
    const error = new Error('Usuario o contraseña incorrectos.');
    error.statusCode = 401;
    throw error;
  }

  if (!user.is_active) {
    const error = new Error('Este usuario está desactivado.');
    error.statusCode = 403;
    throw error;
  }

  if (!user.role || !user.role.is_active) {
    const error = new Error('El rol asignado no está disponible.');
    error.statusCode = 403;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    const error = new Error('Usuario o contraseña incorrectos.');
    error.statusCode = 401;
    throw error;
  }

  await user.update({
    last_login_at: new Date(),
  });

  const refreshedUser = await findUserWithSecurityData({ id: user.id }, false);

  const token = generateToken(refreshedUser);
  const userPayload = buildUserPayload(refreshedUser);

  return {
    token,
    user: userPayload,
  };
};

const checkPasswordChangeLimit = (user) => {
  const now = new Date();
  let count = user.password_change_count || 0;
  if (user.last_password_change_at) {
    const lastChange = new Date(user.last_password_change_at);
    if (lastChange.getMonth() === now.getMonth() && lastChange.getFullYear() === now.getFullYear()) {
      if (count >= 3) {
        const error = new Error('Has alcanzado el límite de 3 cambios de contraseña este mes.');
        error.statusCode = 429;
        throw error;
      }
      count += 1;
    } else {
      count = 1;
    }
  } else {
    count = 1;
  }
  return { count, now };
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await db.User.scope('withPassword').findByPk(userId);
  if (!user) {
    const error = new Error('Usuario no encontrado.');
    error.statusCode = 404;
    throw error;
  }

  if (currentPassword) {
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      const error = new Error('La contraseña actual es incorrecta.');
      error.statusCode = 401;
      throw error;
    }
  }

  const { count, now } = checkPasswordChangeLimit(user);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await user.update({
    password_hash: passwordHash,
    must_change_password: false,
    password_change_count: count,
    last_password_change_at: now,
  });

  return { message: 'Contraseña actualizada exitosamente.' };
};

const requestPasswordReset = async ({ identifier }) => {
  const user = await db.User.findOne({
    where: {
      [Op.or]: [
        { username: identifier },
        { email: identifier },
        { numero_nomina: identifier },
      ]
    }
  });

  if (!user) {
    const error = new Error('No pudimos encontrar una cuenta con esa información.');
    error.statusCode = 404;
    throw error;
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const resetCount = await db.PasswordReset.count({
    where: {
      user_id: user.id,
      created_at: { [Op.gte]: startOfMonth },
    }
  });

  if (resetCount >= 3) {
    const error = new Error('Has excedido el límite de 3 solicitudes de recuperación de contraseña este mes.');
    error.statusCode = 429;
    throw error;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  await db.PasswordReset.create({
    user_id: user.id,
    code,
    expires_at: expiresAt,
    used: false,
  });

  console.log(`\n\n========================================================`);
  console.log(`[SIMULACIÓN CORREO/SMS] Código de recuperación para ${user.first_name} ${user.last_name} (${user.email})`);
  console.log(`CÓDIGO: ${code}`);
  console.log(`========================================================\n\n`);

  return { message: 'Código de recuperación enviado. Revisa tu correo o teléfono (ver consola del servidor).' };
};

const resetPassword = async ({ identifier, code, newPassword }) => {
  const user = await db.User.findOne({
    where: {
      [Op.or]: [
        { username: identifier },
        { email: identifier },
        { numero_nomina: identifier },
      ]
    }
  });

  if (!user) {
    const error = new Error('No pudimos encontrar una cuenta con esa información.');
    error.statusCode = 404;
    throw error;
  }

  const resetRecord = await db.PasswordReset.findOne({
    where: {
      user_id: user.id,
      code,
      used: false,
      expires_at: { [Op.gt]: new Date() }
    }
  });

  if (!resetRecord) {
    const error = new Error('El código es inválido o ha expirado.');
    error.statusCode = 400;
    throw error;
  }

  const { count, now } = checkPasswordChangeLimit(user);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  
  await db.sequelize.transaction(async (t) => {
    await user.update({
      password_hash: passwordHash,
      must_change_password: false,
      password_change_count: count,
      last_password_change_at: now,
    }, { transaction: t });

    await resetRecord.update({
      used: true
    }, { transaction: t });
  });

  return { message: 'Contraseña restablecida exitosamente.' };
};

const getCurrentUser = async (userId) => {
  const user = await findUserWithSecurityData({ id: userId }, false);

  if (!user) {
    const error = new Error('La sesión ya no es válida.');
    error.statusCode = 401;
    throw error;
  }

  if (!user.is_active) {
    const error = new Error('Este usuario está desactivado.');
    error.statusCode = 403;
    throw error;
  }

  return buildUserPayload(user);
};

const updateProfile = async (userId, { email, telefono, first_name, last_name, avatar_url }) => {
  const user = await db.User.findByPk(userId);
  if (!user) {
    const error = new Error('Usuario no encontrado.');
    error.statusCode = 404;
    throw error;
  }

  if (email && email !== user.email) {
    const existing = await db.User.findOne({ where: { email } });
    if (existing) {
      const error = new Error('El correo ya está registrado.');
      error.statusCode = 400;
      throw error;
    }
  }

  await user.update({
    email:      email      ?? user.email,
    telefono:   telefono   ?? user.telefono,
    first_name: first_name ?? user.first_name,
    last_name:  last_name  ?? user.last_name,
    avatar_url: avatar_url !== undefined ? avatar_url : user.avatar_url,
  });

  return { message: 'Perfil actualizado exitosamente.' };
};

module.exports = {
  login,
  getCurrentUser,
  changePassword,
  requestPasswordReset,
  resetPassword,
  updateProfile,
};