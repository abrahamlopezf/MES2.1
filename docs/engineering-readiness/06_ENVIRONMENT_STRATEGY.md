# 06 — Estrategia de Ambientes e Infraestructura Local Reproducible (Fases 1.3, 4 y 5)

## 1. Perfiles de Ambiente y Selección Explícita de Infraestructura

Se eliminó la dependencia exclusiva de `NODE_ENV` para seleccionar servidores de base de datos, implementando el perfil explícito **`APP_ENV`** en [`backend/src/config/dbGuard.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/config/dbGuard.js), [`backend/src/config/env.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/config/env.js), [`backend/src/config/database.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/config/database.js) y [`backend/src/config/sequelize-cli.config.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/config/sequelize-cli.config.js):

| Perfil (`APP_ENV`) | `NODE_ENV` | Base de Datos Autorizada | Plantilla de Configuración | Mecanismo de Conexión | Guardas Fail-Closed Activas |
|---|---|---|---|---|---|
| **`local`** | `development` | `sistema_enterprise` (`127.0.0.1:5432`) | `backend/.env.example`<br>`frontend/.env.example` | Parámetros locales `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (`SSL: false`) | Rechaza cualquier `DATABASE_URL`, `REMOTE_DATABASE_URL`, `NEON_DATABASE_URL` o `PGHOST` no local. |
| **`test`** | `test` | `sistema_enterprise_test` (`127.0.0.1:5432`) | `backend/.env.test.example` | Parámetros locales apuntando obligatoriamente a una base `*_test` / `*_qa` | Bloquea el uso de `sistema_enterprise` (`TEST_REQUIRES_ISOLATED_DB`), bloquea URLs remotas y activa 58 triggers PostgreSQL `[QA_MASTER_DATA_GUARD]`. |
| **`uat`** | `production` | Instancia/rama dedicada en la nube (`traceflow_uat`, Neon UAT) | `backend/.env.uat.example`<br>`frontend/.env.uat.example` | `DATABASE_URL` exclusiva de UAT (`SSL: true`) | Exige `DATABASE_URL` no local y `JWT_SECRET >= 32 bytes`. Aislada de Producción. |
| **`production`** | `production` | Clúster dedicado de Producción (`traceflow_prod`, Neon Prod) | `backend/.env.production.example`<br>`frontend/.env.production.example` | `DATABASE_URL` exclusiva de Producción (`SSL: true`) | Exige aprobación humana en GitHub Environment `production`, `JWT_SECRET >= 32 bytes` y prohíbe `provision-demo-users`. |

*(Para detalles adicionales sobre dominios, CORS, promoción de artefactos bit-a-bit y respaldos en la nube, consultar [`docs/audit/10_ESTRATEGIA_DE_AMBIENTES.md`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/docs/audit/10_ESTRATEGIA_DE_AMBIENTES.md)).*

---

## 2. Evaluación de Docker Compose vs. PostgreSQL Nativo Aislado (Fase 5)

Se evaluó la conveniencia de introducir Docker Compose frente al motor `PostgreSQL 18.7 (x86_64-windows)` ya instalado y operativo en `127.0.0.1:5432`:
- **Decisión técnica**: Mantener el servicio nativo `PostgreSQL 18.7` en `127.0.0.1:5432` con **dos bases aisladas (`sistema_enterprise` y `sistema_enterprise_test`)**, **tres roles de mínimo privilegio (`traceflow_app_local`, `traceflow_app_test`, `traceflow_migrator`)**, **58 triggers de protección de Master Data en QA** y **guardas `dbGuard.js` en Node.js**.
- **Justificación**: Evita obligar al equipo a virtualizar una segunda instancia de PostgreSQL en Docker sobre Windows, aprovecha las herramientas nativas ya instaladas (`C:\Program Files\PostgreSQL\18\bin\pg_dump.exe` y `pg_restore.exe`) y garantiza aislamiento criptográfico y de permisos a nivel de motor de base de datos.

---

## 3. Comandos Reproducibles Estandarizados (Fase 5)

Se estandarizaron los comandos en [`package.json`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/package.json) (raíz) y [`backend/package.json`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/package.json). Todos los comandos que interactúan con PostgreSQL pasan obligatoriamente por `dbGuard.js`:

| Comando (`npm run ...` en `backend/` o raíz) | Script Ejecutado | Propósito y Verificación |
|---|---|---|
| `npm run dev` *(en `backend/` o `frontend/`)* | `nodemon src/server.js` / `vite` | Inicia el servidor de desarrollo local bajo guardia `APP_ENV=local`. |
| `npm run dev:check` | `node src/scripts/dev-check.js` | Verifica versión de Node.js ($\ge 20$), lockfiles, guarda `dbGuard`, escaneo de secretos (`0` hallazgos), conexión viva a `sistema_enterprise` y `sistema_enterprise_test`, estado de migraciones y paridad `SHA-256` de Master Data (`2,928` filas). |
| `npm run security:check` | `node src/scripts/security-check.js` | Escanea 1,203 archivos de código y configuración verificando ausencia de secretos literales o URLs remotas en `backend/.env`. |
| `npm run test:unit` | `node --test ...` | Ejecuta las 16 suites unitarias y de caracterización de Backend (`envIsolationGuard.test.js`, `characterization.contracts.test.js`, más las 14 suites de dominio). |
| `npm run test:integration` | `node --test test/*.local.integration.test.js` | Ejecuta las 6 suites de integración local reversible (con guardas `RUN_*=1` sobre `APP_ENV=test` y `DB_NAME=sistema_enterprise_test`). |
| `npm run test:integrity` | `node src/scripts/master-data-fingerprint.js` | Calcula y verifica la huella determinista `SHA-256` de las 30 tablas de Master Data (`36db9b70c666b2753d70b9fa87522f5cbf1309b8d9162dac3889b9a4693ee241`). |
| `npm run db:backup:local` | `node src/scripts/setup-local-db-isolation.js` | Verifica la huella de Master Data en DEV, restaura/sincroniza `sistema_enterprise_test`, configura roles de mínimo privilegio e instala los 58 triggers de protección QA. |
| `npm run db:verify:local` | `node src/scripts/validate-migration.js` | Comprueba conexión efectiva, identidad del servidor PostgreSQL y existencia de las 12 tablas críticas del MES y conteo de materiales activos. |
| `npm run validate` | `security:check` + `envIsolationGuard` + `characterization` (+ `vite build` desde raíz) | Compuerta rápida de validación pre-commit / pre-PR. |
