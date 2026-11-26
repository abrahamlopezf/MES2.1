# PostgreSQL local: aislamiento y mínimo privilegio

**Fecha:** 26 de noviembre de 2026 (CDMX)  
**Alcance:** solo PostgreSQL local `127.0.0.1:5432`; sin Neon, servicios remotos, migraciones ni cambios de filas.  
**Estado:** controles de runtime aplicados y comprobados; recuperación de credenciales administrativas y varias fases de auditoría siguen pendientes.

## Cambios aplicados

- El runtime DEV se conecta como `traceflow_app_local` únicamente a `sistema_enterprise`.
- El runtime QA se conecta como `traceflow_app_test` únicamente a `sistema_enterprise_test`.
- Sequelize CLI selecciona `traceflow_dev_migrator` o `traceflow_qa_migrator` por `APP_ENV`; el servidor de aplicación nunca carga `.env.migrator.local`.
- `traceflow_migrator` quedó sin LOGIN. Los cuatro roles de aplicación/migración tienen `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`, `NOBYPASSRLS`.
- `PUBLIC` ya no tiene `CONNECT`, `TEMPORARY`, `USAGE` del esquema `public` ni `EXECUTE` sobre funciones propias de TraceFlow en DEV/QA. Las bases otorgan `CONNECT` explícito a los roles de su ambiente.
- El runtime no puede crear bases, tablas temporales ni objetos en el esquema. Los migradores sí pueden ejecutar DDL dentro de su base, pero no pueden crear bases ni acceder a la otra base.
- DEV conserva DML de desarrollo. QA tiene `SELECT` sobre tablas y DML sobre las tablas operativas; las 30 tablas clasificadas como Master Data/configuración no conceden `INSERT`, `UPDATE` o `DELETE` al runtime QA. Permanecen los triggers QA preexistentes para evitar `DELETE`/`TRUNCATE`.
- Se añadieron guardas de credenciales explícitas: sin fallback de aplicación a `postgres`, contraseñas vacías rechazadas y comprobación post-conexión de base, host y usuario autenticado.
- El perfil QA resuelve `DB_TEST_NAME`, `DB_TEST_USER` y `DB_TEST_PASSWORD`, sin reutilizar las credenciales DEV.
- `npm run db:backup:local` ahora solo crea archivos `pg_dump` locales y comprueba que `pg_restore --list` pueda leerlos. El antiguo `setup-local-db-isolation.js` es un punto de entrada inerte y no puede borrar/restaurar bases.

## Evidencia ejecutada

| Comprobación | Resultado |
|---|---|
| Huella Master Data antes de ACL | DEV=QA, 30 tablas, 2,928 filas, SHA-256 `36db9b70c666b2753d70b9fa87522f5cbf1309b8d9162dac3889b9a4693ee241` |
| Huella tras ACL con cada rol de aplicación | DEV=QA, mismo total y SHA-256 |
| `npm run db:verify:privileges` | 20 comprobaciones aprobadas: identidad, privilegios del rol, denegación cruzada, Master Data, operación de usuarios, DDL temporal reversible del migrador |
| `npm run dev:check` (después de la integración QA) | 8/8 comprobaciones aprobadas; DEV con 163 migraciones, QA con 164; 2,928 filas de Master Data conservan la huella SHA-256 |
| `npm run db:verify:privileges` (repetido) | 20/20 aprobadas; ambas cuentas runtime solo acceden a su base, QA bloquea escrituras maestras y los migradores se mantienen aislados |
| `npm run db:verify:local` | Aprobado con `traceflow_app_local`; 641 materiales activos consultados |
| `sequelize-cli db:migrate:status --env development` y `--env test` | Conectaron como sus migradores respectivos y leyeron el historial. DEV mantiene una migración `down`; no se ejecutó. |
| Respaldos previos a cambios de ACL | Archivos Custom generados y `pg_restore --list` legible: DEV 2,288,723 bytes; QA 2,369,620 bytes. Solo se guardan en `backend/tmp/db-role-baseline-20261126/`. |
| `npm run db:backup:local` posterior | Aprobado: dos archivos Custom y manifiesto con SHA-256/entradas, bajo `backend/tmp/db-backups/`. El comando no restaura. |
| `npm run security:check` (final) | 0 hallazgos en 1,229 archivos; sin secretos detectados en el árbol de trabajo actual. |
| `node --test test/envIsolationGuard.test.js` | 10/10 aprobadas, incluye credenciales faltantes, URLs remotas ficticias y usuario efectivo distinto. |
| Integración local QA | 5 aprobadas, 0 fallidas, 1 omitida: EXT-04 ya tiene una mezcla operativa activa; el escenario omitido no interviene esa máquina. |
| Vitest frontend | 31/31 aprobadas en 11 archivos. |
| Build Vite | Aprobado; 1,863 módulos, bundle JS principal 3.708 MB sin comprimir / 971 KB gzip; advertencia de chunk mayor a 500 KB. Tiempo observado: 44.93 s y 1m38s en dos builds fríos. No quedó congelado; el paso lento es la transformación inicial. |
| ESLint frontend | 112 errores y 11 advertencias tras corregir cuatro errores mecánicos de equivalencia. Persisten 18 reglas de Hooks condicionales; no se modificaron flujos de negocio para silenciarlas. |
| Backend unitario | 93/96 aprobadas. Las 3 fallidas son discrepancias de ruta Telares → Globo y siguen pendientes de la lista de rollos que autoriza Producción. |
| Caracterización de turno | El cierre DEV del 22/11/2026 registra 494.840 kg en EXT-02 y 494.840 kg en EXT-04; snapshot y handoff totalizan 989.680 kg. Consulta estrictamente de solo lectura. |

Los respaldos anteriores a la aplicación de ACL se verificaron estructuralmente con `pg_restore --list`; la restauración en una base aislada se había validado en la auditoría anterior. No se restauró ninguno de estos archivos sobre las bases actuales.

## Credenciales administrativas

`postgres` conserva su rol administrativo en PostgreSQL y no se usó para el runtime después de aplicar la separación. La credencial que antes estaba en `backend/.env` fue reemplazada por la credencial del runtime DEV al completar el aprovisionamiento; **aún falta reubicar el secreto administrativo** en el archivo local ignorado `backend/.env.admin.local`. No se modificó el password del rol `postgres`, pero el proyecto no tiene una copia configurada actualmente. No ejecutar de nuevo el script de aprovisionamiento hasta que el responsable restaure el acceso en ese archivo.

Los cuatro secretos nuevos se escriben en archivos `.env` ignorados por Git. En Windows, los permisos POSIX `0600` solicitados por Node no sustituyen una ACL NTFS auditada; revisar el acceso local a esos archivos antes de compartir el equipo.

## Cambios en código/configuración

- `backend/src/config/dbGuard.js`: credenciales por perfil y verificación de `current_user`.
- `backend/src/config/sequelize-cli.config.js`: migradores exclusivos y no fallback a `postgres`.
- `backend/src/scripts/provision-local-db-roles.js`: aprovisionamiento local explícito, sin recrear bases.
- `backend/src/scripts/verify-local-db-privileges.js`: pruebas efectivas no destructivas.
- `backend/src/scripts/master-data-fingerprint.js`, `dev-check.js`, `local-db-backup.js`, `run-local-integration.js`.
- `backend/src/scripts/setup-local-db-isolation.js`: bloqueado de forma permanente.
- `backend/scripts/masterdata-neon/inspect.js` y `backend/scripts/migrate-master-data.js`: rutas ad hoc remotas inertes.
- `backend/package.json`, `.env.example`, `.env.test.example`, `.env.migrator.local.example`, `.env.admin.local.example`.
- `backend/test/envIsolationGuard.test.js`, `.gitignore` y documentación de readiness.

## Pendientes y riesgos

1. Restaurar la credencial administrativa local en `backend/.env.admin.local` y auditar su ACL NTFS. La cuenta postgres no está deshabilitada, pero se requiere este paso para futuras tareas de administración.
2. Revisar si la cuenta actual `postgres` es compartida con otras aplicaciones; no se cambiaron atributos ni password del rol.
3. Confirmar la diferencia de historial de migraciones DEV 163 / QA 164. No se aplicó ni revirtió ninguna migración.
4. El árbol de trabajo actual pasa el escáner. El análisis local de diffs históricos encontró 25 rutas candidatas al patrón amplio de credenciales; es una lista de búsqueda, no validación de que cada archivo contenga una credencial activa. La rotación histórica sigue pendiente y prohibida en servicios remotos durante esta intervención.
5. `setup-local-db-isolation.js` no elimina datos, pero sus reemplazos de roles requieren `--apply` y credenciales admin. Revisar sus ACL por defecto cada vez que se agregue una tabla maestra nueva.
6. QA usa DML por listas de tablas no maestras existentes. Toda nueva tabla debe clasificarse en su migración; el default QA concede `SELECT`, no DML.
7. Chrome ya mostraba un dashboard con sesión previa de Superadministrador, pero al levantar el backend QA las solicitudes del dashboard devolvieron `401`. La vista visible no demuestra autenticación contra QA. La navegación del auditador se detuvo al intentar ir a Inventario porque Computer Use no pudo validar el URL actual de Chrome; la auditoría visual por módulo permanece incompleta.
8. La cuenta administrativa `postgres` no se utiliza en runtime, pero falta restaurar su secreto local en `backend/.env.admin.local`; no se cambió el password del rol y no se puede ejecutar otra operación de administración hasta recuperar el secreto por un canal seguro.

## Criterio de aceptación de esta fase

**Aprobado parcialmente:** aislamiento efectivo entre las dos bases, mínimos privilegios del runtime y protección QA demostrados. La fase no se considera cerrada mientras no se recupere el secreto administrativo, se complete la revisión redaccionada de candidatos históricos/rotación, se resuelva la ruta de Globo, se habilite la prueba de cola de Extrusión sin tocar la mezcla activa y se complete la auditoría visual y multicorrida.
