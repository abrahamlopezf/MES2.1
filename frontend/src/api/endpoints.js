export const API_ENDPOINTS = {
  health: '/health',

  auth: {
    login: '/auth/login',
    me: '/auth/me',
    logout: '/auth/logout',
  },

  users: '/users',
  roles: '/roles',
  permissions: '/permissions',
  areas: '/areas',

  qr: {
    codes: '/qr/codes',
    batches: '/qr/batches',
    assign: '/qr/assign',
    validate: '/qr/validate',
    scan: '/qr/scan',
  },
};