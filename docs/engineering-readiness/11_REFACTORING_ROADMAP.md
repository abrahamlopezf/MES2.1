# 11 — MAPA DE DESCOMPOSICIÓN DE MONOLITOS Y PLAN INCREMENTAL DE REFACTORIZACIÓN MVC

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha:** 2026-11-25  
**Fases Cubiertas:** Fase 9 (Descomposición de Monolitos) y Fase 10 (Plan Incremental de Refactorización)

---

## 1. Mapa de Descomposición de Archivos Monolíticos (Fase 9)

La auditoría estructural identificó 5 archivos críticos cuya concentración de responsabilidades dificulta el mantenimiento y eleva el riesgo de regresiones. A continuación se define su mapa exacto de descomposición bajo el patrón **Strangler Fig / Fachada Delegadora** (el archivo original se conserva como fachada que re-exporta los mismos métodos mientras delega internamente en sub-módulos cohesivos).

### 1.1 `backend/src/modules/extrusion/extrusion.service.js` (`8,303` líneas / `339 KB`)

| Sub-módulo Objetivo | Responsabilidades Extraídas | Reglas de Dominio y Contratos Protegidos | Frontera Transaccional (`Transaction Boundary`) |
| :--- | :--- | :--- | :--- |
| `services/extrusionQueue.service.js` | Consulta y programación de colas por extrusor, asignación de recursos de turno (`shift resources`), validaciones previas al arranque. | Reglas de capacidad de máquina, bloqueo de máquina con corrida activa, asignación de operadores por turno (`QA-EXT-SHIFT-001`). | Transacción corta por asignación de turno/cola (`READ COMMITTED`). |
| `services/extrusionRun.service.js` | Apertura, pausa, reanudación y cierre de corridas de extrusión (`ExtrusionRun`), máquinas de estado y `allowed_actions`. | Transiciones válidas de estado de corrida, bloqueo de cierre con bultos pendientes o sin pesaje. | **Transacción atómica crítica:** Cambio de estado de `ExtrusionRun` + registro en `ProductionRunEvent` + actualización de estado de máquina. |
| `services/extrusionConsumption.service.js` | Solicitud de órdenes de consumo (ODC) a almacén/mezcla, recepción en máquina, consumo FIFO de paquetes de PP (`extrusion.pp-consumption`) y aditivos. | Algoritmo FIFO por presentación cerrada (`planFifoPackageAllocations`), equivalencia de materiales (`materialEquivalence.js`), generación de excedente a WIP. | **Transacción atómica crítica:** Descuento de `InventoryLot` / `WipItem` + creación de `MaterialConsumption` + movimiento en `InventoryMovement` con `LOCK.UPDATE`. |
| `services/extrusionOutput.service.js` | Registro de bobinas/cinta producida, pesaje de producción, generación de etiquetas y códigos QR cifrados (`qrCrypto`), registro de scrap/merma. | Validación de destino de salida (`extrusion.output-target`), balance de masa (consumo vs producción + merma + WIP). | **Transacción atómica crítica:** Creación de `WipItem` / `InventoryLot` de salida + generación de QR + registro de genealogía padre-hijo (`LotGenealogy`). |
| `services/extrusionShiftHandoff.service.js` | Corte y entrega de turno (`shift handoff`), arqueo de materia prima en tolva/piso, continuidad de corrida entre turnos (`QA-EXT-HANDOFF-001`). | Conciliación de inventario en piso al cierre de turno, firma de operador saliente/entrante. | **Transacción atómica crítica:** Cierre de `ShiftHandoff` + snapshot de WIP en piso + apertura de segmento del nuevo turno. |
| `services/extrusionTransfer.service.js` | Despacho y transferencia de lotes de cinta extruida hacia Telares o Almacén, confirmación de custodia. | Reglas de custodia (`CustodyTransfer`), bloqueo de lotes con retención de calidad. | **Transacción atómica crítica:** Cambio de ubicación/custodia del lote + registro de `CustodyTransfer` + evento de trazabilidad. |
| `repositories/extrusion.repository.js` | Consultas Sequelize con `include` profundos y bloqueos pesimistas (`LOCK.UPDATE`) reutilizados por los 6 sub-servicios. | Preservación exacta de atributos e `includes` esperados por los DTOs actuales. | Nunca abre transacciones por sí solo; **exige recibir `{ transaction }`** en toda operación de escritura o lectura bloqueante. |

---

### 1.2 `backend/src/modules/traceability/traceability.service.js` (`3,629` líneas / `156 KB`)

| Sub-módulo Objetivo | Responsabilidades Extraídas | Contratos Protegidos | Frontera Transaccional |
| :--- | :--- | :--- | :--- |
| `services/qrResolution.service.js` | Resolución universal de códigos QR (`/api/traceability/resolve/:qr`), descifrado AES-256-GCM y determinación de entidad (`LOT`, `WIP`, `RUN`, `MACHINE`, `ORDER`) y `allowed_actions`. | Contrato Golden Rule #4 y #15 ("El QR dicta el flujo"): respuesta polimórfica exacta consumida por el escáner universal del frontend. | Solo lectura (`read-only`), salvo auditoría opcional de escaneo. |
| `services/genealogyGraph.service.js` | Construcción del árbol genealógico ascendente (materias primas origen) y descendente (rollos, laminados, sacos/globo destino) con costos acumulados. | Prevención de ciclos en grafos de lotes, cálculo exacto de contribución porcentual de cada lote padre. | Solo lectura (`read-only`) optimizada con consultas por lotes. |
| `services/custodyAudit.service.js` | Historial cronológico de custodia, transferencias entre áreas, bloqueos/liberaciones de calidad y bitácora de eventos. | Integridad cronológica de `CustodyTransfer` e `InventoryMovement`. | Lectura en consultas; transacción recibida por parámetro cuando es invocado por otros módulos para registrar un evento. |

---

### 1.3 `backend/src/modules/telares/telares.service.js` (`2,846` líneas / `104 KB`)

| Sub-módulo Objetivo | Responsabilidades Extraídas | Contratos Protegidos | Frontera Transaccional |
| :--- | :--- | :--- | :--- |
| `services/telaresQueue.service.js` | Gestión de órdenes de producción en telares, asignación de telares (`looms`) y validación de rutas (`productionRules.js`). | Reglas de ancho de rollo (`fabricRollWidth`), gramaje y destinos permitidos (`ROLLO_TELA`, `BANDA`, `CINTA`). | Transacción por asignación de orden a telar. |
| `services/telaresConsumption.service.js` | Carga de fileta, consumo de bobinas de cinta provenientes de extrusión y retorno/remanente en fileta. | Trazabilidad bobina -> rollo de tela, validación de título/denier y color de cinta. | **Transacción atómica:** Consumo de bobinas WIP + vínculo genealógico con la corrida del telar. |
| `services/telaresRollOutput.service.js` | Corte y pesaje de rollo de tela tejido, cálculo de peso teórico vs real (`calculateFabricWeightKg`), generación de QR de rollo. | Tolerancias de peso por metro lineal (`telares.fabric-weight`), bloqueo por desviación fuera de rango. | **Transacción atómica:** Creación de rollo WIP + descuento proporcional de cinta en fileta + generación de QR. |
| `services/telaresShiftClosure.service.js` | Lectura de contadores de metros por turno, eficiencia por telar y relevo de operadores. | Continuidad de lectura de odómetro/contador entre turnos sin pérdida de metros tejidos. | **Transacción atómica:** Registro de lectura de turno + avance acumulado de orden. |

---

### 1.4 `backend/src/modules/warehouse/warehouse.service.js` (`1,555` líneas / `58 KB`)

| Sub-módulo Objetivo | Responsabilidades Extraídas | Contratos Protegidos | Frontera Transaccional |
| :--- | :--- | :--- | :--- |
| `services/warehouseReception.service.js` | Recepción de materia prima de proveedores, alta de lotes (`InventoryLot`), impresión de etiquetas QR de almacén. | Unicidad de código de lote, asignación obligatoria de `presentation_quantity` y unidad de medida. | **Transacción atómica:** Creación de `InventoryLot` + `InventoryMovement (IN)` + generación de QR. |
| `services/warehouseDispatch.service.js` | Surtido de órdenes de consumo (ODC) hacia áreas productivas usando `consumptionPackageAllocator.js` y `materialEquivalence.js`. | Asignación FIFO estricta, bloqueo concurrente de lotes (`SELECT ... FOR UPDATE`), entrega de paquetes cerrados y registro de excedente. | **Transacción atómica crítica:** Reserva/descuento de lotes con `LOCK.UPDATE` + actualización de ODC + transferencia de custodia al área solicitante. |
| `services/warehouseInventory.service.js` | Consultas de existencias, kardex de movimientos, ajustes autorizados, cuarentena y devoluciones de piso. | Consistencia entre `InventoryLot.available_quantity` y la suma algebraica de `InventoryMovement`. | Transacción obligatoria en ajustes y devoluciones. |

---

### 1.5 `backend/src/database/models/index.js` (`1,015` líneas / `77` modelos)

- **Problema actual:** `index.js` importa los 77 modelos y define cientos de asociaciones (`hasMany`, `belongsTo`, `belongsToMany`) en un solo archivo monolítico de más de mil líneas.
- **Estrategia de descomposición sin ruptura:**
  1. Conservar en `backend/src/database/models/index.js` el registro y la exportación exacta de los **77 modelos** y la instancia `sequelize` (verificado por el test de caracterización `Characterization 2.1: Central ORM registry exports all 77 models`).
  2. Extraer las declaraciones de asociaciones a módulos cohesivos por dominio dentro de `backend/src/database/models/associations/` (`catalog.associations.js`, `warehouse.associations.js`, `extrusion.associations.js`, `telares.associations.js`, `laminado.associations.js`, `corte.associations.js`, `liner.associations.js`, `traceability.associations.js`).
  3. `index.js` invocará secuencialmente `applyCatalogAssociations(models)`, `applyWarehouseAssociations(models)`, etc., manteniendo **exactamente los mismos alias (`as: '...'`) y claves foráneas**.

---

## 2. Plan Incremental de Refactorización en Unidades Pequeñas (Fase 10)

> [!IMPORTANT]
> **Regla de Ejecución Incremental:** Ninguna unidad puede iniciarse si la unidad anterior no tiene todas sus pruebas en verde (`npm run validate`). Se comienza por las unidades de **menor riesgo** (controladores de solo lectura y separación de asociaciones) antes de intervenir los servicios transaccionales complejos.

---

### UNIDAD 1 — Desacoplamiento de Controladores de Consulta y Catálogos (Riesgo: BAJO)

1. **Objetivo:** Eliminar el acceso directo a modelos Sequelize en los 6 controladores de baja complejidad/lectura (`catalogs.controller.js`, `dashboard.controller.js`, `systemSettings.controller.js`, `users.controller.js`, `machines.controller.js`, `shifts.controller.js`), moviendo las consultas a sus servicios/repositorios respectivos.
2. **Archivos involucrados:** Los 6 archivos `*.controller.js` citados y sus correspondientes `*.service.js` / `*.repository.js`.
3. **Precondiciones:** `npm run dev:check` en verde; árbol de trabajo respaldado.
4. **Contratos protegidos:** Respuestas JSON de `/api/catalogs/*`, `/api/dashboard/operations`, `/api/users/*`, `/api/machines/*`.
5. **Pruebas previas obligatorias:** `node --test backend/test/characterization.contracts.test.js`.
6. **Pasos permitidos:**
   - Crear métodos de consulta en el servicio/repositorio correspondiente.
   - Reemplazar llamadas `Model.findAll(...)` / `Model.findByPk(...)` en el controlador por llamadas al servicio.
   - Eliminar el `require('../../database/models')` del controlador.
7. **Prohibiciones:** Prohibido cambiar nombres de propiedades devueltas, filtros por defecto o códigos HTTP.
8. **Pruebas posteriores obligatorias:** `npm run validate` + verificación estática de que `grep "database/models"` en los 6 controladores devuelve `0` coincidencias.
9. **Criterio de aceptación:** 0 imports de Sequelize/modelos en los 6 controladores y 100% de tests de caracterización en verde.
10. **Riesgo:** **Bajo** (operaciones mayoritariamente de lectura sin transacciones multi-tabla).
11. **Rollback:** `git checkout -- <archivos de la Unidad 1>` o restauración desde `readiness_recovery_vault`.

---

### UNIDAD 2 — Modularización de Asociaciones en `database/models/index.js` (Riesgo: BAJO)

1. **Objetivo:** Extraer las asociaciones de los 77 modelos de `backend/src/database/models/index.js` hacia `backend/src/database/models/associations/*.associations.js` sin alterar ningún nombre de modelo ni alias de asociación.
2. **Archivos involucrados:** `backend/src/database/models/index.js` y nuevos archivos en `backend/src/database/models/associations/`.
3. **Precondiciones:** Unidad 1 completada y validada.
4. **Contratos protegidos:** Los 77 modelos exportados por `database/models/index.js` y la totalidad de sus `model.associations` (nombre de asociación, `associationType`, `foreignKey`, `as`).
5. **Pruebas previas obligatorias:** Crear un snapshot JSON automatizado de `Object.keys(models)` y `Object.keys(model.associations)` para los 77 modelos antes de editar.
6. **Pasos permitidos:** Mover bloques de asociaciones por dominio a `associations/*.associations.js` e invocarlos desde `index.js`.
7. **Prohibiciones:** Prohibido renombrar alias (`as`), cambiar `onDelete`/`onUpdate` o modificar definiciones de columnas en `*.model.js`.
8. **Pruebas posteriores obligatorias:** Comparar el snapshot de los 77 modelos y sus asociaciones antes vs. después (debe ser 100% idéntico bit a bit) + ejecutar `npm run test:unit` y `npm --prefix backend run test:integration`.
9. **Criterio de aceptación:** `index.js` reducido a `< 200` líneas, snapshot de 77 modelos y asociaciones 100% idéntico, todas las suites en verde.
10. **Riesgo:** **Bajo** (verificable al 100% por introspección del objeto `models` en memoria).
11. **Rollback:** Revertir `backend/src/database/models/index.js` y eliminar `backend/src/database/models/associations/`.

---

### UNIDAD 3 — Desacoplamiento de los 12 Controladores Operativos Restantes (Riesgo: MEDIO-BAJO)

1. **Objetivo:** Eliminar los imports directos de `database/models` y `sequelize` en los 12 controladores operativos restantes (Almacén, Mezcla, Extrusión, Telares, Laminado, Corte, Liner, Calidad, Trazabilidad), alcanzando **0 controladores con acceso directo a Sequelize** en todo el backend.
2. **Archivos involucrados:** Los 12 controladores identificados en `09_DEPENDENCY_MAP.md` y sus servicios correspondientes.
3. **Precondiciones:** Unidades 1 y 2 completadas; `sistema_enterprise_test` con Master Data intacta.
4. **Contratos protegidos:** Todos los endpoints REST de `/api/warehouse/*`, `/api/extrusion/*`, `/api/telares/*`, `/api/laminado/*`, `/api/corte/*`, `/api/liner/*`, `/api/traceability/*`.
5. **Pruebas previas obligatorias:** `npm run test:unit` + `npm --prefix backend run test:integration`.
6. **Pasos permitidos:** Trasladar cualquier query o transacción que resida directamente en el controlador hacia un método explícito en el servicio del módulo.
7. **Prohibiciones:** Prohibido alterar la firma de entrada/salida HTTP o modificar reglas de negocio durante el traslado.
8. **Pruebas posteriores obligatorias:**
   - Prueba de arquitectura automatizada que verifique que **ningún archivo `*.controller.js`** en `backend/src/modules/` contiene `database/models` ni `require('sequelize')`.
   - Ejecución completa de `npm run test:unit`, `npm --prefix backend run test:integration` y `npm --prefix backend run db:verify:local`.
9. **Criterio de aceptación:** `0/18` controladores con acceso directo a Sequelize (reducción del `100%` de la deuda MVC en capa de controladores).
10. **Riesgo:** **Medio-Bajo**.
11. **Rollback:** Revertir los archivos de controlador y servicio del módulo específico afectado.

---

### UNIDAD 4 — Resolución de Contratos Funcionales Pendientes (`QA-ODC-PACK-001`, `QA-TEL-ROUTE-001`, Corte-Laminado) (Riesgo: MEDIO)

1. **Objetivo:** Una vez confirmada la decisión funcional con el Product Owner, alinear los 3 contratos pendientes antes de descomponer los servicios de Almacén, Telares y Corte.
2. **Archivos involucrados:**
   - `backend/src/modules/warehouse/consumptionPackageAllocator.js` (para `QA-ODC-PACK-001`).
   - `backend/src/modules/telares/productionRules.js` y `backend/test/telares*.test.js` (para `QA-TEL-ROUTE-001`).
   - `backend/src/modules/corte/corte.service.js` y `backend/test/corteLaminadoFlow.local.integration.test.js`.
3. **Precondiciones:** Confirmación escrita de producto sobre las 3 reglas (ver `07_TESTING_BASELINE.md` Sección 4).
4. **Contratos protegidos:** Asignación FIFO por presentación en ODC, rutas de salida de Telares y flujo de confirmación de transferencia Corte-Laminado.
5. **Pruebas previas obligatorias:** Ejecución de las suites unitarias y de integración de los 3 módulos.
6. **Pasos permitidos:** Ajustar la regla/prueba según la definición oficial aprobada y agregar casos de prueba de regresión.
7. **Prohibiciones:** Prohibido adivinar o asumir la regla sin confirmación del Product Owner.
8. **Pruebas posteriores obligatorias:** `100%` de pruebas unitarias (`93/93`) e integración local (`6/6` o `5/5 + 1 SKIP`) en verde sobre `sistema_enterprise_test`.
9. **Criterio de aceptación:** Cero tests fallidos en unitarias e integración local; Master Data SHA-256 intacto.
10. **Riesgo:** **Medio** (impacta comportamiento funcional explícito).
11. **Rollback:** Restauración de los 3 módulos desde Git / `readiness_recovery_vault`.

---

### UNIDAD 5 — Descomposición por Fachada de `warehouse.service.js` (`1,555` líneas) (Riesgo: MEDIO)

1. **Objetivo:** Extraer `warehouseReception.service.js`, `warehouseDispatch.service.js`, `warehouseInventory.service.js` y `warehouse.repository.js`, manteniendo `warehouse.service.js` como fachada delegadora.
2. **Archivos involucrados:** `backend/src/modules/warehouse/*`.
3. **Precondiciones:** Unidad 4 completada (`QA-ODC-PACK-001` resuelto y con tests en verde).
4. **Contratos protegidos:** Recepción de lotes, despacho FIFO de ODC, transferencias de custodia y kardex de almacén.
5. **Pruebas previas obligatorias:** `consumptionPackageAllocator.test.js`, `materialEquivalence.test.js`, `characterization.contracts.test.js`.
6. **Pasos permitidos:** Extraer un sub-servicio a la vez, propagando `{ transaction }` en todas las llamadas a `warehouse.repository.js`, y re-exportar cada método en `warehouse.service.js`.
7. **Prohibiciones:** Prohibido alterar la lógica de bloqueo `LOCK.UPDATE` al surtir lotes o dividir una transacción de despacho en múltiples transacciones independientes.
8. **Pruebas posteriores obligatorias:** Suites unitarias + integración local de extrusión/telares que consumen lotes de almacén + verificación de Master Data.
9. **Criterio de aceptación:** Ningún archivo en `modules/warehouse/services/` supera las `500` líneas; todos los contratos exportados por `warehouse.service.js` siguen funcionando sin cambios en sus llamadores.
10. **Riesgo:** **Medio**.
11. **Rollback:** Restaurar `backend/src/modules/warehouse/warehouse.service.js` y eliminar los sub-servicios extraídos.

---

### UNIDAD 6 — Descomposición por Fachada de `traceability.service.js` (`3,629` líneas) (Riesgo: MEDIO)

1. **Objetivo:** Extraer `qrResolution.service.js`, `genealogyGraph.service.js`, `custodyAudit.service.js` y `traceability.repository.js`, manteniendo `traceability.service.js` como fachada.
2. **Archivos involucrados:** `backend/src/modules/traceability/*`.
3. **Precondiciones:** Unidad 5 completada.
4. **Contratos protegidos:** Resolución universal de QR (`/api/traceability/resolve/:qr`), grafo genealógico de lotes y bitácora de custodia.
5. **Pruebas previas obligatorias:** `qrCrypto.test.js`, `characterization.contracts.test.js` y tests de integración E2E.
6. **Pasos permitidos:** Extraer primero las consultas de solo lectura (`genealogyGraph`, `qrResolution`) y finalmente el registro de eventos de custodia.
7. **Prohibiciones:** Prohibido modificar el formato del payload QR cifrado o los códigos de `allowed_actions` devueltos al escanear un QR.
8. **Pruebas posteriores obligatorias:** Suite completa de caracterización, unitarias e integración local.
9. **Criterio de aceptación:** `traceability.service.js` actúa únicamente como fachada delegadora (`< 200` líneas) y cada sub-servicio tiene `< 600` líneas.
10. **Riesgo:** **Medio**.
11. **Rollback:** Restaurar `traceability.service.js`.

---

### UNIDAD 7 — Descomposición por Fachada de `telares.service.js` (`2,846` líneas) (Riesgo: MEDIO-ALTO)

1. **Objetivo:** Extraer `telaresQueue.service.js`, `telaresConsumption.service.js`, `telaresRollOutput.service.js`, `telaresShiftClosure.service.js` y `telares.repository.js`.
2. **Archivos involucrados:** `backend/src/modules/telares/*`.
3. **Precondiciones:** Unidades 4 y 6 completadas (`QA-TEL-ROUTE-001` resuelto y `telaresE2E.local.integration.test.js` en verde).
4. **Contratos protegidos:** Carga de fileta, consumo de cinta, pesaje y corte de rollo de tela (`calculateFabricWeightKg`), lectura de contadores por turno y órdenes hacia Corte/Laminado.
5. **Pruebas previas obligatorias:** `telares.fabric-weight.test.js`, `telares.production-rules.test.js`, `telares.rules.test.js`, `fabricRollWidth.test.js` y `telaresE2E.local.integration.test.js`.
6. **Pasos permitidos:** Extraer sub-servicios conservando intactas las fronteras transaccionales en la producción de rollos y cierre de turno.
7. **Prohibiciones:** Prohibido alterar las fórmulas de peso teórico (`telares.fabric-weight`) o separar el descuento de fileta de la creación del rollo WIP.
8. **Pruebas posteriores obligatorias:** Todas las suites unitarias de Telares + `telaresE2E.local.integration.test.js` sobre `sistema_enterprise_test`.
9. **Criterio de aceptación:** Sub-servicios cohesivos `< 600` líneas, fachada retrocompatible en `telares.service.js`, 100% de tests de Telares en verde.
10. **Riesgo:** **Medio-Alto**.
11. **Rollback:** Restaurar `backend/src/modules/telares/telares.service.js`.

---

### UNIDAD 8 — Descomposición por Fachada de `extrusion.service.js` (`8,303` líneas) (Riesgo: ALTO — Ejecutar en 6 Sub-Pasos)

1. **Objetivo:** Descomponer el monolito principal del sistema (`8,303` líneas) en los 6 sub-servicios y el repositorio definidos en la Sección 1.1, a razón de **un sub-servicio por commit/PR interno**, conservando `extrusion.service.js` como fachada.
2. **Archivos involucrados:** `backend/src/modules/extrusion/*`.
3. **Precondiciones:** Unidades 1 a 7 completadas y validadas.
4. **Contratos protegidos:** Colas de extrusión, arranque/paro de corrida, consumo FIFO de paquetes de PP, pesaje de bobinas, cálculo de merma/scrap, relevo de turno (`shift handoff`) y transferencia a Telares.
5. **Pruebas previas obligatorias:**
   - Unitarias: `extrusion.output-target.test.js`, `extrusion.pp-consumption.test.js`, `extrusion.rules.test.js`.
   - Integración local: `extrusion-pp-packages.local.integration.test.js`, `extrusionShiftHandoff.local.integration.test.js`, `extrusionTransfer.local.integration.test.js`.
6. **Pasos permitidos (orden estricto de extracción):**
   - *Sub-paso 8.1:* Extraer consultas de lectura y colas (`extrusionQueue.service.js`) -> Validar tests.
   - *Sub-paso 8.2:* Extraer transferencias (`extrusionTransfer.service.js`) -> Validar `extrusionTransfer.local.integration.test.js`.
   - *Sub-paso 8.3:* Extraer relevo de turno (`extrusionShiftHandoff.service.js`) -> Validar `extrusionShiftHandoff.local.integration.test.js`.
   - *Sub-paso 8.4:* Extraer consumos de MP/PP (`extrusionConsumption.service.js`) -> Validar `extrusion-pp-packages.local.integration.test.js`.
   - *Sub-paso 8.5:* Extraer salidas, pesaje y merma (`extrusionOutput.service.js`) -> Validar suites completas.
   - *Sub-paso 8.6:* Extraer ciclo de vida de corrida (`extrusionRun.service.js`) y dejar `extrusion.service.js` como fachada pura -> Validar suites completas.
7. **Prohibiciones:** Prohibido extraer los 6 sub-servicios en un solo paso masivo; prohibido omitir la propagación de `{ transaction }` entre sub-servicios cuando una operación compuesta abarca consumo + salida + relevo de turno.
8. **Pruebas posteriores obligatorias:** Ejecución de todas las suites unitarias, de caracterización y de integración local en cada uno de los 6 sub-pasos + verificación de Master Data (`db:verify:local`).
9. **Criterio de aceptación:** `extrusion.service.js` reducido de `8,303` líneas a una fachada de `< 250` líneas; cada sub-servicio `< 900` líneas; 100% de pruebas unitarias y de integración de extrusión en verde.
10. **Riesgo:** **Alto** (mitigado mediante ejecución fraccionada en 6 sub-pasos verificables individualmente).
11. **Rollback:** Reversión inmediata del sub-paso individual (`8.x`) que haya introducido cualquier desviación.
