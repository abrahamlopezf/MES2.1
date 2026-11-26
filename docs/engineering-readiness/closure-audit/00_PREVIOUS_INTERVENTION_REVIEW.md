# 00 — AUDITORÍA RETROSPECTIVA DE LA INTERVENCIÓN ANTERIOR (FASE A)

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha de Auditoría:** 2026-11-25  
**Fuentes Cruzadas:** `readiness_recovery_vault/manifest.json` (`154` archivos), `recovery_vault/pending_work_baseline.json` (`101` archivos), `git_diff_initial.patch`, `docs/qa/WORKTREE_BASELINE.md`, `00_BASELINE.md`, `13_CHANGELOG.md`, `14_READINESS_REPORT.md` y estado actual del árbol de trabajo.

---

## 1. Evaluación Crítica y Objetiva de la Intervención Anterior

Al contrastar el alcance original con las acciones ejecutadas durante la intervención anterior (*Blindaje, Estabilización y Preparación para Reestructuración MVC*), se identificaron las siguientes desviaciones y errores documentales que esta Fase de Cierre corrige:

1. **Limpieza física incompleta en la intervención anterior:**
   - Mientras la primera auditoría (`docs/audit/04_ARCHIVOS_ELIMINADOS.md`) retiró `136` archivos no rastreados/ignorados (`.playwright-cli/`, logs `.log` y 5 scripts ignorados), la segunda intervención **no retiró físicamente** los archivos experimentales, duplicados y artefactos temporales que permanecían en el espacio de trabajo (`21` scripts `.codex-*.cjs`, `70` scripts ad-hoc sueltos en `backend/*.js`, `6` migraciones duplicadas en `backend/src/database/legacy/`, `16` PNGs temporales en `tmp/pdfs/` y `.audit-telares/`, `1` artefacto `vite.config.js.timestamp-*.mjs` y `2` scripts obsoletos en `backend/src/scripts/`).
2. **Error documental sobre `frontend/src/legacy-ui-archive/` en `09_DEPENDENCY_MAP.md`:**
   - En `docs/engineering-readiness/09_DEPENDENCY_MAP.md` se afirmó erróneamente que los `59` imports no resueltos residían en una carpeta llamada `frontend/src/legacy-ui-archive/`.
   - **Verificación independiente:** La carpeta `frontend/src/legacy-ui-archive/` **no existe** en el repositorio. Tal como estaba registrado originalmente en `docs/audit/03_MAPA_DE_DEPENDENCIAS.md` (Sección 5), los `59` imports no resueltos correspondían en realidad a:
     - `22` imports en `11` scripts `.codex-*.cjs` en la raíz (`./backend/node_modules/dotenv` y `./backend/node_modules/pg`).
     - `9` imports de plantilla en `backend/generate_catalogs.js` (`8`) y `backend/generate_seeders_from_text.js` (`1`).
     - `4` imports inyectados como texto en `backend/src/scripts/update-models.js`.
     - `5` imports en archivos `*.routes.js` de `backend/src/modules/catalogs/`.
     - `3` imports comentados en `frontend/src/core/api/apiClient.ts`.
     - `16` imports en archivos huérfanos DDD/UI dentro de `frontend/src/modules/` y `frontend/src/design-system/`.
3. **Diferencia de 1 migración entre `sistema_enterprise` (`163`) y `sistema_enterprise_test` (`164`):**
   - Durante la ejecución de pruebas de integración de la intervención anterior se aplicó en `sistema_enterprise_test` la migración no rastreada `20261124130000-add-laminado-cut-transfer-confirmations.js`, dejando `sistema_enterprise_test` con `164` migraciones frente a `163` en `sistema_enterprise` (analizado a fondo en `08_DATABASE_SCHEMA_COMPARISON.md`).
4. **Script `npm --prefix backend run test:integration` sin banderas `RUN_*=1` por defecto:**
   - El comando agregado a `backend/package.json` ejecutaba `node --test test/*.local.integration.test.js` sin definir las 6 variables `RUN_*=1`, por lo que al correrse sin variables de entorno omitía (`SKIP`) las 6 suites.
5. **Omisión de `REVOKE CONNECT ON DATABASE ... FROM PUBLIC` y permisos de tablas en `sistema_enterprise` para `traceflow_app_local`:**
   - Aunque `setup-local-db-isolation.js` ejecutó `REVOKE ALL ON DATABASE sistema_enterprise FROM traceflow_app_test`, el pseudo-rol `PUBLIC` conserva el permiso por defecto `=Tc/postgres` (`CONNECT` + `TEMPORARY`) en PostgreSQL, y las concesiones `GRANT SELECT, INSERT, UPDATE, DELETE` sobre las 90 tablas se ejecutaron en `sistema_enterprise_test` pero no en `sistema_enterprise` para `traceflow_app_local`.

---

## 2. Verificación Matemática del Trabajo Concurrente Preexistente (76 Archivos `M` + 19 Archivos `??`)

Se realizó una comparación triple de hashes **SHA-256** entre:
- **Snapshot 0 (`recovery_vault/pending_work_baseline.json`)**: Capturado al inicio de la Auditoría #1 (`76` archivos `MODIFIED` + `25` archivos `UNTRACKED`, de los cuales `19` son funcionales/código, `1` es `backend/tmp/pre-extrusion-cleanup-20261122.dump` y `5` eran PNGs temporales en `backend/tmp/`).
- **Snapshot 1 (`readiness_recovery_vault/manifest.json`)**: Capturado en la Fase 0 de la Intervención #2 (`2026-11-26T03:15:32Z`).
- **Snapshot 2 (Árbol de Trabajo Actual)**: Capturado en esta Fase de Cierre (`2026-11-26T05:20:00Z`).

### 2.1 Resultado de la Comparación Triple sobre los 95 Archivos Preexistentes (`76 M` + `19 ??`)

| Subconjunto de Archivos Preexistentes | Cantidad | Estado SHA-256 (`Snapshot 0 == Snapshot 1 == Snapshot 2`) | Autoría de Diferencias Detectadas |
| :--- | :---: | :---: | :--- |
| **Archivos modificados preexistentes (`M`) idénticos en los 3 snapshots** | **69 / 76** | ✅ **100% Idénticos byte a byte** | Ninguna modificación sufrida. |
| **Archivos nuevos funcionales (`??`) idénticos en los 3 snapshots** | **18 / 19** | ✅ **100% Idénticos byte a byte** | Ninguna modificación sufrida (`5` migraciones, `4` módulos backend, `4` suites backend, `4` componentes frontend, `1` doc). |
| **Archivos preexistentes modificados concurrentemente por el agente Codex (`QA-EXT-HANDOFF-001`)** | **7** (`6 M` + `1 ??`) | ⚠️ Cambiaron por trabajo activo de **Codex** | `extrusion.service.js`, `shiftPolicy.js`, `shiftPolicy.test.js`, `ExtrusionShiftPage.tsx`, `ExtrusionShiftSessionPanel.tsx`, `extrusionApi.ts`, `extrusionShiftHandoff.local.integration.test.js`. |
| **Archivo de log modificado por ejecución de servidor/pruebas (`M`)** | **1** (`1 M`) | ⚠️ Creció en `4,152` bytes | `backend/error_log.txt` (`17,558,090 B` $\rightarrow$ `17,562,242 B` entre Snapshot 0 y Snapshot 1; intacto entre Snapshot 1 y Snapshot 2). |
| **TOTAL EVALUADO** | **95 (`76 M` + `19 ??`)** | **87 intactos (`91.6%`) + 7 evolucionados por Codex + 1 log** | **0 archivos funcionales preexistentes fueron alterados o revertidos por Antigravity.** |

---

## 3. Auditoría Individual de Todos los Archivos Creados, Modificados o Retirados en la Intervención Anterior

### 3.1 Archivos Creados por la Intervención Anterior

| # | Archivo Creado | Propósito | Dependencias Afectadas | Riesgo Funcional | Evidencia de Validación | ¿En Alcance Original? | Dictamen |
| :---: | :--- | :--- | :--- | :---: | :--- | :---: | :--- |
| 1 | `backend/src/config/dbGuard.js` | Guarda *fail-closed* de aislamiento por `APP_ENV` (`local`, `test`, `uat`, `production`). *(Nota: ampliado concurrentemente por Codex a las `05:06Z` con `assertSequelizeCliProfile`)*. | `env.js`, `database.js`, `sequelize-cli.config.js`, `validate-migration.js`, `dev-check.js`, `master-data-fingerprint.js`, `setup-local-db-isolation.js`. | **Bajo** (solo bloquea conexiones no autorizadas). | `envIsolationGuard.test.js` (`9/9 PASS`). | Alcance de Blindaje (Prompt #2) | **CONSERVAR** |
| 2 | `backend/src/scripts/master-data-fingerprint.js` | Cálculo y verificación determinista SHA-256 de las 30 tablas de Master Data (`2,928` filas). | `dev-check.js`, `backend/package.json` (`db:verify:local`, `test:integrity`). | **Nulo** (100% solo lectura SQL `SELECT`). | Ejecutado sobre `sistema_enterprise` y `sistema_enterprise_test` (`SHA-256: 36db9b70...e241`). | Alcance de Blindaje (Prompt #2) | **CONSERVAR** |
| 3 | `backend/src/scripts/setup-local-db-isolation.js` | Creación de roles PostgreSQL locales e instalación de los 58 triggers `[QA_MASTER_DATA_GUARD]` en `sistema_enterprise_test`. | `backend/package.json`. | **Bajo** (opera solo en local y escribe triggers solo en `sistema_enterprise_test`). | `58` triggers verificados en `pg_trigger`. | Alcance de Blindaje (Prompt #2) | **REVISAR** *(Corregir grants en dev y `REVOKE CONNECT FROM PUBLIC` en etapa posterior autorizada)* |
| 4 | `backend/src/scripts/security-check.js` | Escáner estático de secretos literales, URLs de Neon Cloud y artefactos sensibles rastreados en Git. *(Ampliado por Codex a las `05:16Z`)*. | `dev-check.js`, `.git/hooks/pre-commit`, `.github/workflows/migrations.yml`. | **Nulo** (solo lectura). | Detecta los 4 artefactos rastreados en `git ls-files`. | Alcance de Blindaje (Prompt #2) | **CONSERVAR** |
| 5 | `backend/src/scripts/dev-check.js` | Diagnóstico integral de preparación del entorno local (7 chequeos). | `package.json`, `backend/package.json`. | **Nulo** (solo lectura). | Ejecutado y validado. | Alcance de Blindaje (Prompt #2) | **CONSERVAR** |
| 6 | `backend/test/envIsolationGuard.test.js` | Pruebas unitarias de `dbGuard.js` (`9` casos de prueba). | Suite `npm run test:unit`. | **Nulo** (prueba unitaria pura en memoria). | `9/9 PASS`. | Alcance de Blindaje (Prompt #2) | **CONSERVAR** |
| 7 | `backend/test/characterization.contracts.test.js` | Pruebas de caracterización HTTP, 77 modelos ORM, reglas de dominio, cifrado QR y triggers en `sistema_enterprise_test`. | Suite `npm run test:unit`. | **Bajo** (ejecuta rollback y trigger test en `sistema_enterprise_test`; genera escritura en `backend/validation_error.txt` al probar HTTP 400). | `10/10 PASS`. | Alcance de Blindaje (Prompt #2) | **CONSERVAR** |
| 8 | `backend/.env.test.example`, `backend/.env.uat.example`, `backend/.env.production.example`, `frontend/.env.uat.example`, `frontend/.env.production.example` | Plantillas de variables de entorno por ambiente sin secretos reales. | Ninguna dependencia en runtime. | **Nulo** (archivos plantilla documentales). | Revisados por `security-check.js` (`0` secretos). | Alcance de Blindaje (Prompt #2) | **CONSERVAR** |
| 9 | `.git/hooks/pre-commit` | Hook local de Git que invoca `security-check.js --staged`. | Flujo local de `git commit`. | **Nulo** en runtime. | Verificado script shell. | Alcance de Blindaje (Prompt #2) | **CONSERVAR** |
| 10 | `AGENTS.md` (raíz) | Copia sincronizada de `.agents/AGENTS.md` en la raíz del repositorio. | Reglas de agentes IA. | **Nulo** en runtime. | Idéntico a `.agents/AGENTS.md`. | Alcance de Blindaje (Prompt #2, Fase 11) | **CONSERVAR** |
| 11 | `docs/engineering-readiness/*` (`16` archivos `.md` + `master-data-baseline.json`) | Documentación técnica de blindaje, arquitectura MVC objetivo, roadmap y huella de Master Data. | Ninguna dependencia en runtime. | **Nulo** (documentación). | Verificados los 17 archivos. | Alcance de Blindaje (Prompt #2, Fase 12) | **CONSERVAR** *(Corrigiendo hallazgos en `closure-audit/`)* |

---

### 3.2 Archivos Existentes Modificados Durante la Intervención Anterior (y Concurrentemente por Codex)

| # | Archivo Modificado | Autoría del Cambio | Estado Anterior (`Before`) | Estado Posterior (`After`) | Diferencia Exacta | Dependencias Afectadas | Riesgo Funcional | ¿En Alcance? | Dictamen |
| :---: | :--- | :---: | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | `backend/src/config/env.js` | **Antigravity** | `1,277 B` (`SHA: 9c95...`) — Cargaba `.env.production` cuando `NODE_ENV=production` y exponía `DATABASE_URL` sin validar `APP_ENV`. | `1,424 B` (`SHA: 5c9d...`) — Integra `validateAndResolveDbConfig(process.env)` de `dbGuard.js`. | `+18 / -10` líneas: delega resolución de BD a `dbGuard.js` y exporta `appEnv` y `dbGuard`. | `backend/src/config/database.js` y módulos que leen `config/env.js`. | **Bajo** (preserva todas las propiedades exportadas: `port`, `nodeEnv`, `db`, `jwt`, `cors`, `qrEncryptionKey`). | Sí (Prompt #2 Fase 1) | **CONSERVAR** |
| 2 | `backend/src/config/database.js` | **Antigravity** | `1,626 B` (`SHA: 9d0a...`) — Seleccionaba `env.databaseUrl` si `env.nodeEnv === 'production'`. | `2,078 B` (`SHA: 4b48...`) — Usa `env.db.useDatabaseUrl` validado por `dbGuard` y verifica `verifyPostgresConnectionIdentity` en `testConnection()`. | `+21 / -5` líneas. | `server.js` y `21` módulos que importan `config/database.js`. | **Bajo** (misma instancia `sequelize` exportada). | Sí (Prompt #2 Fase 1) | **CONSERVAR** |
| 3 | `backend/src/config/sequelize-cli.config.js` | **Antigravity + Codex** | `1,161 B` (`SHA: 2f4a...`) — Configuraba `production` directamente con `process.env.DATABASE_URL`. | `2,151 B` (`SHA: 8c03...`) — Enruta `development`, `test`, `uat` y `production` por `validateAndResolveDbConfig` y `assertSequelizeCliProfile`. | `+38 / -14` líneas. | Comandos `npx sequelize-cli` (`db:migrate`, `db:seed`). | **Bajo** (protege contra migraciones accidentales remotas). | Sí (Prompt #2 Fase 1) | **CONSERVAR** |
| 4 | `backend/src/scripts/validate-migration.js` | **Antigravity** | `1,355 B` — Conectaba directamente a `process.env.DATABASE_URL` con SSL fijo. | `1,925 B` — Usa `config/database` protegido por `dbGuard` y llama a `verifyPostgresConnectionIdentity`. | `+24 / -16` líneas. | `npm run db:verify:local`, `.github/workflows/migrations.yml` y `seed-catalogs.yml`. | **Bajo** (permite ejecución segura tanto en local como en CI). | Sí (Prompt #2 Fase 1) | **CONSERVAR** |
| 5 | `backend/.env` *(ignorado por Git)* | **Antigravity** | `1,060 B` — Contenía `DATABASE_URL` hacia Neon Cloud. | `998 B` — `APP_ENV=local`, `DB_TEST_NAME=sistema_enterprise_test`, `DATABASE_URL=` vacío. | Eliminada URL de Neon Cloud; respaldado original en `readiness_recovery_vault/files/backend/.env`. | Entorno local de ejecución. | **Nulo** (elimina riesgo crítico de conexión a nube desde local). | Sí (Prompt #2 Fase 1) | **CONSERVAR** |
| 6 | `backend/.env.example` y `frontend/.env.example` | **Antigravity** | `1,397 B` y `88 B`. | `1,516 B` y `80 B` — Documentan `APP_ENV=local` y placeholders sin secretos. | Actualización de plantillas. | Ninguna en runtime. | **Nulo**. | Sí (Prompt #2 Fase 1) | **CONSERVAR** |
| 7 | `.gitignore` | **Antigravity** | `573 B` | `1,025 B` — Añadidas reglas para `.env.*` (con excepción `!.env*.example`), `*.dump`, `*.bak`, `backend/tmp/`, `.codex-e2e-*.log`. | `+28` líneas de exclusión. | Control de versiones Git. | **Nulo**. | Sí (Prompt #2 Fase 3) | **CONSERVAR** |
| 8 | `package.json` y `backend/package.json` | **Antigravity** | `118 B` y `1,317 B`. | `873 B` y `2,314 B` — Agregados scripts NPM (`dev:check`, `security:check`, `test:unit`, `test:integration`, `test:integrity`, `db:backup:local`, `db:verify:local`, `validate`). | Solo adición en sección `"scripts"`, `0` cambios en `"dependencies"`. | Comandos CLI NPM. | **Nulo** en runtime. | Sí (Prompt #2 Fase 5) | **REVISAR** *(Ver observación sobre variables `RUN_*=1` en `test:integration`)* |
| 9 | `.github/workflows/*.yml` (`4` archivos) | **Antigravity** | `migrations.yml` tenía `on: push: branches: [main]` hacia producción; `provision-demo-users.yml` no restringía `uat`. | Los 4 workflows exigen `workflow_dispatch`, selección de ambiente y palabra de confirmación. | Endurecimiento de disparadores y validaciones previas en YAML. | GitHub Actions (cuando se haga push en el futuro). | **Bajo** (previene despliegues/migraciones automáticas accidentales). | Sí (Prompt #2 Fase 4) | **REVISAR POR HUMANO ANTES DE PUSH** |
| 10 | `.agents/AGENTS.md` | **Antigravity** | `5,717 B` (`44` líneas con las 20 Reglas de Oro). | `10,360 B` (`94` líneas: las 44 líneas originales intactas + Constitución Backend MVC). | `+50` líneas al final del archivo. | Instrucciones para agentes IA. | **Nulo** en runtime. | Sí (Prompt #2 Fase 11) | **CONSERVAR** |
| 11 | `.codex-e2e-*.cjs` (`9` archivos) y `backend/set_pwd.js` | **Antigravity** (en Prompt #2) $\rightarrow$ **Retirados en Fase F** | Contenían contraseñas literales (`Admin123!`, etc.). | En Prompt #2 se reemplazaron por variables de entorno; en esta **Fase de Cierre (Fase F)** fueron respaldados en `closure_cleanup_vault` y **retirados físicamente del árbol activo**. | Retirados del espacio de trabajo (respaldados en ambas bóvedas). | `0` dependencias. | **Nulo**. | Sí (Prompt #1 y Closure Fase E/F) | **RETIRADOS Y RESPALDADOS** |
| 12 | `backend/scripts/sync-neon.js`, `migrate-master-data.js`, `create_admin_extrusion.js`, `masterdata-neon/inspect.js`, `seed-manual-entry-permission.js` | **Antigravity + Codex** | Contenían credenciales literales o `sequelize.sync({ alter: true })` / `TRUNCATE` remoto. | Deshabilitados con `throw new Error('[SECURITY_BLOCK] ...')` al inicio del archivo y sin credenciales literales. | Bloqueo de ejecución inmediata. | `0` referencias entrantes. | **Nulo** (protege contra ejecución accidental). | Sí (Prompt #2 Fase 3) | **CONSERVAR BLOQUEADOS EN REVISIÓN** *(Hasta `git rm` autorizado)* |
| 13 | `extrusion.service.js`, `shiftPolicy.js`, `shiftPolicy.test.js`, `ExtrusionShiftPage.tsx`, `ExtrusionShiftSessionPanel.tsx`, ` docs/qa/DEFECT_REGISTER.md`, `docs/qa/QA_MASTER_REPORT.md` | **Codex (Agente Concurrente)** | Estado previo a la corrección de `QA-EXT-HANDOFF-001`. | Actualizados por Codex entre `03:17Z` y `04:06Z` para resolver el relevo digital de turno en Extrusión (`QA-EXT-HANDOFF-001`). | Cambios funcionales de Codex en relevo de turno y su prueba unitaria (`shiftPolicy.test.js`). | Módulo de Extrusión (turnos y relevo). | Trabajo activo de otro agente. | Trabajo Concurrente | **PROTEGIDOS (NO TOCADOS POR ANTIGRAVITY)** |
