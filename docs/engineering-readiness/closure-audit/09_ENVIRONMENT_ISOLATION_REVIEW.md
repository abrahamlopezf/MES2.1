# 09 — AUDITORÍA EXHAUSTIVA DEL AISLAMIENTO DE AMBIENTES Y `dbGuard.js` (FASE G)

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha de Auditoría:** 2026-11-25  
**Modo:** Inspección estática y pruebas aisladas sin modificar `dbGuard.js` ni conectar a infraestructura remota.

---

## 1. Matriz de Comportamiento de `dbGuard.js` ante Condiciones de Borde

Se auditó el código actual de `backend/src/config/dbGuard.js` (`427` líneas, incluyendo la función `assertSequelizeCliProfile` añadida por Codex) y se verificó su comportamiento ante 10 escenarios críticos:

| # | Escenario Evaluado | Comportamiento Verificado en `dbGuard.js` | Código de Error / Resultado | ¿Seguro (*Fail-Closed*)? |
| :---: | :--- | :--- | :--- | :---: |
| 1 | **`APP_ENV` ausente** con `NODE_ENV=development` (o vacío) | `resolveAppEnv()` resuelve por defecto `'local'` (líneas 127–129) y aplica todas las restricciones de host local (`127.0.0.1` / `localhost` / `::1`). | Resuelve `appEnv: 'local'` | ✅ Sí |
| 2 | **`APP_ENV` ausente** con `NODE_ENV=test` | `resolveAppEnv()` resuelve `'test'` (líneas 123–125) y exige que `DB_NAME` contenga `_test`, `_qa`, `_e2e` o `_verify` (por defecto `sistema_enterprise_test`). | Resuelve `appEnv: 'test'` | ✅ Sí |
| 3 | **`APP_ENV` ausente** con `NODE_ENV=production` y `DB_HOST=127.0.0.1` (presente en `backend/.env` local) | `resolveAppEnv()` detecta `hasLocalDbHost` (líneas 134–142) y bloquea la escalación ambigua antes de abrir cualquier socket. | Lanza `AMBIGUOUS_NODE_ENV_ESCALATION` | ✅ Sí |
| 4 | **`APP_ENV` con valor inválido** (ej. `APP_ENV=staging`, `APP_ENV=prod`, `APP_ENV=neon`) | `VALID_APP_ENVS.has(explicitAppEnv)` falla (líneas 113–119). | Lanza `INVALID_APP_ENV` | ✅ Sí |
| 5 | **`DATABASE_URL`, `REMOTE_DATABASE_URL`, `NEON_DATABASE_URL` o `POSTGRES_URL` pobladas con host remoto** mientras `APP_ENV=local` o `test` | `validateAndResolveDbConfig()` inspecciona las 4 variables (líneas 170–188). Aunque `local` no usa `DATABASE_URL` para conectar, **si cualquiera de las 4 variables contiene un host no local, aborta el arranque**. | Lanza `REMOTE_URL_FORBIDDEN_IN_LOCAL` | ✅ Sí |
| 6 | **Variable heredada del sistema operativo `PGHOST`** apuntando a host no local en `local` o `test` | Bloqueado explícitamente en las líneas 199–205. | Lanza `INHERITED_PGHOST_FORBIDDEN` | ✅ Sí |
| 7 | **Uso de `sistema_enterprise` durante `APP_ENV=test`** | Bloqueado en las líneas 247–258 a menos que se defina explícitamente `ALLOW_DEV_DB_IN_TEST='1'`. | Lanza `TEST_REQUIRES_ISOLATED_DB` | ✅ Sí |
| 8 | **Desalineación en Sequelize CLI** (ej. `APP_ENV=local npx sequelize-cli db:migrate --env production`) | `assertSequelizeCliProfile(cliEnv, resolvedConfig)` en `sequelize-cli.config.js` valida que el perfil CLI coincida con `APP_ENV` (líneas 383–413). | Lanza `SEQUELIZE_CLI_PROFILE_MISMATCH` | ✅ Sí |
| 9 | **Túnel o proxy local que redirige `127.0.0.1:5432` hacia un servidor remoto** | `verifyPostgresConnectionIdentity(sequelize, expectedConfig)` ejecuta post-conexión `SELECT current_database() AS db, inet_server_addr()::text AS addr` y valida que `inet_server_addr()` sea loopback y `current_database()` coincida con `expectedConfig.name` (líneas 328–353). | Lanza `POST_CONNECT_REMOTE_ADDR_DETECTED` o `POST_CONNECT_DB_MISMATCH` | ⚠️ **Parcial** *(Si un proxy TLS/SSH termina en el servidor remoto, `inet_server_addr()` devolverá la IP privada del servidor remoto y lo bloqueará; pero se ejecuta solo cuando se invoca `testConnection()` o `verifyPostgresConnectionIdentity()`)*. |
| 10 | **`APP_ENV` ausente, `NODE_ENV=production` y `DB_HOST` ausente** (caso de contenedor CI sin `.env` local) | Si no existe `APP_ENV` ni `DB_HOST` local, las líneas 144–150 permiten inferir `appEnv = 'production'` o `'uat'` a partir de `NODE_ENV`. | Resuelve `'production'` si no hay `DB_HOST` local | ⚠️ **Observación** *(En una estación local donde alguien borre `APP_ENV` y `DB_HOST` de `backend/.env` y defina `NODE_ENV=production` + `DATABASE_URL`, podría escalar. En `backend/.env` actual `APP_ENV=local` y `DB_HOST=127.0.0.1` están presentes)*. |

---

## 2. Auditoría de Todas las Rutas de Conexión a Base de Datos en el Repositorio

Un guardián central (`dbGuard.js`) solo protege los módulos que pasan por él. Por ello, se escaneó el **100% de los archivos `.js`, `.cjs`, `.mjs` y `.ts`** del proyecto en busca de instanciaciones directas de `new Sequelize(...)` o `new Client(...)` / `new Pool(...)` de `pg`.

### 2.1 Reducción Drástica de Conexiones Directas tras la Limpieza Física (Fase F)

- **Antes de la Limpieza de Cierre:** Existían **38 archivos** con instanciación directa de `Sequelize` o `pg.Client`, de los cuales **33 omitían `dbGuard.js`** (`11` scripts `.codex-*.cjs` en raíz, `19` scripts sueltos en `backend/*.js` y `3` scripts en `backend/scripts/`).
- **Después de la Limpieza de Cierre (retirados los Lotes `F2` y `F3`):** Solo quedan **8 archivos** en todo el repositorio que instancian `Sequelize` o `pg.Client`, cuyo estado de protección es el siguiente:

| # | Archivo con Instanciación de Conexión | Librería | ¿Usa `dbGuard.js`? | Estado Real de Protección |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `backend/src/config/database.js` | `Sequelize` | ✅ **Sí (`validateAndResolveDbConfig`)** | **100% Protegido.** Punto central usado por `server.js`, `database/models/index.js` y todos los servicios de la aplicación. |
| 2 | `backend/src/scripts/dev-check.js` | `pg.Client` | ✅ **Sí (`validateAndResolveDbConfig`)** | **100% Protegido.** Solo conecta a hosts locales validados por `dbGuard`. |
| 3 | `backend/src/scripts/master-data-fingerprint.js` | `pg.Client` | ✅ **Sí (`assertLocalDatabaseOnly`)** | **100% Protegido.** Aborta si `APP_ENV` no es `local` o `test`. |
| 4 | `backend/src/scripts/setup-local-db-isolation.js` | `pg.Client` | ✅ **Sí (`assertLocalDatabaseOnly`)** | **100% Protegido.** Aborta si `APP_ENV` no es `local` o `test`. |
| 5 | `backend/test/characterization.contracts.test.js` | `pg.Client` | ✅ **Sí (`assertLocalDatabaseOnly`)** | **100% Protegido.** Aborta si no es ambiente local/test. |
| 6 | `backend/scripts/migrate-master-data.js` | `pg.Client` | Bloqueo estático | **Inutilizado de forma segura (`throw new Error('[SECURITY_BLOCK]...')` en línea 4 antes de instanciar `Client`).** |
| 7 | `backend/scripts/masterdata-neon/inspect.js` | `Sequelize` | Bloqueo estático | **Inutilizado de forma segura (`throw new Error('[SECURITY_BLOCK]...')` en línea 19 antes de instanciar `Sequelize`).** |
| 8 | `backend/scripts/seed-manual-entry-permission.js` | `Sequelize` | Bloqueo estático | **Inutilizado de forma segura (`throw new Error('[SECURITY_BLOCK]...')` en línea 3 antes de instanciar `Sequelize`).** |

> [!IMPORTANT]
> **Conclusión sobre rutas de conexión en Backend:** Tras la limpieza física de la Fase F, **no queda ningún script ejecutable en el repositorio que abra conexiones a PostgreSQL omitiendo `dbGuard.js`**.

---

## 3. Auditoría de Configuración de Frontend, Endpoints y Workflows

1. **Configuración de Frontend (`frontend/.env*` y `frontend/src/api/axiosClient.js` / `frontend/src/core/api/apiClient.ts`):**
   - `frontend/.env` local: `VITE_API_URL=http://localhost:4000/api` (`100%` local).
   - **Hallazgo en `frontend/.env.qa` (archivo rastreado en Git):** Contiene `VITE_API_URL=https://mes-backend-3oux.onrender.com/api` (apuntando al backend remoto en Render). Si alguien compila el frontend con `vite build --mode qa`, el bundle apuntará al backend remoto en Render. Este archivo fue marcado por `security-check.js` como `TRACKED_SENSITIVE_ARTIFACT` y está registrado en `FILES_PENDING_REVIEW.md` para que el equipo decida su retiro del índice de Git (`git rm --cached frontend/.env.qa`).
2. **Estado Real de los Ambientes (`local`, `test`, `uat`, `production`):**
   - **`local` (`sistema_enterprise` en `127.0.0.1:5432`):** ✅ **Implementado, operativo y verificado en vivo.**
   - **`test` (`sistema_enterprise_test` en `127.0.0.1:5432`):** ✅ **Implementado, operativo, con 58 triggers de protección activos y verificado en vivo.**
   - **`uat` y `production`:** ⚠️ **Únicamente preparados a nivel de código (`dbGuard.js`), plantillas (`.env.uat.example`, `.env.production.example`) y archivos YAML locales (`.github/workflows/*.yml`).** **NO están implementados ni aprovisionados en infraestructura remota ni en GitHub Environments**, ya que las restricciones prohibían realizar cambios remotos o despliegues.
