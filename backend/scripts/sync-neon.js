'use strict';

/**
 * Script deshabilitado por seguridad arquitectónica (Fase 1 / Fase 3).
 *
 * Motivo:
 * 1. Forzaba process.env.NODE_ENV = 'production' desde una estación local para conectarse a Neon Cloud.
 * 2. Ejecutaba db.sequelize.sync({ alter: true }) sobre una base de datos existente, lo cual está
 *    estrictamente prohibido por las directivas de integridad de esquema y Master Data.
 *
 * Utilice exclusivamente migraciones controladas mediante `npm run db:migrate`.
 */

throw new Error(
  '[SECURITY_GUARD] sync-neon.js está bloqueado permanentemente. Está prohibido ejecutar sequelize.sync({ alter: true }) o escalar NODE_ENV=production hacia bases remotas desde scripts locales.'
);
