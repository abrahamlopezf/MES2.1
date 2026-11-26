'use strict';

// Legacy compatibility guard. The previous implementation could drop and restore
// sistema_enterprise_test; keep this entry point intentionally non-operational.
console.error(
  '[LOCAL_DB_SETUP_RETIRED] Este script ya no restaura ni modifica bases. ' +
  'Usa npm run db:backup:local para generar respaldos no destructivos.'
);
process.exitCode = 2;
