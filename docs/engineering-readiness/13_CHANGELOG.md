# 13 — BITÁCORA DE CAMBIOS EJECUTADOS (CHANGELOG DE BLINDAJE Y PREPARACIÓN)

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha:** 2026-11-25  
**Alcance:** Intervenciones autorizadas de blindaje local, protección de Master Data, remediación de secretos, endurecimiento de workflows, infraestructura de pruebas y documentación de preparación MVC.

> [!NOTE]
> **Cumplimiento de Restricciones Absolutas:** Ningún cambio listado a continuación modifica reglas de negocio, esquemas de base de datos de desarrollo (`sistema_enterprise`), componentes visuales de React, rutas HTTP ni trabajo funcional en progreso de otros desarrolladores.

---

## 1. Archivos Nuevos Creados

### 1.1 Guardas de Seguridad, Scripts de Verificación y Pruebas (`backend/`)

| Archivo Creado | Propósito Técnico | Validación Ejecutada |
| :--- | :--- | :--- |
| `backend/src/config/dbGuard.js` | Guarda central *fail-closed* que valida `APP_ENV` (`local`, `test`, `uat`, `production`), bloquea hosts remotos (`neon.tech`, `aws`, `pooler`, etc.) en `local`/`test`, impide escalación por `NODE_ENV=production`, redirige `APP_ENV=test` a `sistema_enterprise_test` y verifica la identidad del servidor PostgreSQL. | `backend/test/envIsolationGuard.test.js` (`8/8 PASS`). |
| `backend/src/scripts/master-data-fingerprint.js` | Calcula y verifica el hash SHA-256 determinista fila por fila de las 30 tablas de Master Data (`2,928` filas) y genera el snapshot `docs/engineering-readiness/master-data-baseline.json`. | Verificado en `sistema_enterprise` y `sistema_enterprise_test` (`SHA-256: 36db9b70...e241`). |
| `backend/src/scripts/setup-local-db-isolation.js` | Aprovisiona los roles PostgreSQL de mínimo privilegio (`traceflow_app_local`, `traceflow_app_test`, `traceflow_migrator`), revoca acceso cruzado de `traceflow_app_test` sobre `sistema_enterprise` e instala los 58 triggers `[QA_MASTER_DATA_GUARD]` en `sistema_enterprise_test`. | Ejecutado con `exit code 0`; probado disparo de trigger en `characterization.contracts.test.js`. |
| `backend/src/scripts/security-check.js` | Escáner automatizado de secretos literales, URLs de Neon Cloud y archivos `.env` rastreados en el repositorio (`--staged` para pre-commit o repositorio completo). | Escaneados `1,203` archivos con `0` hallazgos (`✅ [SECURITY_CHECK_PASSED]`). |
| `backend/src/scripts/dev-check.js` | Diagnóstico integral de entorno de desarrollo local: valida variables, guarda `dbGuard`, conectividad a `sistema_enterprise` y `sistema_enterprise_test`, triggers de protección, huella SHA-256 de Master Data y escaneo de secretos. | Ejecutado con `7/7` validaciones aprobadas (`allPassed: true`). |
| `backend/test/envIsolationGuard.test.js` | Suite unitaria de 8 pruebas para certificar todos los vectores de bloqueo de `dbGuard.js`. | `8/8 PASS`. |
| `backend/test/characterization.contracts.test.js` | Suite de 10 pruebas de caracterización que congela contratos HTTP, autenticación JWT, registro de los 77 modelos Sequelize, reglas de negocio críticas, cifrado QR y triggers de protección en `sistema_enterprise_test`. | `10/10 PASS`. |

### 1.2 Plantillas de Configuración por Ambiente y Hooks Locales

| Archivo Creado | Propósito Técnico |
| :--- | :--- |
| `backend/.env.test.example` | Plantilla para ambiente de pruebas local (`APP_ENV=test`, `DB_NAME=sistema_enterprise_test`, `127.0.0.1`). |
| `backend/.env.uat.example` | Plantilla para ambiente de certificación (`APP_ENV=uat`, sin secretos reales). |
| `backend/.env.production.example` | Plantilla para ambiente productivo (`APP_ENV=production`, `APP_PRODUCTION_CONFIRMED=true`, sin secretos reales). |
| `frontend/.env.example` | Plantilla de variables Vite para desarrollo local (`VITE_APP_ENV=local`). |
| `frontend/.env.uat.example` | Plantilla de variables Vite para UAT (`VITE_APP_ENV=uat`). |
| `frontend/.env.production.example` | Plantilla de variables Vite para Producción (`VITE_APP_ENV=production`). |
| `.git/hooks/pre-commit` | Hook local de Git que ejecuta `node backend/src/scripts/security-check.js --staged` y bloquea commits de archivos `.env`, dumps o secretos. |

### 1.3 Suite Documental de Preparación de Ingeniería (`docs/engineering-readiness/`)

Se generaron los **16 documentos obligatorios** más el artefacto JSON de huella criptográfica:
- `docs/engineering-readiness/README.md`
- `docs/engineering-readiness/00_BASELINE.md`
- `docs/engineering-readiness/01_LOCAL_ENVIRONMENT_SECURITY.md`
- `docs/engineering-readiness/02_DATABASE_PROTECTION.md`
- `docs/engineering-readiness/03_MASTER_DATA_INTEGRITY.md`
- `docs/engineering-readiness/04_SECRETS_REMEDIATION.md`
- `docs/engineering-readiness/05_GITHUB_SECURITY.md`
- `docs/engineering-readiness/06_ENVIRONMENT_STRATEGY.md`
- `docs/engineering-readiness/07_TESTING_BASELINE.md`
- `docs/engineering-readiness/08_FUNCTIONAL_CONTRACTS.md`
- `docs/engineering-readiness/09_DEPENDENCY_MAP.md`
- `docs/engineering-readiness/10_MVC_TARGET_ARCHITECTURE.md`
- `docs/engineering-readiness/11_REFACTORING_ROADMAP.md`
- `docs/engineering-readiness/12_ROLLBACK_STRATEGY.md`
- `docs/engineering-readiness/13_CHANGELOG.md`
- `docs/engineering-readiness/14_READINESS_REPORT.md`
- `docs/engineering-readiness/master-data-baseline.json`
- `AGENTS.md` (sincronizado en raíz con `.agents/AGENTS.md`)

---

## 2. Archivos Existentes Modificados (Autorizados)

| Archivo Modificado | Naturaleza del Cambio Autorizado | Respaldo en Bóveda (`SHA-256` original) |
| :--- | :--- | :--- |
| `backend/src/config/env.js` | Integración con `dbGuard.js`; eliminación del comportamiento peligroso que sobreescribía la conexión con `.env.production` cuando `NODE_ENV=production` sin validar `APP_ENV`. | Respaldado en `readiness_recovery_vault/files/backend/src/config/env.js`. |
| `backend/src/config/database.js` | Uso de `dbConfig` validado por `dbGuard.js` y exportación de `verifyDatabaseEnvironment()`. | Respaldado en `readiness_recovery_vault/files/backend/src/config/database.js`. |
| `backend/src/config/sequelize-cli.config.js` | Enrutamiento de `development`, `test` y `production` a través de `validateAndResolveDbConfig` de `dbGuard.js` para impedir migraciones accidentales hacia Neon Cloud desde CLI local. | Respaldado en `readiness_recovery_vault/files/backend/src/config/sequelize-cli.config.js`. |
| `backend/src/scripts/validate-migration.js` | Incorporación de `assertLocalDatabaseOnly(env)` antes de validar migraciones. | Respaldado en `readiness_recovery_vault/files/backend/src/scripts/validate-migration.js`. |
| `backend/.env` (no rastreado) | Fijado `APP_ENV=local`, `DB_TEST_NAME=sistema_enterprise_test` y vaciadas las variables comentadas/residuales `DATABASE_URL=` y `REMOTE_DATABASE_URL=` hacia Neon Cloud. | Respaldado en `readiness_recovery_vault/files/backend/.env`. |
| `backend/.env.example` | Actualizado con la documentación de `APP_ENV`, `DB_TEST_NAME` y placeholders seguros sin credenciales reales. | Respaldado en `readiness_recovery_vault/files/backend/.env.example`. |
| `backend/scripts/sync-neon.js` | Deshabilitado permanentemente con salida inmediata `throw new Error('[SECURITY_BLOCK] sync-neon.js está deshabilitado...')`. | Respaldado en `readiness_recovery_vault/files/backend/scripts/sync-neon.js`. |
| `backend/scripts/migrate-master-data.js` | Eliminadas credenciales literales de Neon Cloud y bloqueada ejecución salvo configuración explícita por variables de entorno y bandera `ALLOW_MASTER_DATA_MIGRATION=true`. | Respaldado en `readiness_recovery_vault/files/backend/scripts/migrate-master-data.js`. |
| `backend/scripts/create_admin_extrusion.js` | Eliminada contraseña literal; exige `ADMIN_EXTRUSION_PASSWORD` por entorno y valida `assertLocalDatabaseOnly`. | Respaldado en `readiness_recovery_vault/files/backend/scripts/create_admin_extrusion.js`. |
| `backend/set_pwd.js` | Eliminada contraseña literal; exige `TARGET_USER_EMAIL` y `TARGET_USER_PASSWORD` por entorno y valida `assertLocalDatabaseOnly`. | Respaldado en `readiness_recovery_vault/files/backend/set_pwd.js`. |
| `.codex-e2e-*.cjs` (9 scripts en raíz) | Eliminadas contraseñas literales (`Admin123!`, `Operator123!`, etc.), reemplazadas por lectura obligatoria de `E2E_USER_PASSWORD` / `E2E_ADMIN_PASSWORD` desde variables de entorno. | Respaldados los 9 archivos en `readiness_recovery_vault/files/`. |
| `.github/workflows/migrations.yml` | Eliminado trigger automático `push` a `main`; restringido a `workflow_dispatch` manual con selección explícita de `target_environment` (`uat` o `production`) y `confirm_execution: EJECUTAR_MIGRACION`. | Respaldado en `readiness_recovery_vault/files/.github/workflows/migrations.yml`. |
| `.github/workflows/provision-demo-users.yml` | Restringido exclusivamente al ambiente `uat` (`APP_ENV: uat`) con confirmación `PROVISIONAR_DEMO_UAT` y `E2E_DEMO_PASSWORD` desde GitHub Secrets. | Respaldado en `readiness_recovery_vault/files/.github/workflows/provision-demo-users.yml`. |
| `.github/workflows/rollback.yml` | Exige selección de ambiente (`uat`/`production`) y palabra de confirmación `CONFIRMAR_ROLLBACK`. | Respaldado en `readiness_recovery_vault/files/.github/workflows/rollback.yml`. |
| `.github/workflows/seed-catalogs.yml` | Exige selección de ambiente (`uat`/`production`) y palabra de confirmación `EJECUTAR_SEED_CATALOGOS`. | Respaldado en `readiness_recovery_vault/files/.github/workflows/seed-catalogs.yml`. |
| `.gitignore` | Ampliado para excluir `.env.*` (excepto `*.example`), `*.dump`, `*.bak`, `*.sql.gz`, logs temporales, `.codex-*` futuros y artefactos de diagnóstico. | Respaldado en `readiness_recovery_vault/files/.gitignore`. |
| `package.json` y `backend/package.json` | Agregados scripts reproducibles: `dev:check`, `security:check`, `test:unit`, `test:integration`, `test:integrity`, `db:backup:local`, `db:verify:local`, `validate`. | Respaldados en `readiness_recovery_vault/files/`. |
| `.agents/AGENTS.md` | Conservadas íntegramente las 20 Reglas de Oro existentes y añadidas las directivas permanentes de Gobernanza de Ingeniería, Protección de Master Data, Aislamiento de Ambientes y Refactorización MVC Incremental (Fase 11). | Respaldado antes de editar. |
