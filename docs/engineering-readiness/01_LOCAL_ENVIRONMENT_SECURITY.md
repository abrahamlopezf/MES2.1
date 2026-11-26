# 01 — Blindaje y Seguridad del Ambiente Local (Fase 1)

## 1. Diagnóstico Efectivo de Conexiones Previo al Blindaje

En la auditoría efectiva de mecanismos de conexión a PostgreSQL (Fase 1.1) se inspeccionaron `backend/.env`, `backend/src/config/env.js`, `backend/src/config/database.js`, `backend/src/config/sequelize-cli.config.js`, scripts auxiliares, migraciones, seeders, pruebas y workflows:

1. **Riesgo crítico eliminado**: El archivo local `backend/.env` contenía simultáneamente `DB_HOST=127.0.0.1` y la variable `DATABASE_URL` apuntando al clúster remoto de **Neon Cloud** (`ep-icy-shadow-*.us-east-1.aws.neon.tech/neondb`).
2. **Vulnerabilidad por escalamiento de `NODE_ENV`**: En la implementación original de `backend/src/config/database.js`, bastaba con que un proceso definiera `NODE_ENV=production` (como lo hacía `backend/scripts/sync-neon.js` en su línea 2) para que Sequelize ignorara `DB_HOST=127.0.0.1` y utilizara `DATABASE_URL` hacia Neon Cloud.
3. **Ausencia de separación entre perfil de infraestructura y modo de librerías**: `NODE_ENV` se utilizaba tanto para optimizaciones de Express/React como para elegir el servidor de base de datos.

---

## 2. Intervenciones Ejecutadas y Archivos Modificados

### 2.1 Nuevo Guardián Fail-Closed (`backend/src/config/dbGuard.js`)
Se implementó el módulo central [`backend/src/config/dbGuard.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/config/dbGuard.js) con comportamiento **fail-closed**:
- **Separación explícita con `APP_ENV`**:
  - Perfiles válidos: `'local'`, `'test'`, `'uat'`, `'production'`.
  - Si `NODE_ENV='production'` se ejecuta en una máquina con `DB_HOST` local sin un `APP_ENV` remoto explícito, lanza `EnvironmentGuardError [DB_GUARD:AMBIGUOUS_NODE_ENV_ESCALATION]` antes de abrir cualquier conexión.
- **Rechazo de URLs y Hosts Remotos en `local` y `test`**:
  - Inspecciona `DATABASE_URL`, `REMOTE_DATABASE_URL`, `NEON_DATABASE_URL`, `POSTGRES_URL` y `PGHOST`.
  - Si cualquiera de estas variables apunta a un host que no esté en `ALLOWED_LOCAL_HOSTS` (`127.0.0.1`, `localhost`, `::1`), aborta inmediatamente con `REMOTE_URL_FORBIDDEN_IN_LOCAL` o `INHERITED_PGHOST_FORBIDDEN`.
  - En `APP_ENV=local` y `APP_ENV=test`, `useDatabaseUrl` es **siempre `false`** (nunca existe fallback hacia `DATABASE_URL`).
- **Validación de Base de Datos y Aislamiento de QA**:
  - Rechaza nombres de bases de datos reservadas (`neondb`, `production`, `traceflow_prod`, `traceflow_uat`, `defaultdb`).
  - En `APP_ENV=test`, exige que `DB_NAME` sea una base aislada de pruebas (`*_test`, `*_qa`, `*_e2e`, `*_verify`, por defecto `sistema_enterprise_test`) y rechaza conectarse a la base de desarrollo `sistema_enterprise` (`TEST_REQUIRES_ISOLATED_DB`).
- **Verificación Post-Conexión de Identidad Efectiva (`verifyPostgresConnectionIdentity`)**:
  - Después de `sequelize.authenticate()`, consulta `SELECT current_database() AS db, current_user AS usr, inet_server_addr()::text AS addr, inet_server_port() AS port;`.
  - Si `inet_server_addr()` no es local o `current_database()` no coincide con la base autorizada, aborta la conexión antes de cualquier operación de lectura o escritura.

### 2.2 Integración en Configuraciones Core y Plantillas de Entorno
- [`backend/src/config/env.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/config/env.js): Integrado con `validateAndResolveDbConfig(process.env)`. Expone `appEnv`, `isLocal`, `isTest`, `isUat`, `isProduction`, `isRemoteEnv`.
- [`backend/src/config/database.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/config/database.js): Invoca `validateAndResolveDbConfig` antes de instanciar `Sequelize` y ejecuta `verifyPostgresConnectionIdentity` dentro de `testDatabaseConnection()`.
- [`backend/src/config/sequelize-cli.config.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/config/sequelize-cli.config.js): Protegido con `validateAndResolveDbConfig` y ampliado con los perfiles explícitos `local`, `development`, `test`, `uat` y `production`.
- [`backend/src/scripts/validate-migration.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/scripts/validate-migration.js): Actualizado para validar la conexión a través de `dbGuard` y `testDatabaseConnection()`.
- **Saneamiento de `backend/.env` local**:
  - Previo respaldo SHA-256 en `readiness_recovery_vault/files/backend/.env`, se definió `APP_ENV=local`, `DB_TEST_NAME=sistema_enterprise_test` y se vaciaron `DATABASE_URL=` y `REMOTE_DATABASE_URL=`.
- **Plantillas independientes creadas/actualizadas**:
  - [`backend/.env.example`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/.env.example) (`APP_ENV=local`)
  - [`backend/.env.test.example`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/.env.test.example) (`APP_ENV=test`, `DB_NAME=sistema_enterprise_test`)
  - [`backend/.env.uat.example`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/.env.uat.example) (`APP_ENV=uat`)
  - [`backend/.env.production.example`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/.env.production.example) (`APP_ENV=production`)
  - [`frontend/.env.example`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/frontend/.env.example) (corregido de `:3000/api/v1` a `http://localhost:4000/api`)
  - [`frontend/.env.uat.example`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/frontend/.env.uat.example) y [`frontend/.env.production.example`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/frontend/.env.production.example)

---

## 3. Evidencia de Pruebas Automatizadas de Aislamiento (Fase 1.7)

Se creó y ejecutó la suite [`backend/test/envIsolationGuard.test.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/test/envIsolationGuard.test.js) utilizando URLs ficticias (sin realizar conexiones remotas):

```text
✔ 1. Configuración local válida permite resolver e iniciar el sistema en perfil local y test (1.93ms)
✔ 2. URL remota (Neon Cloud / AWS / Render) es rechazada antes de conectarse en local o test (3.14ms)
✔ 3. Configuración desconocida o host no local en DB_HOST es rechazada fail-closed (1.27ms)
✔ 4. Base de datos no autorizada (neondb/production o base dev en APP_ENV=test) es rechazada (1.13ms)
✔ 5. Variable heredada del sistema operativo (PGHOST / DATABASE_URL) no puede sustituir la conexión local (1.08ms)
✔ 6. Cambiar NODE_ENV=production no habilita una conexión remota en ambiente local (0.50ms)
✔ 7. Configuración incompleta o malformada falla de manera segura (fail-closed) (0.90ms)
✔ 8. Verificación post-conexión rechaza servidor cuya dirección efectiva o base de datos no coincida (1.94ms)
ℹ tests 8 | pass 8 | fail 0
```
