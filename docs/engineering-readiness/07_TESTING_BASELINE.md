# 07 — LÍNEA BASE DE PRUEBAS, CONTRATOS Y HALLAZGOS QA

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha de Ejecución:** 2026-11-25  
**Base de Datos de Pruebas:** `sistema_enterprise_test` (`127.0.0.1:5432`, `APP_ENV=test`)  
**Base de Datos de Desarrollo (Intacta):** `sistema_enterprise` (`127.0.0.1:5432`, `APP_ENV=local`)

---

## 1. Resumen Ejecutivo de Ejecución de Suites

Durante la Fase 6 se ejecutaron todas las suites unitarias, de caracterización, de aislamiento de entorno, de frontend y de integración local contra la base de datos aislada `sistema_enterprise_test`.

| Categoría de Suite | Comando Ejecutado | Archivos / Suites | Tests Totales | Exitosos (`PASS`) | Fallidos (`FAIL`) | Omitidos (`SKIP`) | Estado |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Guardas de Aislamiento (`dbGuard`)** | `node --test test/envIsolationGuard.test.js` | 1 | 8 | **8** | 0 | 0 | ✅ `100% PASS` |
| **Contratos de Caracterización MVC** | `node --test test/characterization.contracts.test.js` | 1 | 10 | **10** | 0 | 0 | ✅ `100% PASS` |
| **Pruebas Unitarias Backend Existentes** | `npm --prefix backend run test:unit` | 14 | 75 | **72** | 3 | 0 | ⚠️ `96.0% PASS` (3 fallos preexistentes en Telares) |
| **Subtotal Unitarias + Caracterización Backend** | `npm run test:unit` | **16** | **93** | **90** | **3** | **0** | **`96.8% PASS`** |
| **Integración Local Backend (`sistema_enterprise_test`)** | `npm --prefix backend run test:integration` | 6 | 7 | **5** | 1 | 1 | ⚠️ `4/6 suites PASS`, `1 SKIP`, `1 FAIL` |
| **Pruebas Unitarias Frontend (Vitest)** | `npm --prefix frontend run test` | 11 | 31 | **31** | 0 | 0 | ✅ `100% PASS` |
| **Compilación Producción Frontend (Vite)** | `npm --prefix frontend run build` | 1,863 módulos | 1 build | **1** | 0 | 0 | ✅ `100% PASS` |
| **Verificación de Integridad Master Data Post-Tests** | `npm --prefix backend run db:verify:local` | 30 tablas | 2,928 filas | **2,928** | 0 | 0 | ✅ `SHA-256 Intacto` |

---

## 2. Detalle de Suites Unitarias, Guardas y Caracterización (Backend)

| # | Archivo de Prueba | Tests | Resultado | Cobertura / Contrato Verificado |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `backend/test/envIsolationGuard.test.js` | 8 | ✅ `8/8 PASS` | Bloqueo de hosts Neon/cloud en `local`/`test`, bloqueo de escalación por `NODE_ENV=production`, redirección forzosa a `sistema_enterprise_test` en `APP_ENV=test`, rechazo de `DB_SSL=true` en local. |
| 2 | `backend/test/characterization.contracts.test.js` | 10 | ✅ `10/10 PASS` | `GET /api/health`, `POST /api/auth/login` (401/400), bloqueo sin JWT en `/api/warehouse/lots`, `/api/extrusion/runs`, `/api/telares/looms`, `/api/traceability/resolve/:qr`, `/api/dashboard/operations`, registro de 77 modelos ORM, reglas de pesos/FIFO, cifrado QR AES-256-GCM y trigger `[QA_MASTER_DATA_GUARD]` en `sistema_enterprise_test`. |
| 3 | `backend/test/auth.middleware.test.js` | 5 | ✅ `5/5 PASS` | Autenticación JWT, validación de roles y áreas operativas. |
| 4 | `backend/test/consumptionPackageAllocator.test.js` | 4 | ✅ `4/4 PASS` | Asignación FIFO por presentación cerrada y generación de excedente a WIP. |
| 5 | `backend/test/corte.rules.test.js` | 4 | ✅ `4/4 PASS` | Reglas de negocio de órdenes de corte. |
| 6 | `backend/test/extrusion.output-target.test.js` | 4 | ✅ `4/4 PASS` | Determinación de destino y presentación de salida en extrusión. |
| 7 | `backend/test/extrusion.pp-consumption.test.js` | 3 | ✅ `3/3 PASS` | Cálculo de consumo de polipropileno por paquetes y bolsas. |
| 8 | `backend/test/extrusion.rules.test.js` | 9 | ✅ `9/9 PASS` | Reglas de validación de corridas, paros, mermas y entregas de turno en extrusión. |
| 9 | `backend/test/fabricRollWidth.test.js` | 4 | ✅ `4/4 PASS` | Normalización y validación de ancho de rollo de tela. |
| 10 | `backend/test/laminado.rules.test.js` | 6 | ✅ `6/6 PASS` | Reglas de corrida, película y adhesivo en laminado. |
| 11 | `backend/test/liner.rules.test.js` | 5 | ✅ `5/5 PASS` | Reglas de producción y consumo en área Liner/Globo. |
| 12 | `backend/test/materialEquivalence.test.js` | 6 | ✅ `6/6 PASS` | Resolución de grupos de equivalencia de materias primas (`MAS-001` / `MP-MAS-008`, etc.). |
| 13 | `backend/test/qrCrypto.test.js` | 6 | ✅ `6/6 PASS` | Cifrado y descifrado de payloads QR con AES-256-GCM. |
| 14 | `backend/test/telares.fabric-weight.test.js` | 8 | ✅ `8/8 PASS` | Cálculo de peso teórico (`calculateFabricWeightKg`) y gramaje en telares. |
| 15 | `backend/test/telares.production-rules.test.js` | 6 | ⚠️ `5/6 PASS` (`1 FAIL`) | Falla el caso `assertAllowedTelaresRoute rejects GLOBO destinations for telares outputs` (ver Sección 4.1). |
| 16 | `backend/test/telares.rules.test.js` | 15 | ⚠️ `13/15 PASS` (`2 FAIL`) | Fallan los casos `validateLinearMeters exige metros válidos y bloquea GLOBO` y `assertAllowedDestination rechaza GLOBO en cualquier salida de Telares` (ver Sección 4.1). |

---

## 3. Detalle de Suites de Integración Local (`sistema_enterprise_test`)

A diferencia de la auditoría inicial (donde las 6 suites de integración estaban omitidas por requerir la variable `RUN_LOCAL_DB_TESTS=1` y no contar con base de datos de pruebas aislada), en esta intervención se restauró `sistema_enterprise_test`, se activaron los 58 triggers de protección de Master Data y se ejecutaron las 6 suites con `APP_ENV=test` y `RUN_LOCAL_DB_TESTS=1`:

| # | Suite de Integración Local | Estado | Tests | Observaciones Técnicas y Evidencia |
| :---: | :--- | :---: | :---: | :--- |
| 1 | `backend/test/extrusion-pp-packages.local.integration.test.js` | ✅ `PASS` | `2/2` | Validó asignación y consumo de paquetes de PP en extrusión con reversión transaccional limpia. |
| 2 | `backend/test/extrusionShiftHandoff.local.integration.test.js` | ✅ `PASS` | `1/1` | Validó relevo de turno (`shift handoff`), pesaje acumulado y continuidad de corrida en extrusión. |
| 3 | `backend/test/extrusionTransfer.local.integration.test.js` | ✅ `PASS` | `1/1` | Validó transferencia de lotes de cinta extruida hacia área de Telares y custodia. |
| 4 | `backend/test/telaresE2E.local.integration.test.js` | ✅ `PASS` | `1/1` | Validó flujo E2E de Telares: asignación de bobinas, producción de rollo e inventario WIP. |
| 5 | `backend/test/extrusionFloor.local.integration.test.js` | ⏭️ `SKIP` | `1/1` | Omitido controladamente por la propia prueba (`t.skip`) porque el snapshot de la base de datos contiene una cola de trabajo activa preexistente en `Extrusor 4` (comportamiento seguro diseñado en el test para no alterar colas activas). |
| 6 | `backend/test/corteLaminadoFlow.local.integration.test.js` | ❌ `FAIL` | `0/1` | **Hallazgo importante de trabajo en progreso (`WIP`)**: requirió aplicar en `sistema_enterprise_test` la migración no rastreada `20261124130000-add-laminado-cut-transfer-confirmations.js`. Una vez aplicada la migración, el test avanzó hasta la línea 71 y falló en `AssertionError: La orden totalmente recogida debe salir de pendientes` (ver Sección 4.2). |

> [!IMPORTANT]
> **Verificación de Master Data tras las 6 suites de integración:**
> Al concluir la ejecución de las suites de integración sobre `sistema_enterprise_test`, se ejecutó `node backend/src/scripts/master-data-fingerprint.js --env=test`. El hash global SHA-256 de las 30 tablas maestras (`2,928` filas) en `sistema_enterprise_test` permaneció en **`36db9b70c666b2753d70b9fa87522f5cbf1309b8d9162dac3889b9a4693ee241`**, idéntico al de `sistema_enterprise`.

---

## 4. Análisis Forense de Fallos y Discrepancias de Contrato

### 4.1 Discrepancia en Reglas de Ruteo de Telares hacia Globo (`QA-TEL-ROUTE-001`)

- **Archivos involucrados:**
  - Código modificado en árbol de trabajo (`M`): `backend/src/modules/telares/productionRules.js` (líneas 28–56).
  - Pruebas unitarias que fallan:
    - `backend/test/telares.production-rules.test.js` (línea 36).
    - `backend/test/telares.rules.test.js` (líneas 9 y 33).
  - Especificación previa: `docs/agent-collaboration/telares/02-requisitos.md` (`REQ-06`).
- **Causa raíz demostrada por código:**
  1. Originalmente, `REQ-06` especificaba que ninguna salida de Telares podía enviarse a `GLOBO`, lanzando `GLOBO_NOT_ALLOWED_FOR_TELARES_OUTPUT`.
  2. En el trabajo en curso para soportar órdenes de proceso de Corte hacia Liner/Globo (respaldado por la migración `20261123110000-generalize-corte-process-orders.js`), el desarrollador modificó `backend/src/modules/telares/productionRules.js`:
     - En la línea 52 agregó `['GLOBO', 'CORTE']` como cola de ruta válida (`validTail`) para el tipo de salida `ROLLO_TELA`.
     - En las líneas 32–37 restringió `BANDA` y `CINTA` para que rechacen `GLOBO` y `LAMINADO` con el código `INVALID_BANDA_CINTA_ROUTE`.
  3. Sin embargo, los tests `telares.production-rules.test.js` y `telares.rules.test.js` no fueron actualizados y siguen esperando que `assertAllowedTelaresRoute({ outputType: 'ROLLO_TELA', routeSteps: ['TELARES', 'GLOBO'] })` lance `GLOBO_NOT_ALLOWED_FOR_TELARES_OUTPUT`.
- **Por qué no se modificó en esta intervención:**
  - Conforme a la **Restricción Absoluta #2 y #11**, no se debe alterar una regla de negocio ni silenciar una prueba funcional cuando existe un cambio de requisito entre el código en progreso y la especificación escrita.
- **Opciones de resolución para el Product Owner antes de refactorizar Telares:**
  - **Opción A (Confirmar nuevo flujo Liner/Globo via Corte):** Confirmar que `ROLLO_TELA` puede tener ruta `['TELARES', 'GLOBO', 'CORTE']` (o `['TELARES', 'CORTE']`), y actualizar `telares.production-rules.test.js` y `telares.rules.test.js` para reflejar la distinción entre `ROLLO_TELA` y `BANDA`/`CINTA`.
  - **Opción B (Restaurar prohibición estricta `REQ-06`):** Si Telares jamás debe rutear a `GLOBO`, revertir la línea 52 de `productionRules.js`.

### 4.2 Discrepancia en Flujo de Confirmación de Transferencia Corte-Laminado (`corteLaminadoFlow.local.integration.test.js:71`)

- **Archivos involucrados:**
  - Migración pendiente (`??` en `sistema_enterprise`, aplicada en `sistema_enterprise_test`): `backend/src/database/migrations/20261124130000-add-laminado-cut-transfer-confirmations.js`.
  - Servicio modificado (`M`): `backend/src/modules/corte/corte.service.js`.
  - Prueba de integración: `backend/test/corteLaminadoFlow.local.integration.test.js` (línea 71).
- **Causa raíz demostrada por código:**
  1. El servicio `corte.service.js` fue modificado recientemente para introducir un flujo de confirmación de doble paso entre Corte y Laminado (`dispatched_by`, `dispatched_at`, `received_by`, `received_at`, estado `RECEIVED_BY_CUT`).
  2. Bajo esta nueva lógica en `corte.service.js`, cuando el operador ejecuta `confirmPickup()`, la orden pasa a estado `PICKED`, pero **permanece visible en `getOpenOrders()`** hasta que los rollos son cortados, despachados y confirmados como recibidos.
  3. El test `corteLaminadoFlow.local.integration.test.js` (línea 71) conserva la aserción del flujo anterior: espera que inmediatamente después de `confirmPickup()`, la orden desaparezca de `getOpenOrders()`.
- **Acción requerida antes de refactorizar Corte/Laminado:**
  - Aplicar la migración `20261124130000-add-laminado-cut-transfer-confirmations.js` en `sistema_enterprise` cuando se cierre la funcionalidad en curso y actualizar `corteLaminadoFlow.local.integration.test.js` para incluir los pasos de transformación, despacho y recepción del nuevo contrato.

### 4.3 Hallazgos del Reporte QA Funcional Multi-Corrida (`docs/qa/`)

Se verificó en el código fuente la vigencia de los 5 defectos documentados en `docs/qa/QA_BUGS_AND_FINDINGS.md`:

| ID Hallazgo | Severidad | Estado Actual en Código | Ubicación Exacta Verificada | Diagnóstico Técnico para Corrección Posterior |
| :--- | :---: | :---: | :--- | :--- |
| **`QA-ODC-PACK-001`** | **P1 (Alta)** | **Vigente** | `backend/src/modules/warehouse/consumptionPackageAllocator.js` (líneas 16–30) y `materialEquivalence.js` | Cuando `planFifoPackageAllocations` evalúa lotes equivalentes en orden FIFO y el lote más antiguo (ej. `LOT-MB-BCO-09006` de `MAS-001`) tiene `presentation_quantity = null/0`, entra al bloque `else` (`Math.min(pending, available)`) y surte `1 kg` exacto sin redondeo por presentación ni excedente a WIP (`9 kg`), contradiciendo la previsualización calculada sobre `MP-MAS-008` (`10 kg`). |
| **`QA-EXT-SHIFT-001`** | **P2 (Media)** | **Vigente** | `backend/src/modules/extrusion/extrusion.service.js` | La asignación de recursos al turno filtra por líneas con corrida activa en lugar de permitir asignar personal/máquinas antes de arrancar la primera corrida del turno. |
| **`QA-EXT-HANDOFF-001`** | **P1 (Alta)** | **Vigente** | `backend/src/modules/extrusion/extrusion.service.js` y `frontend/src/modules/production/` | Desalineación entre el contrato de cierre/relevo de turno cuando existen múltiples corridas consecutivas en la misma máquina durante el mismo turno. |
| **`QA-WH-NAV-001`** | **P2 (Media)** | **Vigente** | `frontend/src/modules/warehouse/` | Navegación post-recepción/despacho en Almacén requiere paso manual adicional en ciertos estados de orden de consumo. |
| **`QA-TEL-UI-001`** | **P2 (Media)** | **Vigente** | `frontend/src/modules/telares/` | Estado visual de tarjetas de telar tras actualización de lectura de contador requiere refresco de query React Query. |
