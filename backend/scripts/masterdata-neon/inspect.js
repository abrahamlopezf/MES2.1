'use strict';

console.error(
  '[SECURITY_BLOCK] La inspección comparativa con Neon está deshabilitada. ' +
  'Esta intervención opera solo con PostgreSQL local DEV/QA.'
);
process.exitCode = 2;
