'use strict';

console.error(
  '[SECURITY_BLOCK] La sincronización ad hoc de Master Data hacia servicios remotos está deshabilitada. ' +
  'Use únicamente migraciones/seeds locales autorizados; no se conecta a Neon.'
);
process.exitCode = 2;
