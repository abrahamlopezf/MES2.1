'use strict';

console.error(
  'Este script fue desactivado porque contenía credenciales fijas y reemplazaba usuarios existentes. ' +
    'Usa provision-demo-users.js con variables de entorno y secretos de GitHub Actions.'
);
process.exitCode = 1;
