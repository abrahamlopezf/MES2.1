# 08 — LÍNEA BASE REPRODUCIBLE DE PRUEBAS Y EJECUCIÓN EN INSTANCIA DESECHABLE (FASE H)

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha de Ejecución:** 2026-11-26  
**Política de Métricas (Fase H):** Se separan estrictamente los conteos de **Archivos/Suites de Prueba** respecto de los **Casos de Prueba Individuales**, sin mezclarlos para calcular porcentajes y sin modificar ninguna prueba para ocultar fallos.

---

## 1. Estrategia Reproducible de Instancia Temporal Desechable (`sistema_enterprise_disposable_verify_test`)

En la base de pruebas `sistema_enterprise_test`, la suite `backend/test/extrusionFloor.local.integration.test.js` se omitía (`SKIP` en línea 39) debido a que el snapshot restaurado contiene la cola activa `id = 197` en la **Extrusora 4 (`extruder_id = 4, status = 'ACTIVA'`)**.

Para evaluar el comportamiento real de `extrusionFloor.local.integration.test.js` **sin alterar `sistema_enterprise`, sin alterar `sistema_enterprise_test` y sin modificar el código de la prueba**:

1. **Aprovisionamiento Efímero Aislado (`127.0.0.1:5432`):**
   - Se creó una base de datos temporal desechable `sistema_enterprise_disposable_verify_test` (cuyo sufijo `_verify_test` es aceptado legítimamente por `dbGuard.js` en `APP_ENV=test`).
   - Se revocó `PUBLIC` y se restauró el esquema (`164` migraciones) y datos desde `backend/tmp/db-role-baseline-20261126/sistema_enterprise_test.dump`.
2. **Precondición Controlada Exclusivamente en la Instancia Desechable:**
   - En `sistema_enterprise_disposable_verify_test`, se consultó `pg_enum` para `enum_extruder_queues_status` y se transicionó únicamente la cola `id = 197` de la Extrusora 4 fuera del estado `'ACTIVA'`, dejando libre la Extrusora 4 y conservando las `2,928` filas de Master Data intactas.
3. **Ejecución y Limpieza:**
   - Se ejecutó `node --test test/extrusionFloor.local.integration.test.js` con `APP_ENV=test`, `DB_NAME=sistema_enterprise_disposable_verify_test`, `DB_USER=traceflow_app_test` y `RUN_EXTRUSION_LOCAL_INTEGRATION=1`.
   - Al concluir, se eliminó (`DROP DATABASE`) la instancia desechable `sistema_enterprise_disposable_verify_test` y se verificó con `dev-check.js` que `sistema_enterprise` y `sistema_enterprise_test` permanecieron 100% inalteradas.

---

## 2. Hallazgo Técnico Descubierto al Ejecutar `extrusionFloor` sin `SKIP` en la Instancia Desechable

Al liberar la Extrusora 4 en la instancia desechable, la prueba `extrusionFloor.local.integration.test.js` **no se omitió (`skipped: 0`)**, avanzó hasta la línea 131 y reveló una **desalineación de firma entre el test y `ExtrusionService.scanRackPti`** que permanecía oculta detrás del `SKIP`:

### 2.1 Evidencia y Traza Sanitizada de Ejecución
```text
✖ cola, ingreso compatible/incompatible a rack y cambio de mezcla (fixtures revertidos) (3130.2165ms)
  Error: La mezcla no pertenece al turno operativo activo.
      at ExtrusionService.scanRackPti (backend/src/modules/extrusion/extrusion.service.js:2997:29)
      at backend/test/extrusionFloor.local.integration.test.js:131:27
    statusCode: 409
```

### 2.2 Diagnóstico Exacto del Requisito en `extrusionFloor.local.integration.test.js` (Documentado sin Modificar la Prueba)
1. **Lo que sí pasó dentro de `extrusionFloor.local.integration.test.js` (líneas 20–130):**
   - `service.getExtruderQueues()` (líneas 22–24): **Aprobado** (valida el contrato del tablero de colas que antes devolvía HTTP 500).
   - `service.closeExtrusionShift(...)` sin actividad en turno (líneas 55–65): **Aprobado** (rechaza con `409` como se espera).
   - Creación de fixtures transaccionales (`QrCode`, `TraceableItem`, `ExtruderQueue`, `persistQueueOutputSnapshot`, `PtiRack`): **Aprobado**.
2. **Por qué falló en la línea 131 (`service.scanRackPti`):**
   - En `backend/src/modules/extrusion/extrusion.service.js` (líneas 2942 y 2996), el método `scanRackPti` fue endurecido recientemente en el árbol de trabajo (`M`) para exigir el parámetro `shift_session_id`:
     ```javascript
     if (!shift_session_id || (queueItem.shift_session_id && Number(queueItem.shift_session_id) !== Number(shift_session_id))) {
       throw Object.assign(new Error('La mezcla no pertenece al turno operativo activo.'), { statusCode: 409 });
     }
     ```
   - Cuando `scanRackPti` es invocado desde el endpoint HTTP (`extrusion.controller.js`), el controlador resuelve la sesión de turno abierta y pasa `shift_session_id` al servicio.
   - Sin embargo, `extrusionFloor.local.integration.test.js` (escrito antes de que `shift_session_id` fuera obligatorio en `scanRackPti`) invoca `service.scanRackPti({...})` directamente en las líneas 131, 162, 179 y 233 **sin pasar `shift_session_id`** y crea `activeQueue` en la línea 96 sin asociarle un `ExtrusionShiftSession` de prueba.
3. **Requisito documentado para habilitar la prueba en la Unidad 4:**
   - Dentro de la transacción revertible de `extrusionFloor.local.integration.test.js` (línea 96), crear o resolver una sesión `ExtrusionShiftSession` activa para el fixture y pasar `shift_session_id: fixtureSession.id` en las 4 llamadas a `service.scanRackPti(...)`.

---

## 3. Línea Base Oficial de Pruebas (Separación Estricta entre Suites y Casos Individuales)

### 3.1 Nivel 1: Resultados por Archivo / Suite de Pruebas (`33` Suites Automatizadas)

| Categoría de Suite | Total Suites | Suites `PASS` | Suites `FAIL` | Suites `SKIP` | Suites `NO EJECUTADO` | Suites `BLOQUEADO` | Suites `ERROR INFRA` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **A. Unitarias y Dominio Backend (`node:test`)** | `14` | **`12`** | `2` (`telares.production-rules`, `telares.rules`) | `0` | `0` | `0` | `0` |
| **B. Guardas y Caracterización Backend (`node:test`)** | `2` | **`2`** (`envIsolationGuard`, `characterization.contracts`) | `0` | `0` | `0` | `0` | `0` |
| **C. Integración Local Backend en `sistema_enterprise_test` (`APP_ENV=test`, `RUN_*=1`)** | `6` | **`4`** (`extrusion-pp-packages`, `extrusionShiftHandoff`, `extrusionTransfer`, `telaresE2E`) | `1` (`corteLaminadoFlow`) | `1` (`extrusionFloor` en QA; `FAIL` en instancia desechable por `shift_session_id`) | `0` | `0` | `0` |
| **D. Unitarias, Contratos e Integración Frontend (`Vitest`)** | `11` | **`11`** | `0` | `0` | `0` | `0` | `0` |
| **TOTAL DE SUITES AUTOMATIZADAS** | **`33`** | **`29`** | **`3`** | **`1`** | **`0`** | **`0`** | **`0`** |

---

### 3.2 Nivel 2: Resultados por Caso de Prueba Individual (`133` Casos Individuales)

| Categoría | Total Casos Individuales | Casos `PASS` | Casos `FAIL` | Casos `SKIP` | Casos `NO EJECUTADO` | Casos `BLOQUEADO` | Casos `ERROR INFRA` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1. `backend/test/envIsolationGuard.test.js`** | `10` | **`10`** | `0` | `0` | `0` | `0` | `0` |
| **2. `backend/test/characterization.contracts.test.js`** | `10` | **`10`** | `0` | `0` | `0` | `0` | `0` |
| **3. `backend/src/database/tests/*.test.js` (`1` suite)** | `1` | **`1`** | `0` | `0` | `0` | `0` | `0` |
| **4. `backend/src/modules/extrusion/services/*.test.js` (`4` suites: `formulaColorRules`, `queueBatchRules`, `shiftBalance`, `shiftPolicy`)** | `34` | **`34`** | `0` | `0` | `0` | `0` | `0` |
| **5. `backend/src/modules/warehouse/*.test.js` (`2` suites: `inventoryLotReconciliation`, `siloReceiptMovement`)** | `3` | **`3`** | `0` | `0` | `0` | `0` | `0` |
| **6. `backend/test/*.test.js` Restantes de Extrusión, QR y Zona Horaria (`5` suites: `formulaMachinePolicy`, `qr.traceability-tree`, `queueOutputSnapshot`, `siloConsumptionAllocator`, `telares-shift-timezone`)** | `16` | **`16`** | `0` | `0` | `0` | `0` | `0` |
| **7. `backend/test/telares.production-rules.test.js` y `telares.rules.test.js` (`2` suites)** | `22` | **`19`** | **`3`** (`QA-TEL-ROUTE-001`) | `0` | `0` | `0` | `0` |
| **Subtotal Casos Unitarios y Caracterización Backend** | **`96`** | **`93`** | **`3`** | **`0`** | **`0`** | **`0`** | **`0`** |
| **8. Casos de Integración Local Backend (`6` suites en `sistema_enterprise_test`)** | **`6`** | **`4`** | **`1`** (`corteLaminadoFlow:71`) | **`1`** (`extrusionFloor` en QA; `FAIL` en BD desechable en línea 131) | `0` | `0` | `0` |
| **9. Casos Unitarios, Contratos e Integración Frontend (`11` suites `Vitest`)** | **`31`** | **`31`** | **`0`** | **`0`** | `0` | `0` | `0` |
| **TOTAL DE CASOS INDIVIDUALES EN EL PROYECTO** | **`133`** | **`128`** | **`4`** | **`1`** | **`0`** | **`0`** | **`0`** |
