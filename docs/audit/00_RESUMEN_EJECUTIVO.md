# 00 — Resumen Ejecutivo de Auditoría, Saneamiento y Preparación Estructural

**Proyecto:** TraceFlow MES (`MES2.1` — Sistema de Ejecución de Manufactura y Trazabilidad Industrial)  
**Rama auditada:** `main` (sincronizada con `origin/main` en `https://github.com/abrahamlopezf/MES2.1.git`, commit base `9321f41 ExceptionShift`)  
**Fecha de intervención:** 25 de noviembre de 2026  
**Alcance:** Auditoría integral de lectura, consolidación documental de pruebas, limpieza controlada de artefactos no rastreados con respaldo SHA-256, auditoría arquitectónica MVC/Frontend, diagnóstico de GitHub y diseño de estrategia de 3 ambientes (Local, UAT, Producción).

---

## 1. Métricas Globales de la Intervención

| Indicador | Valor | Metodología / Detalle |
|---|---|---|
| **Carpetas totales analizadas** | **381** | `376` carpetas de proyecto + `5` directorios masivos excluidos del análisis individual (`node_modules/` raíz, `backend/node_modules/`, `frontend/node_modules/`, `.git/`, `frontend/dist/`). |
| **Archivos totales analizados (estado inicial)** | **1,431** | Total de archivos en el árbol de trabajo excluyendo `node_modules/`, `.git/` y `frontend/dist/`. |
| **Archivos rastreados por Git (`git ls-files`)** | **1,262** | `1,186` limpios (`TRACKED_CLEAN`) + `76` con modificaciones locales activas (`MODIFIED`). |
| **Archivos no rastreados (`UNTRACKED` `??`)** | **25** | `19` archivos funcionales/pruebas/documentación de trabajo en curso + `6` archivos en `backend/tmp/` (`5` PNGs temporales + `1` dump de BD). |
| **Archivos ignorados por Git (`IGNORED` `!!`)** | **144** | Excluyendo `node_modules/` y `frontend/dist/`: `108` en `.playwright-cli/`, `18` logs `.log`, `5` scripts post-limpieza obsoletos, `2` `.env`, `2` respaldos `.sql`, `1` `catalog_dump.json` y `8` artefactos adicionales. |
| **Archivos funcionales, de configuración, pruebas activas y documentación conservados** | **1,295** | **100 %** de los archivos rastreados (`1,262`), archivos funcionales nuevos no rastreados (`19`), respaldos de BD (`.sql`/`.dump`, `4`), configuraciones `.env` (`2`) y catálogos/logs conservados. |
| **Archivos innecesarios eliminados de forma segura** | **136** | Eliminados en 4 lotes controlados (todos no rastreados o ignorados por Git), más **4 directorios temporales vacíos** (`.playwright`, `.playwright-cli`, `backend/tmp/pdfs`, `backend/tmp/pdfview`). |
| **Espacio en disco recuperado** | **22,307,413 bytes** | Equivalente a **21.27 MiB (22.31 MB)** recuperados sin afectar un solo archivo rastreado por Git. |
| **Grupos de archivos duplicados exactos (SHA-256)** | **13 grupos (35 archivos)** | Incluye **6 migraciones duplicadas** en `backend/src/database/legacy/` idénticas a `backend/src/database/migrations/`, **2 grupos de schemas Zod** idénticos en catálogos/materiales, **2 pares de handlers CQRS** en `frontend/src/modules/identity/`, **8 archivos `.keep`** y **2 pares de snapshots `.yml`** (estos últimos ya eliminados en Lote 2). |
| **Archivos pendientes de revisión humana (`05_ARCHIVOS_EN_REVISION.md`)** | **143** | Archivos rastreados en Git o respaldos locales que no deben borrarse sin un commit de saneamiento (`git rm` / `git rm --cached`) o autorización expresa del equipo. |
| **Suites de pruebas automatizadas activas conservadas** | **31** | `20` archivos `.test.js` en Backend (`node:test`, `81` casos de prueba) + `11` archivos `.test.{js,jsx,ts}` en Frontend (`Vitest`, `31` casos de prueba). |
| **Scripts auxiliares, experimentales y de diagnóstico documentados** | **106** | Consolidados en [`INVENTARIO_Y_CONSOLIDACION_DE_PRUEBAS.md`](./INVENTARIO_Y_CONSOLIDACION_DE_PRUEBAS.md): `21` scripts `.codex-e2e-*.cjs`, `54` scripts en `backend/*.js`, `13` en `backend/scripts/` y `18` en `backend/src/scripts/`. |

---

## 2. Resumen de Hallazgos Críticos

### 2.1 Seguridad y Gestión de Secretos (Prioridad Máxima — P0)
1. **Credenciales codificadas en archivos rastreados por Git**:
   - **9 scripts en la raíz** (`.codex-e2e-close-shift.cjs`, `.codex-e2e-complete-batch.cjs`, `.codex-e2e-odc-multi.cjs`, `.codex-e2e-odc-run.cjs`, `.codex-e2e-odc-topoff.cjs`, `.codex-e2e-open-shift2.cjs`, `.codex-e2e-run-api.cjs`, `.codex-e2e-turn-handoff-resume.cjs`, `.codex-e2e-turn-handoff.cjs`) contienen contraseñas literales en texto plano de cuentas operativas (`supervisor_extrusion`, `supervisor_extrusion_e2e`, `admin_alm`).
   - **`backend/scripts/migrate-master-data.js` (línea 9, rastreado en Git)** contiene un fallback literal con contraseña de base de datos PostgreSQL.
   - **`backend/scripts/create_admin_extrusion.js` y `backend/set_pwd.js` (rastreados en Git)** contienen contraseñas por defecto codificadas directamente.
2. **Credenciales de producción (Neon Cloud) en archivos locales**:
   - `backend/.env` contiene actualmente en `DATABASE_URL` y `REMOTE_DATABASE_URL` una cadena de conexión real a **Neon Cloud** mientras `NODE_ENV=development`. Si cualquier proceso o script cambia `NODE_ENV=production` (como lo hace `backend/scripts/sync-neon.js` en su línea 2: `process.env.NODE_ENV = 'production'`), el backend local se conecta y escribe directamente sobre la base de datos en la nube.
   - Tres scripts locales ignorados (`backend/check_neon_status.js`, `backend/clean_neon_production.js`, `backend/verify_neon_post_cleanup.js`) tenían la URL completa de Neon codificada en texto plano; fueron respaldados en la bóveda segura y eliminados del árbol de trabajo en el Lote 4.

### 2.2 Higiene del Repositorio GitHub
- **`backend/error_log.txt` (17.56 MB)** y **`error_log.txt` (1.48 KB)** están siendo rastreados por Git porque `.gitignore` ignora `*.log` pero no `*_log.txt`. Además, `backend/src/middlewares/error.middleware.js` escribe síncronamente en `'error_log.txt'` en cada excepción HTTP, ensuciando continuamente el árbol de trabajo (`M backend/error_log.txt`).
- **`backend/validation_error.txt` (91 B)** está rastreado por Git y es sobrescrito síncronamente por `backend/src/middlewares/validation.middleware.js` (línea 16) en cada error HTTP 400.
- **`backend/master_data_dump.sql` (430.7 KB)** está rastreado por Git a pesar de que `.gitignore` incluye la regla `*.sql` (lo que indica que fue agregado al índice antes de la regla en `.gitignore`).
- **`frontend/vite.config.js.timestamp-1793046890367-5c51820afde588.mjs` (3.16 KB)** es un archivo temporal de compilación de Vite abortada que incluye un sourcemap con rutas locales absolutas (`C:\Users\maicr\...`) y quedó rastreado en Git.

### 2.3 Arquitectura Backend (MVC / Modular) y Frontend
1. **Servicios monolíticos ("God Services") en Backend**:
   - `backend/src/modules/extrusion/extrusion.service.js` alcanza **8,303 líneas (468 KB)** concentrando reglas de dominio, consultas SQL crudas (`sequelize.query`), validaciones, manejo de turnos, mezclas, colas, racks PTI y trazabilidad.
   - `backend/src/modules/traceability/traceability.service.js` tiene **3,629 líneas (128 KB)** y `backend/src/modules/telares/telares.service.js` tiene **2,846 líneas (142 KB)**.
   - `backend/src/database/models/index.js` tiene **1,015 líneas**, registrando centralizadamente **77 modelos Sequelize** e incluso definiendo el modelo `ExtrusionProductionAdjustment` inline (líneas 665-674) fuera de una carpeta `models/`.
2. **Fuga de responsabilidades y dualidad tecnológica en Backend**:
   - **18 controladores** acceden directamente a modelos Sequelize o ejecutan consultas sin pasar por una capa de servicio o repositorio (incluyendo `extrusion.controller.js` con **851 líneas** y `warehouse.controller.js` con **284 líneas**).
   - Coexisten **2 librerías de validación** (`Joi` en 11 archivos y `Zod` en 14 archivos) y **2 utilidades de respuesta HTTP** (`backend/src/shared/responses/apiResponse.js` vs `backend/src/utils/apiResponse.js`) y **2 middlewares de error** (`error.middleware.js` activo vs `errorHandler.js` huérfano).
   - Existen **46 archivos huérfanos en `backend/src/`** (módulos completos como `intermediate/`, `processes/`, `scrap/` y subcatálogos de `catalogs/storageLocation*` y `catalogs/warehouse` que tienen modelos, servicios, controladores y rutas con imports rotos hacia `middlewares/auth` inexistente, pero no están montados en `backend/src/routes/index.js` ni en `database/models/index.js`).
3. **Coexistencia de dos arquitecturas en Frontend**:
   - Coexisten componentes activos en producción bajo `frontend/src/modules/*` (conectados a `frontend/src/app/router.jsx`) con una capa experimental DDD/CQRS en `frontend/src/modules/{identity,production,warehouse}/{domain,application,infrastructure}` que presenta **25 imports rotos hacia archivos inexistentes** (`UnitOfMeasure`, `DomainEventBusPort`, interceptores comentados) y **82 archivos sin referencias entrantes**.
   - Bundle principal monolítico en Vite: `dist/assets/index-*.js` pesa **3.71 MB (971.7 KB gzip)** porque `frontend/src/app/router.jsx` importa estáticamente todas las páginas sin `React.lazy()`.

---

## 3. Estado de Validaciones (Fase 0 vs Fase 8)

| Validación | Estado Fase 0 (Base) | Estado Fase 8 (Post-Limpieza) | Clasificación Oficial |
|---|---|---|---|
| **Integridad SHA-256 de archivos funcionales modificados/nuevos (`96` archivos)** | Registrado (`96` hashes) | `96/96` idénticos (`0` diferencias) | **APROBADO** |
| **Compilación de Frontend (`npm run build` / Vite 5.4.21)** | `1,863` módulos transformados (OK) | `1,863` módulos transformados (OK) | **APROBADO** |
| **Pruebas Automatizadas de Frontend (`npx vitest run`)** | `11/11` suites (`31/31` tests OK) | `11/11` suites (`31/31` tests OK) | **APROBADO** |
| **Validación Sintáctica VM de Backend (`new vm.Script`)** | `670/672` OK (`2` errores en scripts obsoletos ignorados) | `667/667` OK (`0` errores sintácticos) | **APROBADO** |
| **Carga de Aplicación Express y Modelos Sequelize (`app.js` + `models/index.js`)** | `app` cargada + `77` modelos | `app` cargada + `77` modelos | **APROBADO** |
| **Pruebas Unitarias de Backend (`node --test`, 14 suites unitarias)** | `72` pass / `3` fail en `telares` | `72` pass / `3` fail en `telares` | **ERROR PREEXISTENTE** |
| **Pruebas de Integración Local de Backend (6 suites `.local.integration.test.js`)** | `6` omitidas por guardas `RUN_*` | `6` omitidas por seguridad de BD | **NO EJECUTADO (Protección de BD)** |

> [!NOTE]
> Los 3 tests fallidos en `backend/test/telares.production-rules.test.js` y `backend/test/telares.rules.test.js` constituyen un **ERROR PREEXISTENTE** derivado de cambios en curso no confirmados (`M backend/src/modules/telares/productionRules.js`) donde otro desarrollador habilitó `GLOBO` en la ruta de `ROLLO_TELA` y unificó el código de error `INVALID_BANDA_CINTA_ROUTE`, sin haber actualizado aún las aserciones en los tests. En cumplimiento de las Restricciones #1, #11, #15 y #18, ni el código ni los tests fueron alterados.

---

## 4. Niveles de Preparación (Metodología Objetiva)

Para evitar estimaciones subjetivas, cada porcentaje se calcula como la razón matemática $\text{Criterios Cumplidos} / \text{Criterios Evaluados}$ según la lista de verificación verificable de cada dimensión:

1. **Preparación para el Saneamiento de GitHub: 80.0 % (8 / 10 criterios cumplidos)**
   - *Cumplidos (8)*: Inventario completo de rastreados/ignorados; identificación exacta de archivos generados en Git; detección de dumps SQL rastreados; localización exacta de secretos en working tree; verificación de workflows de GitHub Actions; limpieza física de archivos ignorados innecesarios (136 archivos); preservación del árbol de trabajo activo; comandos exactos de remediación documentados (`09_SANEAMIENTO_GITHUB.md`).
   - *Pendientes (2 — Bloqueos externos a esta intervención)*: (a) Confirmar/commitear el trabajo en curso de los desarrolladores (`76` archivos `M` y `19` archivos `??`); (b) Rotar las credenciales expuestas y ejecutar `git rm --cached` + actualización de `.gitignore`.

2. **Preparación para Implementar los Tres Ambientes (Local, UAT, Producción): 60.0 % (9 / 15 criterios cumplidos)**
   - *Cumplidos (9)*: Variables de entorno identificadas (`backend/.env.example`, `frontend/.env.example`); configuración CORS parametrizada por `CLIENT_URL`; soporte de `DATABASE_URL` y SSL en Sequelize; validación de longitud de `JWT_SECRET` en producción; soporte de llaves QR (`QR_ENCRYPTION_KEY` y `QR_LEGACY_DECRYPTION_KEY`); endpoint `/health` operativo; migraciones Sequelize CLI estructuradas; workflows base de migración y rollback en GitHub Actions; headers de seguridad en `frontend/vercel.json`.
   - *Pendientes (6)*: (a) `backend/src/config/database.js` y `sequelize-cli.config.js` solo reconocen `development`, `test` y `production` (falta perfil explícito `uat`/`staging` con `DATABASE_URL` y SSL); (b) Escritura síncrona en disco local (`error_log.txt`, `validation_error.txt`) incompatible con contenedores efímeros/serverless en UAT/Prod; (c) Workflows `.github/workflows/*.yml` acoplados exclusivamente a la rama `main` y al environment `production`; (d) `frontend/.env.example` apunta a un puerto/prefijo obsoleto (`http://localhost:3000/api/v1` en lugar de `http://localhost:4000/api`); (e) Separación física de credenciales de Neon en `backend/.env` local; (f) Pipeline de promoción de artefactos UAT $\rightarrow$ Producción con aprobación manual.

3. **Preparación para la Reestructuración MVC: 75.0 % (9 / 12 criterios cumplidos)**
   - *Cumplidos (9)*: Mapa completo de dependencias construido (`0` ciclos circulares detectados); puntos de entrada y rutas Express mapeados (`31` prefijos de ruta); inventario de `77` modelos Sequelize y sus asociaciones documentado; identificación de los `18` controladores con acceso directo a datos; identificación de los `7` servicios con SQL crudo; identificación de los `46` archivos huérfanos en backend y `82` en frontend; localización de los `59` imports no resueltos; suite de pruebas unitarias de dominio en Extrusión, Telares, Almacén y QR operativa; propuesta de arquitectura objetivo y plan incremental documentados (`07_AUDITORIA_MVC.md` y `08_PROPUESTA_REESTRUCTURACION.md`).
   - *Pendientes (3)*: (a) Estabilizar y hacer commit de los `95` archivos funcionales con cambios pendientes en la rama `main`; (b) Alinear los 3 tests unitarios de `telares` con la regla vigente de `GLOBO`; (c) Retirar o aislar los módulos huérfanos con imports rotos antes de mover carpetas.
