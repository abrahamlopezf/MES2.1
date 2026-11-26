# 07 — Auditoría de Arquitectura MVC (Backend) y Arquitectura Modular (Frontend)

## 1. Alcance y Metodología

Esta auditoría evalúa el estado real de la arquitectura del **Backend (`backend/src/`, 628 archivos)** y del **Frontend (`frontend/src/`, 795 archivos)** en modo estrictamente de lectura (Restricciones #1 a #9). Cada hallazgo documenta los 8 atributos requeridos:
1. **Ubicación exacta**
2. **Evidencia encontrada**
3. **Problema arquitectónico**
4. **Impacto**
5. **Nivel de riesgo** (`CRÍTICO`, `ALTO`, `MEDIO`, `BAJO`)
6. **Recomendación**
7. **Dependencias afectadas**
8. **Prioridad para la futura reestructuración** (`P0 — Inmediata`, `P1 — Alta`, `P2 — Media`, `P3 — Baja`)

---

## 2. Evaluación General del Backend (Patrón MVC + Capa de Servicios)

El backend de TraceFlow MES adopta una organización **modular por dominio** bajo `backend/src/modules/<dominio>/`, complementada con directorios transversales (`config/`, `core/`, `database/`, `middlewares/`, `routes/`, `services/`, `shared/`, `utils/`). Sin embargo, la evolución acelerada del sistema produjo una **fragmentación de patrones** donde coexisten tres estilos distintos:
1. **Módulos con Servicio Monolítico ("God Service")**: `extrusion`, `telares`, `traceability`, `warehouse`, `qrcodes`, `laminado`, `globo`, `corte`.
2. **Módulos de Catálogo con Herencia (`BaseCatalogService` + Zod + `utils/apiResponse`)**: `materials/materialBrand`, `materials/materialCode`, `materials/materialFamily`, `materials/materialType`, `materials/materialUnit`, `materials/location`, `catalogs/supplier`.
3. **Módulos con Caso de Uso / Dominio (`useCases/` + `*Domain.service.js`)**: `reception/useCases/receiveMaterial.useCase.js`, `warehouse/inventoryDomain.service.js`, `traceability/traceabilityDomain.service.js`.

---

## 3. Hallazgos Arquitectónicos del Backend

### Hallazgo B-01: Servicios Monolíticos ("God Services") con Múltiples Responsabilidades
1. **Ubicación exacta**:
   - [`backend/src/modules/extrusion/extrusion.service.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/modules/extrusion/extrusion.service.js) (**8,303 líneas / 468,429 bytes**)
   - [`backend/src/modules/traceability/traceability.service.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/modules/traceability/traceability.service.js) (**3,629 líneas / 128,173 bytes**)
   - [`backend/src/modules/telares/telares.service.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/modules/telares/telares.service.js) (**2,846 líneas / 142,078 bytes**)
   - [`backend/src/modules/warehouse/warehouse.service.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/modules/warehouse/warehouse.service.js) (**1,555 líneas / 63,215 bytes**)
   - [`backend/src/modules/qrcodes/qrTraceabilityTree.service.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/modules/qrcodes/qrTraceabilityTree.service.js) (**1,408 líneas / 56,778 bytes**)
   - [`backend/src/modules/warehouse/consumptionOrder.service.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/modules/warehouse/consumptionOrder.service.js) (**1,016 líneas / 45,426 bytes**)
2. **Evidencia encontrada**: Un solo archivo (`extrusion.service.js`, 8,303 líneas) concentra la gestión de silos, recepción de lotes de silo, preparación de mezclas, equivalencias de materiales, administración de colas de extrusoras, apertura/cierre/relevo de turnos, ingreso de bobinas PTI a racks, ajustes de producción, registro y conciliación de merma/scrap, reportes financieros/operativos y migraciones dinámicas de esquema en caliente (`describeTable` / `ALTER TABLE` / `sequelize.query`).
3. **Problema arquitectónico**: Violación severa del Principio de Responsabilidad Única (SRP) y baja cohesión modular. Aunque ya se inició una extracción parcial hacia `backend/src/modules/extrusion/services/` (`shiftBalance.js`, `shiftPolicy.js`, `formulaMachinePolicy.js`, `formulaColorRules.js`, `siloConsumptionAllocator.js`, `ptiWarehouseTransfer.service.js`), más del 85 % de la lógica permanece en el archivo monolítico.
4. **Impacto**: Alto riesgo de regresiones cruzadas al modificar cualquier regla de Extrusión o Telares; alta probabilidad de conflictos de merge en Git entre desarrolladores; dificultad extrema para realizar pruebas unitarias aisladas sin mockear decenas de modelos Sequelize.
5. **Nivel de riesgo**: **CRÍTICO**
6. **Recomendación**: Descomponer cada servicio monolítico en sub-servicios de dominio cohesivos y repositorios de acceso a datos (por ejemplo, en Extrusión: `extrusionSilo.service.js`, `extrusionMixing.service.js`, `extrusionQueue.service.js`, `extrusionRackPti.service.js`, `extrusionShift.service.js`, `extrusionScrap.service.js`, `extrusionReport.service.js`), manteniendo una fachada compatible en `extrusion.service.js` durante la transición.
7. **Dependencias afectadas**: `extrusion.controller.js`, `telares.controller.js`, `traceability.controller.js`, `warehouse.controller.js`, y las suites en `backend/test/*.local.integration.test.js`.
8. **Prioridad para la futura reestructuración**: **P1 — Alta**

---

### Hallazgo B-02: Consultas a Base de Datos y Lógica de Dominio dentro de Controladores
1. **Ubicación exacta**: **18 controladores** identificados mediante análisis estático:
   - [`backend/src/modules/extrusion/extrusion.controller.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/modules/extrusion/extrusion.controller.js) (**851 líneas**)
   - [`backend/src/modules/warehouse/warehouse.controller.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/modules/warehouse/warehouse.controller.js) (**284 líneas**)
   - [`backend/src/modules/warehouse/consumptionOrder.controller.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/modules/warehouse/consumptionOrder.controller.js) (**239 líneas**)
   - [`backend/src/modules/scrap/scrap.controller.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/modules/scrap/scrap.controller.js) (**162 líneas**)
   - 14 controladores de catálogos en `backend/src/modules/materials/*/*.controller.js` y `backend/src/modules/catalogs/*/*.controller.js`.
2. **Evidencia encontrada**: En `extrusion.controller.js` y `warehouse.controller.js` se invocan métodos de modelos o se construyen filtros de persistencia y transformaciones de negocio directamente en la capa HTTP, además de superar las 850 líneas en un solo controlador.
3. **Problema arquitectónico**: Ruptura de la separación Controlador $\rightarrow$ Servicio $\rightarrow$ Acceso a Datos (Modelo/Repositorio). En MVC estricto, el controlador solo debe extraer parámetros de `req`, delegar al servicio/caso de uso y formatear la respuesta HTTP (`res`).
4. **Impacto**: Reglas de negocio que solo se ejecutan cuando se invoca el endpoint HTTP pero se omiten cuando otro servicio interno o prueba de integración llama directamente a la capa de servicios.
5. **Nivel de riesgo**: **ALTO**
6. **Recomendación**: Adelgazar los controladores a un máximo de 150-200 líneas, moviendo toda consulta Sequelize y validación de estado hacia la capa de servicios.
7. **Dependencias afectadas**: `extrusion.controller.js`, `warehouse.controller.js`, `consumptionOrder.controller.js`.
8. **Prioridad para la futura reestructuración**: **P1 — Alta**

---

### Hallazgo B-03: Registro Monolítico de Modelos y Definición Inline en `database/models/index.js`
1. **Ubicación exacta**: [`backend/src/database/models/index.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/database/models/index.js#L1-L1014) (**1,015 líneas**)
2. **Evidencia encontrada**:
   - El archivo importa e inicializa manualmente **77 modelos Sequelize** y define cientos de asociaciones (`belongsTo`, `hasMany`, `belongsToMany`) en un solo bloque secuencial.
   - En las **líneas 665-674**, el modelo `db.ExtrusionProductionAdjustment` se define **inline** con `sequelize.define(...)` directamente dentro de `database/models/index.js` en lugar de tener su propio archivo `extrusionProductionAdjustment.model.js` en `backend/src/modules/extrusion/models/`.
   - Coexisten dos convenciones de asociaciones: algunos modelos implementan `Model.associate(db)` (líneas 233-237: `MaterialCode`, `MaterialFamily`, `MaterialBrand`, `MaterialType`, `Location`, `Material`, `MaterialUnit`, `WipInventory`, `Tag`), mientras que los 68 modelos restantes declaran sus relaciones de forma imperativa dentro de `index.js`.
   - En las **líneas 191-196 y 302-305**, existen asociaciones duplicadas (por ejemplo, `db.TraceabilityEvent.belongsTo(db.User, { foreignKey: 'performed_by', as: 'performedByUser' })` en línea 218 y nuevamente `as: 'user'` en línea 302).
3. **Problema arquitectónico**: Acoplamiento centralizado extremo. Cualquier cambio en un modelo de un módulo requiere editar un archivo global de 1,015 líneas.
4. **Impacto**: Dificultad para cargar modelos por dominio, riesgo de errores de orden de inicialización de claves foráneas y violación de encapsulamiento modular.
5. **Nivel de riesgo**: **ALTO**
6. **Recomendación**: Extraer `ExtrusionProductionAdjustment` a `backend/src/modules/extrusion/models/extrusionProductionAdjustment.model.js`, estandarizar el método `associate(db)` por módulo (ej. `modules/<modulo>/models/associations.js`) y reducir `database/models/index.js` a un orquestador limpio de <150 líneas.
7. **Dependencias afectadas**: `backend/src/database/models/index.js` y los 77 modelos registrados.
8. **Prioridad para la futura reestructuración**: **P1 — Alta**

---

### Hallazgo B-04: Escritura Síncrona de Archivos en Disco dentro de Middlewares HTTP Activos
1. **Ubicación exacta**:
   - [`backend/src/middlewares/error.middleware.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/middlewares/error.middleware.js#L8) (línea 8)
   - [`backend/src/middlewares/validation.middleware.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/middlewares/validation.middleware.js#L16) (línea 16)
   - [`backend/src/middlewares/errorHandler.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/middlewares/errorHandler.js#L6) (línea 6 — archivo huérfano)
2. **Evidencia encontrada**:
   - `error.middleware.js` ejecuta `fs.appendFileSync('error_log.txt', ...)` bloqueando el Event Loop de Node.js en cada error HTTP y escribiendo en una ruta relativa al `process.cwd()` (lo que generó `backend/error_log.txt` de **17.56 MB** y `error_log.txt` en la raíz).
   - `validation.middleware.js` ejecuta `require('fs').writeFileSync('validation_error.txt', JSON.stringify(errors, null, 2))` en cada error HTTP 400 de validación Joi.
3. **Problema arquitectónico**: Anti-patrón severo en Node.js/Express: bloqueo síncrono de E/S en el ciclo de petición-respuesta, contaminación del árbol de trabajo de Git con archivos rastreados modificados (`M backend/error_log.txt`) e incompatibilidad con entornos cloud/contenedores de solo lectura o efímeros (UAT / Producción).
4. **Impacto**: Degradación de latencia bajo concurrencia, crecimiento ilimitado de disco (`17.56 MB` acumulados en repositorio Git) y exposición potencial de trazas internas en disco.
5. **Nivel de riesgo**: **ALTO**
6. **Recomendación**: Reemplazar `fs.appendFileSync` / `fs.writeFileSync` por un logger estructurado asíncrono a `stdout`/`stderr` (o `pino`/`winston` con rotación fuera del árbol Git en desarrollo y salida estándar JSON en UAT/Producción).
7. **Dependencias afectadas**: `backend/src/middlewares/error.middleware.js`, `backend/src/middlewares/validation.middleware.js`.
8. **Prioridad para la futura reestructuración**: **P0 — Inmediata**

---

### Hallazgo B-05: Dualidad de Librerías de Validación (Joi vs. Zod), Respuestas HTTP y Middlewares de Error
1. **Ubicación exacta**:
   - **Validadores Joi (11 archivos)**: `auth.validator.js`, `formulas.validator.js`, `processPreparation.validator.js`, `materials.validator.js`, `processRun.validator.js`, `processRunTelares.validator.js`, `qrcodes.validator.js`, `roles.validator.js`, `scrap.validator.js`, `users.validator.js`, `warehouse.validator.js` (consumidos con `backend/src/middlewares/validation.middleware.js`).
   - **Esquemas Zod (14 archivos)**: `backend/src/modules/materials/*/*.schema.js`, `backend/src/modules/catalogs/*/*.schema.js` y `backend/src/modules/reception/dto/reception.dto.js` (consumidos con `backend/src/middlewares/validateRequest.js`).
   - **Respuestas HTTP duplicadas**: [`backend/src/shared/responses/apiResponse.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/shared/responses/apiResponse.js) (`successResponse`, `errorResponse`) vs. [`backend/src/utils/apiResponse.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/utils/apiResponse.js) (`sendSuccess`, `sendCreated`, `sendError`, `sendPaginated`).
   - **Middlewares de error duplicados**: [`backend/src/middlewares/error.middleware.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/middlewares/error.middleware.js) (montado en `app.js`) vs. [`backend/src/middlewares/errorHandler.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/middlewares/errorHandler.js) (huérfano).
   - **Utilidades de paginación duplicadas**: `backend/src/shared/utils/pagination.js` vs. `backend/src/utils/pagination.js`.
2. **Evidencia encontrada**: `backend/package.json` instala tanto `"joi": "^18.2.3"` como `"zod": "^4.4.3"`. Además, módulos complejos recientes (`extrusion`, `telares`, `laminado`, `globo`, `corte`) realizan gran parte de sus validaciones manualmente con condicionales `if (!...)` dentro de los servicios en lugar de usar schemas declarativos en las rutas.
3. **Problema arquitectónico**: Inconsistencia de contratos de entrada/salida entre endpoints y duplicación de infraestructura transversal (`src/shared/` vs `src/utils/`).
4. **Impacto**: Mayor curva de mantenimiento, respuestas de error con estructura ligeramente distinta según el módulo invocado y peso innecesario de dependencias.
5. **Nivel de riesgo**: **MEDIO**
6. **Recomendación**: Estandarizar en una sola librería de validación (preferiblemente **Zod**, alineado con el mandato tecnológico del Frontend) o mantener un único adaptador `validateRequest` que soporte ambos durante la migración; unificar `src/shared/responses/apiResponse.js` y `src/utils/apiResponse.js`.
7. **Dependencias afectadas**: Todos los archivos `*.routes.js`, `*.validator.js` y `*.schema.js`.
8. **Prioridad para la futura reestructuración**: **P2 — Media**

---

### Hallazgo B-06: Módulos Huérfanos e Imports Rotos en `backend/src/` (46 archivos sin referencias entrantes)
1. **Ubicación exacta**:
   - **Subcatálogos huérfanos con imports rotos**:
     - `backend/src/modules/catalogs/storageLocation/storageLocation.routes.js` $\rightarrow$ importa `../../../middlewares/auth` (**NO EXISTE**, el archivo real es `auth.middleware.js`).
     - `backend/src/modules/catalogs/storageLocationStatus/storageLocationStatus.routes.js` $\rightarrow$ importa `../../../middlewares/auth` (**NO EXISTE**).
     - `backend/src/modules/catalogs/storageLocationType/storageLocationType.routes.js` $\rightarrow$ importa `../../../middlewares/auth` (**NO EXISTE**).
     - `backend/src/modules/catalogs/warehouse/warehouse.routes.js` $\rightarrow$ importa `../../../middlewares/auth` (**NO EXISTE**).
     - `backend/src/modules/catalogs/supplier/supplier.routes.js` (línea 4, comentario/código) $\rightarrow$ referencia `../../../middleware/validateRequest` (singular `middleware` en vez de `middlewares`).
   - **Módulos completos no montados en `routes/index.js` ni en `database/models/index.js`**:
     - `backend/src/modules/intermediate/*` (`intermediate.routes.js`, `intermediate.controller.js`, `intermediate.service.js`, `intermediateMaterial.model.js`, `intermediateStock.model.js`, `intermediateStockMovement.model.js`, `storageRack.model.js`).
     - `backend/src/modules/processes/*` (`processRun.routes.js`, `processRunTelares.routes.js`, `processRun.model.js`, `processRunInput.model.js`, `processRunOutput.model.js`, `processOutputItem.model.js`).
     - `backend/src/modules/scrap/*` (`scrap.routes.js`, `scrap.dashboard.routes.js`, `scrap.report.routes.js`, `scrap.service.js`, `scrapCatalog.model.js`, `scrapContainer.model.js`, `scrapContainerStock.model.js`, `scrapMovement.model.js`, `scrapStockMovement.model.js`, `scrapType.model.js`).
     - Modelos sueltos no registrados en `database/models/index.js`: `extrusion/models/extrusionPtiSaleExit.model.js`, `extrusion/models/extrusionPtiWarehouseTransfer.model.js`, `materials/materialCategory.model.js`, `materials/materialSubcategory.model.js`, `materials/operationalArea.model.js`, `qrcodes/qrEvent.model.js`, `warehouse/stockUnit.model.js`, `waste/wasteReason.model.js` (1 línea vacía).
2. **Evidencia encontrada**: El análisis del grafo de dependencias desde `backend/src/server.js` y `backend/src/database/models/index.js` demuestra que estos **46 archivos** tienen `0` referencias entrantes desde el sistema en ejecución.
3. **Problema arquitectónico**: Código muerto o de iteraciones previas (reemplazado posteriormente por `modules/extrusion`, `modules/telares`, `modules/wip`) que permanece mezclado con los módulos productivos activos.
4. **Impacto**: Confusión severa para los desarrolladores sobre qué modelo o servicio representa la fuente de verdad (por ejemplo, `modules/scrap/*` inactivo vs `extrusionScrapLog.model.js`, `telaresScrapLog.model.js` y `areaProcessScrapLog.model.js` activos; o `modules/processes/*` inactivo vs `loomRun.model.js` activo).
5. **Nivel de riesgo**: **ALTO**
6. **Recomendación**: Confirmar con el líder funcional el retiro definitivo de los módulos legados no montados (`intermediate`, `processes`, `scrap` legado, `catalogs/storageLocation*`) y eliminarlos en la fase de reestructuración MVC.
7. **Dependencias afectadas**: Ninguna en el runtime activo (0 referencias entrantes desde `server.js`), únicamente scripts manuales antiguos en `backend/test-*.js` (`test-audit.js`, `test-concurrency.js`, `test-core-integrity.js`, `test-dashboard.js`, `test-events.js`, `test-production-integration.js`, `test-report.js`, `test-warehouse-integration.js`).
8. **Prioridad para la futura reestructuración**: **P1 — Alta**

---

### Hallazgo B-07: Uso de Consultas SQL Crudas (`sequelize.query`) y Verificaciones DDL en Tiempo de Ejecución
1. **Ubicación exacta**:
   - [`backend/src/modules/extrusion/extrusion.service.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/modules/extrusion/extrusion.service.js)
   - [`backend/src/modules/extrusion/services/queueOutputSnapshot.service.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/modules/extrusion/services/queueOutputSnapshot.service.js)
   - [`backend/src/modules/telares/telares.service.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/modules/telares/telares.service.js)
   - [`backend/src/modules/warehouse/warehouse.service.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/modules/warehouse/warehouse.service.js)
   - [`backend/src/modules/warehouse/warehouseReport.service.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/modules/warehouse/warehouseReport.service.js)
   - [`backend/src/modules/dashboard/dashboard.service.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/modules/dashboard/dashboard.service.js)
   - [`backend/src/modules/qrcodes/qrcodes.service.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/modules/qrcodes/qrcodes.service.js)
2. **Evidencia encontrada**: Servicios de negocio ejecutan `sequelize.query(...)` e incluso inspeccionan `information_schema.columns` o `getQueryInterface().describeTable(...)` durante peticiones HTTP para tolerar migraciones pendientes o crear tablas/columnas al vuelo.
3. **Problema arquitectónico**: Mezcla de lógica de aplicación con gestión de esquema DDL y consultas SQL embebidas en servicios de negocio sin capa de Repositorio/Query Builder dedicada.
4. **Impacto**: Sobrecarga de consultas de metadatos a PostgreSQL y posible divergencia entre el esquema real en base de datos y el historial oficial en `sequelize_meta`.
5. **Nivel de riesgo**: **MEDIO**
6. **Recomendación**: Encapsular las consultas SQL complejas de reportes/agregaciones en clases `Repository` o `*Query.repository.js` con parámetros enlazados (`replacements` / `bind`), y garantizar por pipeline CI/CD que todas las migraciones corran antes del arranque del servidor para eliminar las verificaciones DDL en tiempo de ejecución.
7. **Dependencias afectadas**: Servicios de Extrusión, Telares, Almacén y Dashboard.
8. **Prioridad para la futura reestructuración**: **P2 — Media**

---

## 4. Hallazgos Arquitectónicos del Frontend (React + Vite + TypeScript)

### Hallazgo F-01: Coexistencia de Arquitectura Activa con Capa Experimental DDD/CQRS Rota (25 Imports No Resueltos y 82 Archivos Huérfanos)
1. **Ubicación exacta**:
   - [`frontend/src/core/api/apiClient.ts`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/frontend/src/core/api/apiClient.ts#L3-L5) (imports comentados a `idempotency.interceptor`, `retry.interceptor`, `error.interceptor` inexistentes).
   - [`frontend/src/design-system/components/scanner-overlay/ScannerOverlay.jsx`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/frontend/src/design-system/components/scanner-overlay/ScannerOverlay.jsx) $\rightarrow$ importa `../button/PrimitiveButton` (**NO EXISTE**).
   - [`frontend/src/modules/catalogs/services/catalogsApi.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/frontend/src/modules/catalogs/services/catalogsApi.js) $\rightarrow$ importa `@/lib/api` (**NO EXISTE**).
   - **17 archivos TypeScript en las subcarpetas DDD `domain/`, `application/`, `infrastructure/`** de `frontend/src/modules/identity/`, `frontend/src/modules/production/` y `frontend/src/modules/warehouse/` que importan módulos inexistentes como:
     - `frontend/src/shared/domain/events/DomainEventBusPort` (no existe)
     - `frontend/src/modules/catalog/domain/valueObjects/UnitOfMeasure` (no existe)
     - `frontend/src/modules/warehouse/catalog/domain/valueObjects/UnitOfMeasure` (no existe)
     - `frontend/src/modules/identity/application/valueObjects/CustodyValueObjects` (no existe)
     - `frontend/src/modules/identity/domain/policies/authorization/IdentityToken` (no existe)
   - Además, existen dos puntos de entrada duplicados y no utilizados: [`frontend/src/App.jsx`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/frontend/src/App.jsx) y [`frontend/src/app/App.jsx`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/frontend/src/app/App.jsx) (el punto de entrada real en `main.jsx` monta directamente `<RouterProvider router={router} />` desde `frontend/src/app/router.jsx`).
2. **Evidencia encontrada**: `vite build` solo tiene éxito porque Rollup/Vite parte de `index.html` $\rightarrow$ `src/main.jsx` $\rightarrow$ `src/app/router.jsx` y nunca recorre los **82 archivos huérfanos**. Sin embargo, si se ejecuta `tsc --noEmit` sobre todo `src/`, esos archivos huérfanos fallan por imports inexistentes (violación latente de la **Regla de Oro #7: Build Integrity**).
3. **Problema arquitectónico**: Sobrecarga arquitectónica (sobreingeniería DDD en cliente con Ports, Adapters, Repositories in-memory, ValueObjects y Aggregates que no se usan en la UI real) coexistiendo con la arquitectura real basada en `services/*Api.ts` + hooks de TanStack Query + `presentation/pages/*`.
4. **Impacto**: Confusión severa en el equipo, incumplimiento de `tsc --noEmit` global y presencia de 82 archivos muertos en `frontend/src/`.
5. **Nivel de riesgo**: **ALTO**
6. **Recomendación**: Aislar o depurar los archivos huérfanos con imports rotos de las carpetas `domain/application/infrastructure` que no estén conectados al Runtime ni a `router.jsx`, conservando únicamente el Runtime activo (`src/core/platform/*`, `src/core/runtime/*`) que sí está validado por Vitest.
7. **Dependencias afectadas**: `frontend/tsconfig.json` y los 82 archivos listados en `frontendOrphans`.
8. **Prioridad para la futura reestructuración**: **P1 — Alta**

---

### Hallazgo F-02: Componentes de Página y Formularios Excesivamente Grandes (>1,000 a 2,524 Líneas) con Lógica Operativa Local
1. **Ubicación exacta**:
   - [`frontend/src/modules/production/presentation/components/MixingTerminalForm.tsx`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/frontend/src/modules/production/presentation/components/MixingTerminalForm.tsx) (**2,524 líneas / 152 KB**)
   - [`frontend/src/modules/telares/presentation/pages/TelaresCatalogPage.tsx`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/frontend/src/modules/telares/presentation/pages/TelaresCatalogPage.tsx) (**2,307 líneas / 136 KB**)
   - [`frontend/src/modules/extrusion/presentation/presenters/PtiIngressPresenter.tsx`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/frontend/src/modules/extrusion/presentation/presenters/PtiIngressPresenter.tsx) (**1,909 líneas / 109 KB**)
   - [`frontend/src/modules/telares/presentation/pages/TelaresTerminalPage.tsx`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/frontend/src/modules/telares/presentation/pages/TelaresTerminalPage.tsx) (**1,804 líneas / 123 KB**)
   - [`frontend/src/modules/production/presentation/pages/ExtrusionTerminalPage.tsx`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/frontend/src/modules/production/presentation/pages/ExtrusionTerminalPage.tsx) (**1,591 líneas / 80 KB**)
   - [`frontend/src/modules/warehouse/presentation/pages/SilosManagementPage.tsx`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/frontend/src/modules/warehouse/presentation/pages/SilosManagementPage.tsx) (**1,478 líneas / 76 KB**)
   - [`frontend/src/modules/production/presentation/pages/FormulasPage.tsx`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/frontend/src/modules/production/presentation/pages/FormulasPage.tsx) (**1,439 líneas / 87 KB**)
   - [`frontend/src/modules/warehouse/presentation/components/CreateConsumptionOrderModal.tsx`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/frontend/src/modules/warehouse/presentation/components/CreateConsumptionOrderModal.tsx) (**1,349 líneas / 67 KB**)
   - [`frontend/src/modules/warehouse/presentation/pages/WarehouseReportsPage.tsx`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/frontend/src/modules/warehouse/presentation/pages/WarehouseReportsPage.tsx) (**1,088 líneas / 61 KB**)
   - [`frontend/src/modules/telares/presentation/pages/TelaresDashboard.tsx`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/frontend/src/modules/telares/presentation/pages/TelaresDashboard.tsx) (**1,004 líneas / 62 KB**)
2. **Evidencia encontrada**: 10 componentes superan las 1,000 líneas (y 48 superan las 400 líneas), mezclando decenas de estados `useState`, transformaciones de datos, cálculos de interfaz, modales anidados y llamadas a mutaciones en un solo archivo.
3. **Problema arquitectónico**: Tensión directa con las **Reglas de Oro #1, #2, #13, #14 y #20** (`AGENTS.md`), que establecen que las vistas y workspaces deben ser consumidores ligeros del estado del backend y del Runtime, sin concentrar orquestación compleja ni cálculos locales.
4. **Impacto**: Dificultad para mantener la legibilidad en planta ("regla de los 5 segundos para un operador de 55 años"), re-renderizados costosos en tablets/terminales industriales y alta complejidad cognitiva.
5. **Nivel de riesgo**: **ALTO**
6. **Recomendación**: Dividir cada página >800 líneas en sub-componentes presentacionales puros (`presenters/`), contenedores de estado (`containers/`) y hooks de consulta/mutación (`hooks/use*Queries.ts` separados de `hooks/use*Mutations.ts` según el mandato de TanStack Query).
7. **Dependencias afectadas**: Módulos `production`, `extrusion`, `telares` y `warehouse` en `frontend/src/modules/`.
8. **Prioridad para la futura reestructuración**: **P2 — Media**

---

### Hallazgo F-03: Bundle Monolítico sin Code-Splitting en `router.jsx` y Dualidad de Clientes HTTP / Módulos
1. **Ubicación exacta**:
   - [`frontend/src/app/router.jsx`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/frontend/src/app/router.jsx#L1-L81) (**527 líneas**)
   - Clientes HTTP: [`frontend/src/core/api/apiClient.ts`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/frontend/src/core/api/apiClient.ts) vs. [`frontend/src/api/axios.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/frontend/src/api/axios.js) (o instancias Axios directas en servicios).
   - Módulos divididos en dos carpetas: `frontend/src/modules/production/` (contiene `ExtrusionDashboard.tsx`, `ExtrusionTerminalPage.tsx`, `MixingTerminalPage.tsx`, `FormulasPage.tsx`, `MachinesPage.tsx`) vs. `frontend/src/modules/extrusion/` (contiene `ExtrusionBoardContainer.tsx`, `PtiIngressContainer.tsx`, `ExtrusionShiftPage.tsx`, `ExtrusionScrapControlPage.tsx`, `ExtrusionReportsPage.tsx`, `ExtrusionWipInventoryPage.tsx`).
   - De igual forma coexisten `frontend/src/modules/identity/` y `frontend/src/modules/qrcodes/`, así como `frontend/src/providers/AppQueryProvider.jsx` (huérfano) y `frontend/src/core/query/providers/QueryProvider.tsx` (activo).
2. **Evidencia encontrada**: `vite build` genera un único chunk JavaScript de **3,708.96 kB (971.71 kB gzip)** porque las 55 páginas de `router.jsx` se importan de forma síncrona al inicio.
3. **Problema arquitectónico**: Carga inicial pesada en dispositivos móviles/tablets de piso de planta (conectados por Wi-Fi industrial) y dispersión del dominio de Extrusión entre `modules/production/` y `modules/extrusion/`.
4. **Impacto**: Mayor tiempo de arranque inicial (TTI) en terminales de planta y duplicación de tipos/servicios entre `production` y `extrusion`.
5. **Nivel de riesgo**: **MEDIO**
6. **Recomendación**: Implementar `React.lazy()` + `<Suspense>` por dominio en `router.jsx` y consolidar todas las vistas de Extrusión bajo `frontend/src/modules/extrusion/` durante la reestructuración controlada.
7. **Dependencias afectadas**: `frontend/src/app/router.jsx`, `frontend/src/modules/production/*`, `frontend/src/modules/extrusion/*`.
8. **Prioridad para la futura reestructuración**: **P2 — Media**
