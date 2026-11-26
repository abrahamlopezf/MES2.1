# 14 — COMPUERTA FINAL DE AUTORIZACIÓN PARA INICIAR LA UNIDAD MVC 1 (SECCIÓN 16–17)

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha:** 2026-11-26  
**Propósito:** Compuerta formal de control antes de iniciar la **Unidad MVC 1** de la reestructuración arquitectónica.

---

## 1. Matriz de Clasificación de Requisitos Pre-MVC (`APROBADO` / `PENDIENTE` / `BLOQUEADO` / `NO VERIFICABLE`)

| # | Requisito / Criterio de Preparación Pre-MVC | Clasificación Oficial | Evidencia Objetiva Verificada |
| :---: | :--- | :---: | :--- |
| 1 | **Sincronización con estado actual y trabajo de Codex (Fase A)** | ✅ **`APROBADO`** | Conciliados los cambios de Codex (`provision-local-db-roles.js`, `local-db-backup.js`, `git rm --cached` de 4 artefactos, mejoras en `dbGuard.js` y `dev-check.js`) en [`01_CURRENT_STATE_RECONCILIATION.md`](./01_CURRENT_STATE_RECONCILIATION.md). |
| 2 | **Conciliación del inventario pendiente y archivos huérfanos (`46` BE + `82` FE) (Fase B)** | ✅ **`APROBADO`** | Conciliada la suma exacta de `182` archivos en 8 grupos (`P1`–`P8`) y clasificados individualmente los `46` archivos huérfanos de backend y `82` de frontend en [`02_REMAINING_FILES_RESOLUTION.md`](./02_REMAINING_FILES_RESOLUTION.md). |
| 3 | **Resolución documental de los 24 imports no resueltos (Fase C)** | ✅ **`APROBADO`** | **`0` imports rotos en el grafo activo** de Node.js, Vite (`1,863` módulos) y Vitest (`11` suites); los `24` casos estáticos (`4` comentados, `4` en `catalogs/storageLocation*` huérfano y `16` en DDD huérfano) están clasificados en [`03_IMPORTS_VERIFICATION.md`](./03_IMPORTS_VERIFICATION.md). |
| 4 | **Saneamiento local del índice de Git (`git rm --cached` de 4 archivos sensibles) (Fase D)** | ✅ **`APROBADO`** | `backend/error_log.txt`, `error_log.txt`, `backend/master_data_dump.sql` y `frontend/.env.qa` están desvinculados del índice (`D ` staged), conservados en disco, ignorados por `.gitignore`, y `security-check.js` reporta **`0` hallazgos en `1,209` archivos** ([`04_GIT_INDEX_SANITATION.md`](./04_GIT_INDEX_SANITATION.md)). |
| 5 | **Aislamiento de roles PostgreSQL locales y plan SQL de corrección fina (Fase E)** | ✅ **`APROBADO`** *(Con plan SQL complementario `PENDIENTE` de autorización)* | `PUBLIC` sin `CONNECT`/`USAGE`/`CREATE`; `traceflow_app_local` y `traceflow_app_test` aislados por base de datos y sin privilegios de propietario; plan SQL no ejecutado para `extrusoras_formulas` y revocación de `DELETE` en tablas maestras DEV documentado en [`05_POSTGRESQL_PERMISSION_MATRIX.md`](./05_POSTGRESQL_PERMISSION_MATRIX.md). |
| 6 | **Protección de Master Data (`2,928` filas) y diagnóstico de `extruder_formulas` vs. `extrusoras_formulas` (Fase F)** | ✅ **`APROBADO`** | Huella SHA-256 `36db9b70...e241` intacta en DEV y QA; identificado que el modelo `ExtruderFormula` mapea a la tabla física real `extrusoras_formulas` ([`06_MASTER_DATA_PROTECTION_MATRIX.md`](./06_MASTER_DATA_PROTECTION_MATRIX.md)). |
| 7 | **Plan de alineación de esquemas DEV (`163`) y QA (`164`) (Fase G)** | ⏳ **`PENDIENTE`** *(Listo para ejecutar con 1 comando bajo autorización)* | Analizada la migración `20261124130000-add-laminado-cut-transfer-confirmations.js` y preparado el procedimiento seguro con `traceflow_dev_migrator` en [`07_DEV_QA_SCHEMA_ALIGNMENT_PLAN.md`](./07_DEV_QA_SCHEMA_ALIGNMENT_PLAN.md). |
| 8 | **Línea base reproducible de pruebas y ejecución de `extrusionFloor` en instancia desechable (Fase H)** | ✅ **`APROBADO`** | Ejecutada `extrusionFloor.local.integration.test.js` sobre la instancia temporal aislada `sistema_enterprise_disposable_verify_test` sin tocar DEV ni QA ([`08_REPRODUCIBLE_TEST_BASELINE.md`](./08_REPRODUCIBLE_TEST_BASELINE.md)). |
| 9 | **Decisiones de contratos funcionales pendientes (`QA-TEL-ROUTE-001`, `QA-ODC-PACK-001`, Corte-Laminado `PICKED`) (Fase I)** | 🔒 **`BLOQUEADO PARA UNIDADES MVC 4, 5 Y 7`** *(No bloquea Unidades MVC 1, 2 y 3)* | Delimitados los 4 contratos y formuladas las preguntas con ejemplos industriales reales en [`09_PRODUCT_OWNER_DECISIONS.md`](./09_PRODUCT_OWNER_DECISIONS.md). |
| 10 | **Diseño definitivo de estructura MVC por módulo y mapa de migración de archivos (Fase J)** | ✅ **`APROBADO`** | Documentadas las 13 dimensiones por módulo en [`10_FINAL_MVC_STRUCTURE.md`](./10_FINAL_MVC_STRUCTURE.md) y el mapa exacto de archivos por unidad en [`11_FILE_MIGRATION_MAP.md`](./11_FILE_MIGRATION_MAP.md). |
| 11 | **Protocolo de coordinación entre agentes Codex y Antigravity (Fase K)** | ✅ **`APROBADO`** | Definidas las reglas de propiedad exclusiva por módulo, topología de worktrees y pre-flight checks en [`12_AGENT_COORDINATION_PROTOCOL.md`](./12_AGENT_COORDINATION_PROTOCOL.md). |
| 12 | **Rotación remota de credenciales en consola de Neon Cloud y GitHub Environments** | 🌐 **`NO VERIFICABLE LOCALMENTE / PENDIENTE HUMANO`** | Requiere acceso administrativo humano a la consola web de Neon Cloud y a `Settings -> Environments` en GitHub. |

---

## 2. Especificación Exacta de la Primera Unidad MVC Propuesta (`UNIDAD MVC 1`)

### 2.1 Alcance y Objetivo
- **Nombre:** `Unidad MVC 1 — Desacoplamiento ORM en Controladores de Catálogos/RBAC/Dashboard y Retiro de Submódulos Huérfanos en modules/catalogs/`
- **Nivel de Riesgo:** **BAJO** (No interviene ningún servicio transaccional industrial complejo ni ninguno de los 3 contratos funcionales bloqueados por decisión de Producto).

### 2.2 Lista Exacta de Archivos que se Modificarían o Retirarían en la Unidad MVC 1

1. **Archivos a inspeccionar/editar para eliminar cualquier import directo de `database/models` o `sequelize` en la capa de Controladores (`12` archivos):**
   - `backend/src/modules/areas/areas.controller.js` y `backend/src/modules/areas/areas.service.js`
   - `backend/src/modules/users/users.controller.js` y `backend/src/modules/users/users.service.js`
   - `backend/src/modules/roles/roles.controller.js` y `backend/src/modules/roles/roles.service.js`
   - `backend/src/modules/permissions/permissions.controller.js` y `backend/src/modules/permissions/permissions.service.js`
   - `backend/src/modules/dashboard/dashboard.controller.js` y `backend/src/modules/dashboard/dashboard.service.js`
   - `backend/src/modules/reports/reports.controller.js` y `backend/src/modules/reports/reports.service.js`
2. **Archivo de ruta activa a limpiar de comentario obsoleto (`1` archivo):**
   - `backend/src/modules/catalogs/supplier/supplier.routes.js` (eliminar línea 4 comentada `// const validateRequest = require('../../../middleware/validateRequest');`).
3. **Submódulos huérfanos en `backend/src/modules/catalogs/` a respaldar en bóveda y retirar (`20` archivos en 4 subcarpetas no montadas en `routes/index.js` ni en `database/models/index.js`):**
   - `backend/src/modules/catalogs/storageLocation/` (`storageLocation.controller.js`, `storageLocation.model.js`, `storageLocation.routes.js`, `storageLocation.schema.js`, `storageLocation.service.js`)
   - `backend/src/modules/catalogs/storageLocationStatus/` (`storageLocationStatus.controller.js`, `storageLocationStatus.model.js`, `storageLocationStatus.routes.js`, `storageLocationStatus.schema.js`, `storageLocationStatus.service.js`)
   - `backend/src/modules/catalogs/storageLocationType/` (`storageLocationType.controller.js`, `storageLocationType.model.js`, `storageLocationType.routes.js`, `storageLocationType.schema.js`, `storageLocationType.service.js`)
   - `backend/src/modules/catalogs/warehouse/` (`warehouse.controller.js`, `warehouse.model.js`, `warehouse.routes.js`, `warehouse.schema.js`, `warehouse.service.js`)

*(Resultado estructural directo de la Unidad MVC 1: **`0` imports no resueltos restantes en todo `backend/src/`** y **6 controladores limpios de acceso directo a Sequelize**).*

---

## 3. Criterios Objetivos para Autorizar y Aprobar la Unidad MVC 1

1. **Criterio de Entrada (Autorización):**
   - Confirmación explícita del usuario para iniciar la **Unidad MVC 1**.
   - Ventana exclusiva en la que ningún otro agente edite simultáneamente los archivos de la Sección 2.2.
2. **Criterios de Salida (Aceptación de la Unidad MVC 1):**
   - `node backend/src/scripts/dev-check.js` $\rightarrow$ **`8/8 OK (`allPassed: true`)`** y huella SHA-256 de Master Data igual a `36db9b70c666b2753d70b9fa87522f5cbf1309b8d9162dac3889b9a4693ee241`.
   - `node backend/src/scripts/security-check.js` $\rightarrow$ **`0` hallazgos**.
   - `0` imports de `database/models` o `sequelize` en los controladores de `areas`, `users`, `roles`, `permissions`, `dashboard`, `reports` y `catalogs/supplier`.
   - `0` imports no resueltos en todo el directorio `backend/src/`.
   - `npm --prefix backend run test:unit` $\rightarrow$ **`93/96 PASS`** (`0` regresiones; `10/10` en `envIsolationGuard.test.js` y `10/10` en `characterization.contracts.test.js`).
   - `npm --prefix frontend run build` y `npm --prefix frontend run test -- --run` $\rightarrow$ **`31/31 PASS`**.
