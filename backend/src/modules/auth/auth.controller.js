const { successResponse, errorResponse } = require('../../shared/responses/apiResponse');
const authService = require('./auth.service');

const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);

    return successResponse(
      res,
      'Inicio de sesión correcto.',
      result,
      200
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || 'No pudimos iniciar sesión.',
      [],
      error.statusCode || 500
    );
  }
};

const me = async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);

    return successResponse(
      res,
      'Usuario autenticado correctamente.',
      user,
      200
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || 'No pudimos obtener la sesión.',
      [],
      error.statusCode || 500
    );
  }
};

const logout = (req, res) => {
  return successResponse(
    res,
    'Sesión cerrada correctamente.',
    {},
    200
  );
};

module.exports = {
  login,
  me,
  logout,
};