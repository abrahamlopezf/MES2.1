# 11 — MAPA EXACTO DE MIGRACIÓN, CONSERVACIÓN Y DIVISIÓN DE ARCHIVOS POR UNIDAD MVC (FASE J)

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha:** 2026-11-26  
**Estado:** **Diseño Definitivo — Ningún movimiento o edición ha sido ejecutado todavía.**

---

## 1. Mapa de Movimientos y Ediciones de la Unidad MVC 1 (Primera Unidad Propuesta — Riesgo Bajo)

**Objetivo de la Unidad MVC 1:**
1. Eliminar el acceso directo a modelos Sequelize en los controladores de **Catálogos, Áreas, Usuarios, Roles, Permisos, Dashboard y Reportes**, trasladando cualquier consulta ORM residual hacia sus respectivos servicios (`*.service.js`).
2. Retirar del módulo `backend/src/modules/catalogs/` los 4 submódulos huérfanos no montados (`storageLocation`, `storageLocationStatus`, `storageLocationType`, `warehouse`) y limpiar la línea comentada en `supplier.routes.js`, eliminando **5 de los 24 imports no resueltos** del repositorio.

### 1.1 Archivos Exactos Involucrados en la Unidad MVC 1

| # | Ruta Exacta del Archivo | Acción en Unidad MVC 1 | Detalle Técnico y Contrato Protegido |
| :---: | :--- | :--- | :--- |
| 1 | `backend/src/modules/areas/areas.controller.js` | **Editar (Si contiene import ORM)** / **Verificar** | Garantizar `0` imports de `database/models` o `sequelize`; delegar 100% en `areas.service.js`. Contrato protegido: `/api/areas/*`. |
| 2 | `backend/src/modules/areas/areas.service.js` | **Editar (Solo si recibe método desde controller)** | Encapsular consultas de `Area` y `Subarea`. |
| 3 | `backend/src/modules/users/users.controller.js` | **Editar** | Eliminar cualquier llamada directa a `User`/`Role` y delegar en `users.service.js`. Contrato protegido: `/api/users/*`. |
| 4 | `backend/src/modules/users/users.service.js` | **Editar** | Recibir consultas trasladadas desde `users.controller.js`. |
| 5 | `backend/src/modules/roles/roles.controller.js` | **Editar** | Eliminar acceso directo a `Role`/`Permission` y delegar en `roles.service.js`. Contrato protegido: `/api/roles/*`. |
| 6 | `backend/src/modules/roles/roles.service.js` | **Editar** | Encapsular consultas y asignaciones de permisos dentro de `sequelize.transaction`. |
| 7 | `backend/src/modules/permissions/permissions.controller.js` | **Editar / Verificar** | Garantizar delegación total en `permissions.service.js`. Contrato protegido: `/api/permissions/*`. |
| 8 | `backend/src/modules/dashboard/dashboard.controller.js` | **Editar** | Trasladar consultas agregadas de `database/models` hacia `dashboard.service.js`. Contrato protegido: `/api/dashboard/*`. |
| 9 | `backend/src/modules/dashboard/dashboard.service.js` | **Editar** | Centralizar consultas de indicadores operativos y financieros. |
| 10 | `backend/src/modules/reports/reports.controller.js` | **Editar** | Trasladar consultas Sequelize hacia `reports.service.js`. Contrato protegido: `/api/reports/*`. |
| 11 | `backend/src/modules/reports/reports.service.js` | **Editar** | Recibir consultas trasladadas desde `reports.controller.js`. |
| 12 | `backend/src/modules/catalogs/supplier/supplier.routes.js` | **Editar (1 línea)** | Eliminar la línea 4 comentada (`// const validateRequest = require('../../../middleware/validateRequest');`). Contrato protegido: `/api/suppliers/*`. |
| 13–32 | `backend/src/modules/catalogs/storageLocation/*` (`5` archivos)<br>`backend/src/modules/catalogs/storageLocationStatus/*` (`5` archivos)<br>`backend/src/modules/catalogs/storageLocationType/*` (`5` archivos)<br>`backend/src/modules/catalogs/warehouse/*` (`5` archivos) | **Respaldar en bóveda y Retirar (`20` archivos huérfanos)** | Ninguno de estos 20 archivos está montado en `backend/src/routes/index.js` ni registrado en `backend/src/database/models/index.js` (el catálogo activo de localidades es `modules/materials/location/` y el módulo activo de almacén es `modules/warehouse/`). Su retiro elimina los 4 imports rotos restantes en `backend/src/`. |

---

## 2. Mapa de Archivos para las Unidades MVC 2 a 8 (Secuencia Posterior)

| Unidad MVC | Archivos Existentes que se Modifican (Se Conservarán como Fachadas) | Nuevos Archivos Objetivo que se Crearán (Por Extracción / División) | Archivos que NO deben Tocarse en esa Unidad |
| :--- | :--- | :--- | :--- |
| **Unidad MVC 2** (Modularización del Registro Central de Modelos) | - `backend/src/database/models/index.js` *(se reduce de `1,015` a `< 220` líneas conservando exactamente las `77` exportaciones)* | - `backend/src/database/models/associations/catalog.associations.js`<br>- `backend/src/database/models/associations/warehouse.associations.js`<br>- `backend/src/database/models/associations/extrusion.associations.js`<br>- `backend/src/database/models/associations/telares.associations.js`<br>- `backend/src/database/models/associations/laminado.associations.js`<br>- `backend/src/database/models/associations/corte.associations.js`<br>- `backend/src/database/models/associations/globo.associations.js`<br>- `backend/src/database/models/associations/traceability.associations.js` | Los `77` archivos `*.model.js` individuales y todos los módulos en `backend/src/modules/**`. |
| **Unidad MVC 3** (Desacoplamiento de Controladores Operativos Restantes) | - `*.controller.js` y `*.service.js` en: `auth`, `materials` (y subcatálogos), `warehouse`, `reception`, `formulas`, `qrcodes`, `traceability`, `extrusion`, `telares`, `laminado`, `corte`, `globo` | - Ningún archivo nuevo obligatorio (los métodos se mueven del `*.controller.js` al `*.service.js` existente de cada módulo).<br>- Nuevo test de arquitectura: `backend/test/mvcControllerIsolation.test.js` (verifica que `0` archivos `*.controller.js` importan `database/models` o `sequelize`). | Reglas de dominio (`*.rules.js`), modelos (`*.model.js`) y rutas (`*.routes.js`). |
| **Unidad MVC 4** (Alineación de Contratos Funcionales Confirmados por Producto) | - `backend/src/modules/telares/productionRules.js` y/o `backend/test/telares*.test.js` (`QA-TEL-ROUTE-001`)<br>- `backend/src/modules/warehouse/consumptionPackageAllocator.js` (`QA-ODC-PACK-001`)<br>- `backend/src/modules/corte/corte.service.js` y/o `backend/test/corteLaminadoFlow.local.integration.test.js` | - Casos de prueba unitarios y de integración actualizados según la respuesta oficial del Product Owner en `09_PRODUCT_OWNER_DECISIONS.md`. | Resto de módulos del sistema. |
| **Unidad MVC 5** (Descomposición por Fachada de `warehouse.service.js`) | - `backend/src/modules/warehouse/warehouse.service.js` *(queda como fachada re-exportadora)* | - `backend/src/modules/warehouse/services/warehouseInventory.service.js`<br>- `backend/src/modules/warehouse/services/warehouseSilo.service.js`<br>- `backend/src/modules/warehouse/services/warehouseAdjustment.service.js`<br>- `backend/src/modules/warehouse/repositories/warehouse.repository.js` | `consumptionOrder.service.js`, `consumptionPackageAllocator.js`, `warehouse.controller.js`, `warehouse.routes.js`. |
| **Unidad MVC 6** (Descomposición por Fachada de `traceability.service.js`) | - `backend/src/modules/traceability/traceability.service.js` *(queda como fachada re-exportadora)* | - `backend/src/modules/traceability/services/qrResolution.service.js`<br>- `backend/src/modules/traceability/services/genealogyGraph.service.js`<br>- `backend/src/modules/traceability/services/custodyMovement.service.js`<br>- `backend/src/modules/traceability/repositories/traceability.repository.js` | `traceability.controller.js`, `traceability.routes.js`, `qrTraceabilityTree.service.js`. |
| **Unidad MVC 7** (Descomposición por Fachada de `telares.service.js`) | - `backend/src/modules/telares/telares.service.js` *(queda como fachada re-exportadora)* | - `backend/src/modules/telares/services/telaresCatalogBom.service.js`<br>- `backend/src/modules/telares/services/telaresCreelWip.service.js`<br>- `backend/src/modules/telares/services/telaresLoomRun.service.js`<br>- `backend/src/modules/telares/services/telaresRollOutput.service.js`<br>- `backend/src/modules/telares/repositories/telares.repository.js` | `productionRules.js`, `telares.controller.js`, `telares.routes.js` y los 11 modelos de Telares. |
| **Unidad MVC 8 (Sub-pasos 8.1 a 8.6)** (Descomposición por Fachada de `extrusion.service.js`) | - `backend/src/modules/extrusion/extrusion.service.js` *(queda como fachada re-exportadora de `< 250` líneas al concluir el sub-paso 8.6)* | - `8.1:` `services/extrusionQueue.service.js`<br>- `8.2:` `services/extrusionTransfer.service.js`<br>- `8.3:` `services/extrusionShiftHandoff.service.js`<br>- `8.4:` `services/extrusionMixingConsumption.service.js`<br>- `8.5:` `services/extrusionRackOutput.service.js`<br>- `8.6:` `services/extrusionScrapClosure.service.js` + `repositories/extrusion.repository.js` | Los 7 módulos de reglas puras ya existentes en `extrusion/services/` (`shiftPolicy.js`, `shiftBalance.js`, `formulaColorRules.js`, `formulaMachinePolicy.js`, `queueBatchRules.js`, `queueOutputSnapshot.service.js`, `siloConsumptionAllocator.js`). |
