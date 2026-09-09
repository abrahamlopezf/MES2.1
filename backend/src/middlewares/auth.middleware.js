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
            {
              model: db.Area,
              as: 'area',
              required: false,
            },
            {
              model: db.Subarea,
              as: 'subarea',
              required: false,
            },
          ],
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

    if (decoded.session_token && user.session_token !== decoded.session_token) {
      return errorResponse(
        res,
        'Sesión finalizada. Has iniciado sesión en otro dispositivo.',
        [],
        401
      );
    }

    const plainUser = user.get({ plain: true });

    req.user = {
      id: plainUser.id,
      first_name: plainUser.first_name,
      last_name: plainUser.last_name,
      username: plainUser.username,
      email: plainUser.email,
      role: plainUser.role,
      area: plainUser.role?.area || null,
      subarea: plainUser.role?.subarea || null,
      permissions: plainUser.role?.permissions?.map((permission) => permission.code) || [],
    };

    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(
        res,
        'Por seguridad, tu sesión ha expirado después de 12 horas. Por favor, inicia sesión nuevamente.',
        [],
        401
      );
    }
    return errorResponse(
      res,
      'Tu sesión expiró o no es válida. Inicia sesión nuevamente.',
      [],
      401
    );
  }
};

module.exports = authMiddleware;