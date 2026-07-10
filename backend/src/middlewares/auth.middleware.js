const jwt = require('jsonwebtoken');

const db = require('../database/models');
const env = require('../config/env');
const { errorResponse } = require('../shared/responses/apiResponse');

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) return null;

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) return null;

  return token;
};

const authMiddleware = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return errorResponse(
        res,
        'Necesitas iniciar sesión para continuar.',
        [],
        401
      );
    }

    const decoded = jwt.verify(token, env.jwt.secret);

    const user = await db.User.findOne({
      where: {
        id: decoded.sub,
        is_active: true,
      },
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
          ],
        },
        {
          model: db.Area,
          as: 'area',
          required: false,
        },
      ],
    });

    if (!user) {
      return errorResponse(
        res,
        'La sesión no es válida o el usuario fue desactivado.',
        [],
        401
      );
    }

    const plainUser = user.get({ plain: true });

    req.user = {
      id: plainUser.id,
      username: plainUser.username,
      email: plainUser.email,
      role: plainUser.role,
      area: plainUser.area,
      permissions: plainUser.role?.permissions?.map((permission) => permission.code) || [],
    };

    return next();
  } catch (error) {
    return errorResponse(
      res,
      'Tu sesión expiró o no es válida. Inicia sesión nuevamente.',
      [],
      401
    );
  }
};

module.exports = authMiddleware;