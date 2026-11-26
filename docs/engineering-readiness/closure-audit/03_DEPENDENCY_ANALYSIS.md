# 03 — ANÁLISIS PROFUNDO DE DEPENDENCIAS E IMPORTS NO RESUELTOS (FASE C & D)

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha de Análisis:** 2026-11-25  
**Alcance:** Grafo completo de módulos CommonJS (`backend/`) y ES Modules / TypeScript (`frontend/`), antes y después de la limpieza física controlada (Fase F).

---

## 1. Resumen del Impacto de la Limpieza sobre el Grafo de Dependencias

| Indicador del Grafo de Dependencias | Antes de la Limpieza de Cierre | Después de la Limpieza de Cierre (Fase F) | Variación / Mejora |
| :--- | :---: | :---: | :--- |
| **Ciclos de Dependencia Circular (Backend + Frontend)** | `0` | `0` | ✅ Sin ciclos (`0`) |
| **Módulos transformados en `vite build` (Grafo Activo Frontend)** | `1,863` | `1,863` | ✅ `100%` intacto (`0` regresiones) |
| **Modelos Sequelize registrados en `database/models/index.js`** | `77` | `77` | ✅ `100%` intacto (`77/77`) |
| **Prefijos de rutas montados en `backend/src/routes/index.js`** | `29` | `29` | ✅ `100%` intacto (`29/29`) |
| **Total de Imports No Resueltos en el Repositorio** | **`59`** | **`24`** | ✅ **`-35 imports rotos eliminados (-59.3%)`** |
| **Scripts con Conexión Directa a PostgreSQL sin `dbGuard.js` (Ejecutables)** | **`30` ejecutables + `3` bloqueados** | **`0` ejecutables + `3` bloqueados** | ✅ **`-30 conexiones directas no protegidas eliminadas (-100% de las ejecutables)`** |

---

## 2. Desglose Exacto de los 59 Imports No Resueltos (Antes vs. Después)

### 2.1 Los 35 Imports No Resueltos Eliminados en la Fase F

Al retirar del árbol activo los scripts experimentales `.codex-*.cjs` (Lote `F2`), los generadores obsoletos sueltos en `backend/*.js` (Lote `F3`) y el script de parcheo único `backend/src/scripts/update-models.js` (Lote `F4`), quedaron eliminados de raíz **35 de los 59 imports no resueltos**:

| Grupo Eliminado | Archivos Origen Retirados | Cantidad de Imports No Resueltos Eliminados | Detalle de los Targets Rotos Eliminados |
| :--- | :--- | :---: | :--- |
| **Lote F2 (`.codex-*.cjs`)** | `11` archivos: `.codex-create-e2e-db.cjs`, `.codex-e2e-aftermix.cjs`, `.codex-e2e-check.cjs`, `.codex-e2e-create-supervisor2.cjs`, `.codex-e2e-formula.cjs`, `.codex-e2e-inspect.cjs`, `.codex-e2e-odc-info.cjs`, `.codex-e2e-schema.cjs`, `.codex-e2e-shift-setup.cjs`, `.codex-e2e-supervisors.cjs`, `.codex-e2e-wipqr.cjs` | **`22`** (`2` por archivo) | `require('./backend/node_modules/dotenv')` y `require('./backend/node_modules/pg')` desde la raíz del monorrepo. |
| **Lote F3 (`backend/*.js`)** | `backend/generate_catalogs.js` (`8`) y `backend/generate_seeders_from_text.js` (`1`) | **`9`** | Plantillas string literales (`../../services/BaseCatalogService`, `../../utils/apiResponse`, `../../utils/asyncHandler`, `models`) y referencia a `raw_materials.tsv` inexistente. |
| **Lote F4 (`backend/src/scripts/`)** | `backend/src/scripts/update-models.js` | **`4`** | Strings de `require('../../modules/globo/models/...')` y `require('../../modules/laminado/models/...')` diseñados para inyectarse en `database/models/index.js` (ruta relativa inválida desde `src/scripts/`). |
| **Subtotal Eliminado** | **14 archivos experimentales/obsoletos retirados** | **`35`** | **Eliminados con 0 impacto funcional.** |

---

### 2.2 Los 24 Imports No Resueltos Restantes (Ubicados en Directorios de Código Fuente `src/`)

Los **24 imports no resueltos restantes** se encuentran dentro de `backend/src/` (`5`) y `frontend/src/` (`19`). En estricto cumplimiento de la **Restricción Obligatoria #2 ("No modificar código fuente funcional")**, estos archivos no fueron editados ni eliminados durante esta Fase de Cierre, quedando inventariados con precisión para su resolución en la futura etapa de refactorización MVC:

#### A. En `backend/src/modules/catalogs/` (`5` imports en archivos de rutas de catálogos)

| # | Archivo en `backend/src/` | Import No Resuelto | Estado del Archivo en el Grafo Activo | Acción Programada para Refactorización MVC |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `backend/src/modules/catalogs/storageLocation/storageLocation.routes.js` | `../../../middlewares/auth` | **Huérfano** (No montado en `routes/index.js`; el middleware real es `auth.middleware.js`). | Corregir path o retirar sub-módulo duplicado de localidades (el activo es `modules/materials/location/`). |
| 2 | `backend/src/modules/catalogs/storageLocationStatus/storageLocationStatus.routes.js` | `../../../middlewares/auth` | **Huérfano** (No montado en `routes/index.js`). | Retirar o integrar en catálogos de almacén. |
| 3 | `backend/src/modules/catalogs/storageLocationType/storageLocationType.routes.js` | `../../../middlewares/auth` | **Huérfano** (No montado en `routes/index.js`). | Retirar o integrar en catálogos de almacén. |
| 4 | `backend/src/modules/catalogs/warehouse/warehouse.routes.js` | `../../../middlewares/auth` | **Huérfano** (No montado en `routes/index.js`; el módulo real es `src/modules/warehouse/warehouse.routes.js`). | Retirar carpeta duplicada `catalogs/warehouse/`. |
| 5 | `backend/src/modules/catalogs/supplier/supplier.routes.js` | `../../../middleware/validateRequest` | **Nota:** Es un comentario `// const validateRequest = require('../../../middleware/validateRequest');` detectado por el analizador léxico. El archivo carga y funciona correctamente en `/api/suppliers`. | Limpiar línea comentada en Unidad 1 de Refactorización MVC. |

#### B. En `frontend/src/` (`19` imports: `3` comentados + `16` en archivos DDD/UI huérfanos no alcanzables desde `main.jsx`)

| # | Archivo en `frontend/src/` | Import No Resuelto | Naturaleza / Estado en `vite build` |
| :---: | :--- | :--- | :--- |
| 6–8 | `frontend/src/core/api/apiClient.ts` | `./interceptors/idempotency.interceptor`, `./interceptors/retry.interceptor`, `./interceptors/error.interceptor` | **Líneas comentadas (`// import ...`)** para interceptores futuros. `apiClient.ts` compila sin errores. |
| 9 | `frontend/src/design-system/components/scanner-overlay/ScannerOverlay.jsx` | `../button/PrimitiveButton` | Componente huérfano (`0` referencias entrantes; el componente activo es `CameraScanner.jsx`). |
| 10 | `frontend/src/modules/catalogs/services/catalogsApi.js` | `../../../lib/api` | Servicio huérfano (`0` referencias desde `router.jsx`). |
| 11 | `frontend/src/modules/identity/application/commands/TransferCustodyCommands.ts` | `../valueObjects/CustodyValueObjects` | Capa experimental DDD huérfana no importada por `router.jsx`. |
| 12 | `frontend/src/modules/identity/domain/policies/authorization/IdentityAuthorizationPolicies.ts` | `./IdentityToken` | Capa experimental DDD huérfana no importada por `router.jsx`. |
| 13 | `frontend/src/modules/identity/domain/ports/IndustrialCodeGeneratorPort.ts` | `../../valueObjects/IdentityValueObjects` | Capa experimental DDD huérfana no importada por `router.jsx`. |
| 14 | `frontend/src/modules/identity/infrastructure/events/handlers/AuditIdentityGenerationHandler.ts` | `../events/IdentityDomainEvents` | Capa experimental DDD huérfana no importada por `router.jsx`. |
| 15 | `frontend/src/modules/production/application/handlers/ExecuteMixingHandler.ts` | `../../../../shared/domain/events/DomainEventBusPort` | Capa experimental DDD huérfana no importada por `router.jsx`. |
| 16 | `frontend/src/modules/production/application/handlers/StartProductionRunHandler.ts` | `../../../../shared/domain/events/DomainEventBusPort` | Capa experimental DDD huérfana no importada por `router.jsx`. |
| 17 | `frontend/src/modules/production/application/ports/WeightScalePort.ts` | `../domain/valueObjects/TransformationValueObjects` | Capa experimental DDD huérfana no importada por `router.jsx`. |
| 18 | `frontend/src/modules/production/domain/entities/Rack.ts` | `../../../catalog/domain/valueObjects/UnitOfMeasure` | Capa experimental DDD huérfana no importada por `router.jsx`. |
| 19 | `frontend/src/modules/production/domain/valueObjects/TransformationValueObjects.ts` | `../../../catalog/domain/valueObjects/UnitOfMeasure` | Capa experimental DDD huérfana no importada por `router.jsx`. |
| 20 | `frontend/src/modules/production/engine/ProcessIO.ts` | `../../../catalog/domain/valueObjects/UnitOfMeasure` | Capa experimental DDD huérfana no importada por `router.jsx`. |
| 21 | `frontend/src/modules/warehouse/application/dto/WarehouseDTOs.ts` | `../../catalog/domain/valueObjects/UnitOfMeasure` | Capa experimental DDD huérfana no importada por `router.jsx`. |
| 22 | `frontend/src/modules/warehouse/application/handlers/RegisterMaterialEntryHandler.ts` | `../../../../shared/domain/events/DomainEventBusPort` | Capa experimental DDD huérfana no importada por `router.jsx`. |
| 23 | `frontend/src/modules/warehouse/domain/events/WarehouseEvents.ts` | `../../catalog/domain/valueObjects/UnitOfMeasure` | Capa experimental DDD huérfana no importada por `router.jsx`. |
| 24 | `frontend/src/modules/warehouse/domain/valueObjects/WarehouseValueObjects.ts` | `../../catalog/domain/valueObjects/UnitOfMeasure` | Capa experimental DDD huérfana no importada por `router.jsx`. |
