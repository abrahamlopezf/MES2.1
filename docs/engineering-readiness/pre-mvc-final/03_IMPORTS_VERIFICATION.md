# 03 — VERIFICACIÓN Y RESOLUCIÓN DOCUMENTAL DE LOS 24 IMPORTS NO RESUELTOS (FASE C)

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha:** 2026-11-26  
**Referencia Previa:** [`../closure-audit/03_DEPENDENCY_ANALYSIS.md`](../closure-audit/03_DEPENDENCY_ANALYSIS.md)

---

## 1. Contraste entre el Escáner Estático y los Mecanismos Reales de Resolución (Node.js, Vite y TypeScript)

Durante la Fase de Cierre anterior se eliminaron **35 de los 59 imports no resueltos** al retirar los scripts experimentales `.codex-*.cjs` (`22`), `generate_catalogs.js` (`8`), `generate_seeders_from_text.js` (`1`) y `update-models.js` (`4`).

Para los **24 imports restantes**, se contrastó el resultado del escáner léxico/estático contra la resolución real en tiempo de ejecución y compilación:
1. **Resolución de CommonJS en Node.js (`backend/src/server.js` $\rightarrow$ `app.js` $\rightarrow$ `routes/index.js` y `database/models/index.js`):**
   - Al cargar en vivo `require('./backend/src/app')` y `require('./backend/src/database/models')`, Node.js resuelve el **100% de los módulos del grafo activo (`0` errores `MODULE_NOT_FOUND`)**.
2. **Resolución de Rollup / Vite (`npm --prefix frontend run build` — `vite.config.js`):**
   - Al transformar los **1,863 módulos** alcanzables desde `frontend/index.html` $\rightarrow$ `frontend/src/main.jsx` $\rightarrow$ `frontend/src/app/router.jsx` (incluyendo los alias `@`, `@app`, `@core`, `@shared`, `@modules`), Vite resuelve el **100% del grafo activo (`0` errores de importación)**.
3. **Resolución de Vitest (`npm --prefix frontend run test -- --run`):**
   - Las **11 suites activas** (`31` pruebas) cargan y resuelven el **100% de sus dependencias (`0` errores de importación)**.

> [!IMPORTANT]
> **Meta de la Fase C Alcanzada:** Existen **CERO (`0`) imports rotos en el grafo activo de ejecución y compilación** tanto de Backend como de Frontend.

---

## 2. Clasificación Técnica Individual de las 24 Referencias Restantes

Sin manipular la metodología del escáner, cada una de las 24 referencias reportadas por el análisis estático sobre la totalidad de archivos en `src/` se clasifica a continuación en las categorías exigidas por la Fase C:

### 2.1Resumen por Categoría de Resolución

| Categoría (Fase C) | Cantidad | ¿Afecta Grafo Activo? | Explicación Técnica |
| :--- | :---: | :---: | :--- |
| **1. Imports Activos Rotos** | **`0`** | **No (`0`)** | Ningún archivo ejecutado por el servidor Express ni compilado por Vite contiene un import roto. |
| **2. Falsos Positivos del Escáner / Imports Comentados** | **`4`** | **No** | Líneas comentadas con `//` (`1` en `supplier.routes.js` y `3` en `apiClient.ts`) que el analizador léxico por expresiones regulares capturó sin descartar comentarios de línea. |
| **3. Imports en Archivos Huérfanos de Backend (Referencias Obsoletas)** | **`4`** | **No** | `4` archivos `*.routes.js` no montados en `routes/index.js` dentro de `backend/src/modules/catalogs/` que apuntan a `../../../middlewares/auth` en lugar de `auth.middleware.js`. |
| **4. Imports en Archivos Huérfanos de Frontend (Dependencias Realmente Inexistentes en Capas DDD Incompletas)** | **`16`** | **No** | `16` imports en archivos huérfanos no importados por `router.jsx` que apuntan a ValueObjects o Ports (`UnitOfMeasure`, `DomainEventBusPort`, `PrimitiveButton`, etc.) que nunca fueron creados. |
| **TOTAL** | **`24`** | **`0` en Grafo Activo** | **100% Clasificado y Justificado** |

---

### 2.2 Tabla Detallada de los 24 Casos

| # | Archivo Origen (`src/`) | Cadena Importada | Categoría Exacta (Fase C) | ¿Alcanzable desde Entrypoint? | Acción para la Etapa de Refactorización MVC |
| :---: | :--- | :--- | :--- | :---: | :--- |
| 1 | `backend/src/modules/catalogs/supplier/supplier.routes.js` (línea 4) | `../../../middleware/validateRequest` | **Import Comentado / Falso Positivo del Escáner** (`// const validateRequest = require(...)`) | Sí (`/api/suppliers` está activo y funciona) | Eliminar la línea comentada en la **Unidad MVC 1**. |
| 2 | `frontend/src/core/api/apiClient.ts` (línea 4) | `./interceptors/idempotency.interceptor` | **Import Comentado / Falso Positivo del Escáner** (`// import ...`) | Sí (`apiClient.ts` está activo y compila) | Eliminar comentario o implementar interceptor en Refactor Frontend. |
| 3 | `frontend/src/core/api/apiClient.ts` (línea 5) | `./interceptors/retry.interceptor` | **Import Comentado / Falso Positivo del Escáner** (`// import ...`) | Sí (`apiClient.ts` está activo y compila) | Eliminar comentario o implementar interceptor en Refactor Frontend. |
| 4 | `frontend/src/core/api/apiClient.ts` (línea 6) | `./interceptors/error.interceptor` | **Import Comentado / Falso Positivo del Escáner** (`// import ...`) | Sí (`apiClient.ts` está activo y compila) | Eliminar comentario o implementar interceptor en Refactor Frontend. |
| 5 | `backend/src/modules/catalogs/storageLocation/storageLocation.routes.js` | `../../../middlewares/auth` | **Import de Archivo Huérfano / Referencia Obsoleta** | No (No montado en `routes/index.js`) | Retirar submódulo duplicado `catalogs/storageLocation/` en **Unidad MVC 1**. |
| 6 | `backend/src/modules/catalogs/storageLocationStatus/storageLocationStatus.routes.js` | `../../../middlewares/auth` | **Import de Archivo Huérfano / Referencia Obsoleta** | No (No montado en `routes/index.js`) | Retirar submódulo duplicado `catalogs/storageLocationStatus/` en **Unidad MVC 1**. |
| 7 | `backend/src/modules/catalogs/storageLocationType/storageLocationType.routes.js` | `../../../middlewares/auth` | **Import de Archivo Huérfano / Referencia Obsoleta** | No (No montado en `routes/index.js`) | Retirar submódulo duplicado `catalogs/storageLocationType/` en **Unidad MVC 1**. |
| 8 | `backend/src/modules/catalogs/warehouse/warehouse.routes.js` | `../../../middlewares/auth` | **Import de Archivo Huérfano / Referencia Obsoleta** | No (No montado en `routes/index.js`) | Retirar submódulo duplicado `catalogs/warehouse/` en **Unidad MVC 1**. |
| 9 | `frontend/src/design-system/components/scanner-overlay/ScannerOverlay.jsx` | `../button/PrimitiveButton` | **Import de Archivo Huérfano / Referencia Obsoleta** | No (El componente activo es `CameraScanner.jsx`) | Retirar `ScannerOverlay.jsx` en limpieza de UI del Refactor Frontend. |
| 10 | `frontend/src/modules/catalogs/services/catalogsApi.js` | `../../../lib/api` | **Import de Archivo Huérfano / Referencia Obsoleta** | No (`0` consumidores activos) | Retirar o redirigir a `api/axiosClient.js` en Refactor Frontend. |
| 11 | `frontend/src/modules/identity/application/commands/TransferCustodyCommands.ts` | `../valueObjects/CustodyValueObjects` | **Import de Archivo Huérfano / Dependencia Inexistente (DDD incompleto)** | No (`0` consumidores) | Limpiar archivos DDD incompletos de `modules/identity/` en Refactor Frontend. |
| 12 | `frontend/src/modules/identity/domain/policies/authorization/IdentityAuthorizationPolicies.ts` | `./IdentityToken` | **Import de Archivo Huérfano / Dependencia Inexistente (DDD incompleto)** | No (`0` consumidores) | Limpiar archivos DDD incompletos de `modules/identity/` en Refactor Frontend. |
| 13 | `frontend/src/modules/identity/domain/ports/IndustrialCodeGeneratorPort.ts` | `../../valueObjects/IdentityValueObjects` | **Import de Archivo Huérfano / Ruta Relativa Incorrecta** (el archivo existe en `../valueObjects/IdentityValueObjects.ts`) | No (`0` consumidores) | Corregir ruta relativa `../valueObjects/IdentityValueObjects` en Refactor Frontend. |
| 14 | `frontend/src/modules/identity/infrastructure/events/handlers/AuditIdentityGenerationHandler.ts` | `../events/IdentityDomainEvents` | **Import de Archivo Huérfano / Ruta Relativa Incorrecta** (existe en `../../../domain/events/IdentityDomainEvents.ts`) | No (`0` consumidores) | Corregir ruta relativa en Refactor Frontend. |
| 15 | `frontend/src/modules/production/application/handlers/ExecuteMixingHandler.ts` | `../../../../shared/domain/events/DomainEventBusPort` | **Import de Archivo Huérfano / Dependencia Inexistente (DDD incompleto)** | No (`0` consumidores) | Limpiar capa DDD incompleta en `modules/production/` durante Refactor Frontend. |
| 16 | `frontend/src/modules/production/application/handlers/StartProductionRunHandler.ts` | `../../../../shared/domain/events/DomainEventBusPort` | **Import de Archivo Huérfano / Dependencia Inexistente (DDD incompleto)** | No (`0` consumidores) | Limpiar capa DDD incompleta en `modules/production/` durante Refactor Frontend. |
| 17 | `frontend/src/modules/production/application/ports/WeightScalePort.ts` | `../domain/valueObjects/TransformationValueObjects` | **Import de Archivo Huérfano / Ruta Relativa Incorrecta** (existe en `../../domain/valueObjects/...`) | No (`0` consumidores) | Corregir ruta o retirar port huérfano en Refactor Frontend. |
| 18 | `frontend/src/modules/production/domain/entities/Rack.ts` | `../../../catalog/domain/valueObjects/UnitOfMeasure` | **Import de Archivo Huérfano / Dependencia Inexistente (DDD incompleto)** | No (`0` consumidores) | Limpiar capa DDD incompleta en `modules/production/` durante Refactor Frontend. |
| 19 | `frontend/src/modules/production/domain/valueObjects/TransformationValueObjects.ts` | `../../../catalog/domain/valueObjects/UnitOfMeasure` | **Import de Archivo Huérfano / Dependencia Inexistente (DDD incompleto)** | No (`0` consumidores) | Limpiar capa DDD incompleta en `modules/production/` durante Refactor Frontend. |
| 20 | `frontend/src/modules/production/engine/ProcessIO.ts` | `../../catalog/domain/valueObjects/UnitOfMeasure` | **Import de Archivo Huérfano / Dependencia Inexistente (DDD incompleto)** | No (`0` consumidores) | Limpiar capa DDD incompleta en `modules/production/` durante Refactor Frontend. |
| 21 | `frontend/src/modules/warehouse/application/dto/WarehouseDTOs.ts` | `../catalog/domain/valueObjects/UnitOfMeasure` | **Import de Archivo Huérfano / Dependencia Inexistente (DDD incompleto)** | No (`0` consumidores) | Limpiar capa DDD incompleta en `modules/warehouse/` durante Refactor Frontend. |
| 22 | `frontend/src/modules/warehouse/application/handlers/RegisterMaterialEntryHandler.ts` | `../../../../shared/domain/events/DomainEventBusPort` | **Import de Archivo Huérfano / Dependencia Inexistente (DDD incompleto)** | No (`0` consumidores) | Limpiar capa DDD incompleta en `modules/warehouse/` durante Refactor Frontend. |
| 23 | `frontend/src/modules/warehouse/domain/events/WarehouseEvents.ts` | `../catalog/domain/valueObjects/UnitOfMeasure` | **Import de Archivo Huérfano / Dependencia Inexistente (DDD incompleto)** | No (`0` consumidores) | Limpiar capa DDD incompleta en `modules/warehouse/` durante Refactor Frontend. |
| 24 | `frontend/src/modules/warehouse/domain/valueObjects/WarehouseValueObjects.ts` | `../catalog/domain/valueObjects/UnitOfMeasure` | **Import de Archivo Huérfano / Dependencia Inexistente (DDD incompleto)** | No (`0` consumidores) | Limpiar capa DDD incompleta en `modules/warehouse/` durante Refactor Frontend. |

*(En cumplimiento de la Restricción Absoluta #3 — "No modificar controladores, modelos, servicios, rutas ni componentes React" — no se retiraron ni editaron archivos dentro de `backend/src/modules/` ni `frontend/src/modules/` durante esta fase).*
