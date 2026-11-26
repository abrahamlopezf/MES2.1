# CONSOLIDACIÓN MAESTRA DE PRUEBAS AUTOMATIZADAS Y SCRIPTS EXPERIMENTALES (FASE E)

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha de Consolidación:** 2026-11-25  
**Ubicaciones Oficiales:** `docs/engineering-readiness/TESTS_CONSOLIDATED.md` y `docs/engineering-readiness/closure-audit/05_TEST_CONSOLIDATION.md`

---

## 0. Resumen Ejecutivo de Estado Tras la Limpieza Física (Fase E & Fase F)

| Categoría de Pruebas / Scripts | Cantidad de Archivos | Estado en el Árbol Activo | Ubicación / Respaldo | Resultado de Ejecución Actual |
| :--- | :---: | :--- | :--- | :--- |
| **1. Suites Unitarias y de Dominio Backend (`node:test`)** | **`14`** | ✅ **CONSERVADAS INTACTAS (100%)** | `backend/test/`, `backend/src/database/tests/`, `backend/src/modules/*/services/` | `73 / 76 PASS` (`3 FAIL` preexistentes en Telares `QA-TEL-ROUTE-001`) |
| **2. Suites de Guardas y Caracterización Backend (`node:test`)** | **`2`** | ✅ **ACTIVAS EN ÁRBOL** | `backend/test/envIsolationGuard.test.js` (`9/9 PASS`) y `backend/test/characterization.contracts.test.js` (`10/10 PASS`) | **`19 / 19 PASS (100%)`** |
| **3. Suites de Integración Local Reversibles Backend (`node:test`)** | **`6`** | ✅ **CONSERVADAS INTACTAS (100%)** | `backend/test/*.local.integration.test.js` (ejecutadas sobre `sistema_enterprise_test`) | `4 PASS / 1 SKIP (extrusionFloor) / 1 FAIL (corteLaminadoFlow:71)` |
| **4. Suites Automatizadas Frontend (`Vitest` + Harness)** | **`11` suites + `3` harness** | ✅ **CONSERVADAS INTACTAS (100%)** | `frontend/src/testing/`, `frontend/src/modules/extrusion/domain/`, `frontend/tests/identity/` | **`11 / 11 suites PASS (31 / 31 tests PASS)`** |
| **5. Scripts Operativos CI/CD y Verificación Local en `backend/src/scripts/`** | **`7`** | ✅ **ACTIVOS EN ÁRBOL** | `validate-migration.js`, `provision-demo-users.js`, `verify-catalog-seed.js`, `dev-check.js`, `master-data-fingerprint.js`, `security-check.js`, `setup-local-db-isolation.js` | **`100% Operativos y Protegidos por dbGuard`** |
| **6. Scripts Experimentales Retirados en Fase F (Lotes F2, F3, F4) y Etapa 1** | **`98`** (`21 .codex-*` + `70 backend/*.js` + `2 src/scripts` + `5 Lote 4`) | 🧹 **RETIRADOS DEL ÁRBOL ACTIVO** | Documentados íntegramente abajo y respaldados con SHA-256 en `scratch/closure_cleanup_vault/` y `scratch/recovery_vault/` | N/A (Conocimiento técnico consolidado; reemplazados por suites `node:test`) |
| **7. Scripts Auxiliares Conservados en Revisión (`backend/scripts/` y `backend/src/scripts/`)** | **`35`** (`13` en `backend/scripts/` + `21` en `backend/src/scripts/` + `1` `generate-catalog-seeder.js`) | 🛡️ **CONSERVADOS EN REVISIÓN** | Inventariados en `FILES_PENDING_REVIEW.md` (incluye 4 scripts con bloqueo `[SECURITY_BLOCK]`) | Conservados por precaución y respeto a edición concurrente de Codex |

---

# Inventario y Consolidación de Pruebas — TraceFlow MES (Fase 3)

## 1. Propósito y Alcance

Este documento consolida la auditoría completa de **todos los archivos de pruebas, validaciones, scripts de diagnóstico y experimentación** del proyecto TraceFlow MES, diferenciando estrictamente entre:
1. **Suites de Pruebas Automatizadas Activas (`31` archivos: `20` en Backend + `11` en Frontend + `3` archivos de soporte/harness en `frontend/src/testing/`)**: Conservadas **100 % intactas** sin modificaciones de código, configuración ni ubicación (Restricción #11).
2. **Scripts Auxiliares, Experimentales, Diagnósticos y Pruebas Manuales (`106` archivos)**: Analizados en modo lectura y consolidados técnicamente en la **Sección 3** con los 13 atributos exigidos por la Fase 3, preservando todo el conocimiento funcional y de reglas de negocio antes de cualquier futura depuración.

---

## 2. Inventario de Pruebas Automatizadas Activas (Conservadas 100 % Intactas)

### 2.1 Pruebas Unitarias de Dominio en Backend (`node:test` — `14` Archivos, `75` Casos)

| # | Archivo | Ubicación | Categoría | Módulo Relacionado | Casos | Estado Actual |
|---:|---|---|---|---|---:|---|
| 1 | `backfill-unambiguous-queue-output-snapshots.test.js` | `backend/src/database/tests/` | Unitaria (Migración SQL) | Extrusión / Migraciones | 1 | **APROBADO (1/1)** |
| 2 | `formulaColorRules.test.js` | `backend/src/modules/extrusion/services/` | Unitaria de Dominio | Extrusión (Colores de Fórmula) | 4 | **APROBADO (4/4)** |
| 3 | `queueBatchRules.test.js` | `backend/src/modules/extrusion/services/` | Unitaria de Dominio | Extrusión (Auto-avance de Colas) | 2 | **APROBADO (2/2)** |
| 4 | `shiftBalance.test.js` | `backend/src/modules/extrusion/services/` | Unitaria de Dominio | Extrusión (Balance de Turno y Merma) | 11 | **APROBADO (11/11)** |
| 5 | `shiftPolicy.test.js` | `backend/src/modules/extrusion/services/` | Unitaria de Dominio | Extrusión (Calendario, Turnos y Relevo) | 16 | **APROBADO (16/16)** |
| 6 | `inventoryLotReconciliation.test.js` | `backend/src/modules/warehouse/` | Unitaria de Dominio | Almacén (Reconciliación Inventario vs Lotes) | 2 | **APROBADO (2/2)** |
| 7 | `siloReceiptMovement.test.js` | `backend/src/modules/warehouse/` | Unitaria de Dominio | Almacén / Silos (Movimientos por Factura) | 1 | **APROBADO (1/1)** |
| 8 | `formulaMachinePolicy.test.js` | `backend/test/` | Unitaria de Dominio | Extrusión (Asignación F-EXT-1 vs Dinámica/Fija) | 4 | **APROBADO (4/4)** |
| 9 | `qr.traceability-tree.test.js` | `backend/test/` | Unitaria de Dominio | QR / Trazabilidad (Ruteo Operativo por Área) | 4 | **APROBADO (4/4)** |
| 10 | `queueOutputSnapshot.test.js` | `backend/test/` | Unitaria de Servicio | Extrusión (Snapshots de Variante PTI en Cola) | 2 | **APROBADO (2/2)** |
| 11 | `siloConsumptionAllocator.test.js` | `backend/test/` | Unitaria de Dominio | Extrusión (Consumo Balanceado 50/50 de 2 Silos) | 4 | **APROBADO (4/4)** |
| 12 | `telares-shift-timezone.test.js` | `backend/test/` | Unitaria de Dominio | Telares (Turnos 07:00, 15:00, 23:00 CDMX) | 2 | **APROBADO (2/2)** |
| 13 | `telares.production-rules.test.js` | `backend/test/` | Unitaria de Dominio | Telares (Conversión m->kg, QR Catálogo, Rutas, Rangos) | 9 | **8 Pass / 1 Fail Preexistente** |
| 14 | `telares.rules.test.js` | `backend/test/` | Unitaria de Dominio y Servicio (con mocks) | Telares (BOM, Demanda PTI, Fileta, Denier 1800, Cierre Corrida) | 13 | **11 Pass / 2 Fail Preexistentes** |

### 2.2 Pruebas de Integración Local Reversibles en Backend (`node:test` — `6` Archivos, `6` Flujos E2E Transaccionales)

Estas 6 pruebas utilizan un patrón de **transacción padre con rollback forzado (`QA_ROLLBACK_FIXTURES`)** y verifican que `sequelize.config.host` sea exclusivamente `127.0.0.1` / `localhost`, omitiéndose por defecto (`skip: !enabled`) a menos que se active su variable `RUN_*=1`:

| # | Archivo | Ubicación | Bandera de Activación | Flujo de Negocio Evaluado |
|---:|---|---|---|---|
| 15 | `corteLaminadoFlow.local.integration.test.js` | `backend/test/` | `RUN_CORTE_LAMINADO_LOCAL_INTEGRATION=1` | Solicitud de rollos desde Corte, bloqueo de entrada directa a Laminado sin orden (`CORTE_ORDER_PICKUP_REQUIRED`), confirmación de recogida física con QR y transformación. |
| 16 | `extrusion-pp-packages.local.integration.test.js` | `backend/test/` | `RUN_EXTRUSION_PP_PACKAGE_INTEGRATION=1` | Planificación FIFO por presentación de empaque (costales/sacos) en ODC y prioridad de consumo de Polipropileno desde WIP en Extrusión antes de consumir silos. |
| 17 | `extrusionFloor.local.integration.test.js` | `backend/test/` | `RUN_EXTRUSION_LOCAL_INTEGRATION=1` | Tablero de colas, ingreso de bobinas PTI compatibles/incompatibles a rack, transición de mezcla con pesaje de purga/remanente y validaciones de cierre de turno. |
| 18 | `extrusionShiftHandoff.local.integration.test.js` | `backend/test/` | `RUN_EXTRUSION_SHIFT_HANDOFF_LOCAL=1` | Cierre de turno saliente y recepción de relevo entrante conservando colas `ACTIVA`/`EN_ESPERA`, códigos QR y saldos sin exigir re-pesaje de mezclas activas. |
| 19 | `extrusionTransfer.local.integration.test.js` | `backend/test/` | `RUN_EXTRUSION_TRANSFER_LOCAL=1` | Traslado de contenedor de mezcla entre extrusoras compatibles conservando identidad QR, saldo remanente y bitácora de auditoría. |
| 20 | `telaresE2E.local.integration.test.js` | `backend/test/` | `RUN_TELARES_LOCAL_E2E=1` | Flujo E2E de Telares: transferencia parcial desde racks PTI $\rightarrow$ carga de fileta (`LoomPtiWip`) $\rightarrow$ corrida de telar $\rightarrow$ producción de rollo viajero con backflush y segmentos por operador. |

### 2.3 Pruebas Automatizadas en Frontend (`Vitest` — `11` Archivos + `3` Archivos de Harness, `31` Casos)

| # | Archivo | Ubicación | Categoría | Módulo / Contrato Evaluado | Casos | Estado |
|---:|---|---|---|---|---:|---|
| 21 | `CapabilityRegistry.unit.test.js` | `frontend/src/testing/runtime/` | Unitaria Runtime | Registro, sobrescritura y resolución de capacidades MES | 5 | **APROBADO** |
| 22 | `EventBus.unit.test.js` | `frontend/src/testing/runtime/` | Unitaria Runtime | Suscripción, desuscripción, aislamiento de excepciones y ráfagas en EventBus | 5 | **APROBADO** |
| 23 | `WorkflowEngine.unit.test.js` | `frontend/src/testing/runtime/` | Unitaria Runtime | Transiciones de estado y ejecución de pasos en WorkflowEngine | 4 | **APROBADO** |
| 24 | `CapabilityRegistry.contract.test.js` | `frontend/src/testing/contracts/` | Contrato Arquitectónico | Cumplimiento de interfaz pública de CapabilityRegistry (Regla de Oro #16 y #19) | 3 | **APROBADO** |
| 25 | `EventBus.contract.test.js` | `frontend/src/testing/contracts/` | Contrato Arquitectónico | Cumplimiento de interfaz `on`, `emit`, `off` de EventBus | 3 | **APROBADO** |
| 26 | `WorkflowEngine.contract.test.js` | `frontend/src/testing/contracts/` | Contrato Arquitectónico | Cumplimiento de contrato de máquina de estados de WorkflowEngine | 2 | **APROBADO** |
| 27 | `Runtime.integration.test.js` | `frontend/src/testing/integration/` | Integración Runtime | Interacción completa CapabilityRegistry + WorkflowEngine + EventBus | 1 | **APROBADO** |
| 28 | `WorkspaceHarness.integration.test.jsx` | `frontend/src/testing/integration/` | Integración UI / QR | Resolución de escaneo QR en ReceptionWorkspace mediante `WorkspaceHarness` | 1 | **APROBADO** |
| 29 | `colorRules.test.ts` | `frontend/src/modules/extrusion/domain/` | Unitaria Dominio UI | Inferencia y normalización de colores de fórmulas en Frontend | 3 | **APROBADO** |
| 30 | `queueOutputVariant.test.ts` | `frontend/src/modules/extrusion/domain/` | Unitaria Dominio UI | Selección y etiquetado de variante PTI de salida en cola de extrusión | 3 | **APROBADO** |
| 31 | `IdentityFacade.test.ts` | `frontend/tests/identity/` | Unitaria Dominio | Generación y validación de lote de identidades QR mediante `IdentityFacade` | 1 | **APROBADO** |

*(Archivos auxiliares de soporte de Vitest conservados intactos: `frontend/src/testing/setup.js`, `frontend/src/testing/harness/RuntimeAssertions.js`, `frontend/src/testing/harness/WorkspaceHarness.jsx`).*

---

## 3. Consolidación Técnica de Pruebas Auxiliares, Experimentales y Scripts de Diagnóstico (`106` Archivos)

A continuación se documenta cada uno de los **106 scripts auxiliares, experimentales, diagnósticos y generadores** detectados en la raíz (`.codex-*`), en `backend/*.js`, en `backend/scripts/*` y en `backend/src/scripts/*`. Todos los fragmentos técnicos han sido sanitizados para excluir credenciales o cadenas de conexión sensibles.

### 3.1 `.codex-create-e2e-db.cjs`
- **Nombre original del archivo**: `.codex-create-e2e-db.cjs`
- **Ubicación original**: `.codex-create-e2e-db.cjs` (1,080 bytes, 15 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Crear copia local aislada de PostgreSQL (`sistema_enterprise_ext_e2e_20261109`) usando `CREATE DATABASE ... TEMPLATE sistema_enterprise` en puerto 5433.
- **Módulo relacionado**: Extrusión / Almacén (ODC, Mezclas, Turnos, Relevo E2E)
- **Requisitos para ejecutarla**: PostgreSQL local en puerto 5433 con BD clonada `sistema_enterprise_ext_e2e_20261109` y servidor Express en `http://127.0.0.1:4001/api`.
- **Datos de entrada**: BD origen `sistema_enterprise` sin sesiones activas.
- **Resultado esperado**: Mensaje `CREATED_ISOLATED_LOCAL_COPY sistema_enterprise_ext_e2e_20261109`.
- **Resultado observado**: Evidencia histórica registrada el 9 de noviembre de 2026 en `error_log.txt` y `backend/.codex-e2e-server.out.log` (12.85 MB, respaldado en bóveda).
- **Dependencias**: `backend/node_modules/dotenv (UNRESOLVED)`, `backend/node_modules/pg (UNRESOLVED)`
- **Casos de negocio evaluados**: Aislamiento de base de datos local para pruebas E2E destructivas.
- **Estado de vigencia**: **EXPERIMENTAL / OBSOLETO (Reemplazado por `backend/test/extrusion*.local.integration.test.js`)**
- **Justificación de conservación o eliminación**: Contiene flujo experimental del 09/11/2026 (9 de ellos tienen contraseñas hardcodeadas). Ya reemplazado por pruebas automatizadas con rollback en `backend/test/`. Consolidado aquí; eliminar con `git rm` en saneamiento de GitHub.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('./backend/node_modules/dotenv').config({ path: 'backend/.env' });
const { Client } = require('./backend/node_modules/pg');
(async () => {
  const name = 'sistema_enterprise_ext_e2e_20261109';
  const client = new Client({ host: '127.0.0.1', port: 5433, database: 'postgres', user: process.env.DB_USER, password: process.env.DB_PASSWORD, ssl: false });
  await client.connect();
  const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
  if (exists.rowCount) { console.log('TEST_DATABASE_ALREADY_EXISTS'); await client.end(); return; }
  const active = await client.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = 'sistema_enterprise' AND pid <> pg_backend_pid()");
  if (active.rows[0].n) throw new Error('Source DB has active sessions: ' + active.rows[0].n);
  await client.query('CREATE DATABASE ' + name + ' TEMPLATE sistema_enterprise OWNER postgres');
  console.log('CREATED_ISOLATED_LOCAL_COPY ' + name);
  await client.end();
})().catch(error => { console.error(error.message); process.exitCode = 1; });
```

---

### 3.2 `.codex-e2e-aftermix.cjs`
- **Nombre original del archivo**: `.codex-e2e-aftermix.cjs`
- **Ubicación original**: `.codex-e2e-aftermix.cjs` (1,875 bytes, 10 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Validar preparación de mezcla dividida en contenedores, encolado en extrusora y vaciado de contenedores hacia racks PTI.
- **Módulo relacionado**: Extrusión / Almacén (ODC, Mezclas, Turnos, Relevo E2E)
- **Requisitos para ejecutarla**: PostgreSQL local en puerto 5433 con BD clonada `sistema_enterprise_ext_e2e_20261109` y servidor Express en `http://127.0.0.1:4001/api`.
- **Datos de entrada**: Folio de preparación `MIX-EXT-*`, QR de racks `QR-E2E-EXT-RACK-20261109-A/B`, `pti_material_id: 23`.
- **Resultado esperado**: Actualización de `process_preparations`, `extruder_queues` y creación de entradas de producción en rack.
- **Resultado observado**: Evidencia histórica registrada el 9 de noviembre de 2026 en `error_log.txt` y `backend/.codex-e2e-server.out.log` (12.85 MB, respaldado en bóveda).
- **Dependencias**: `backend/node_modules/dotenv (UNRESOLVED)`, `backend/node_modules/pg (UNRESOLVED)`
- **Casos de negocio evaluados**: Trazabilidad de mezclas y producción PTI en Extrusión.
- **Estado de vigencia**: **EXPERIMENTAL / OBSOLETO (Reemplazado por `backend/test/extrusion*.local.integration.test.js`)**
- **Justificación de conservación o eliminación**: Contiene flujo experimental del 09/11/2026 (9 de ellos tienen contraseñas hardcodeadas). Ya reemplazado por pruebas automatizadas con rollback en `backend/test/`. Consolidado aquí; eliminar con `git rm` en saneamiento de GitHub.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('./backend/node_modules/dotenv').config({path:'backend/.env'});const{Client}=require('./backend/node_modules/pg');(async()=>{const c=new Client({host:'127.0.0.1',port:5433,database:'sistema_enterprise_ext_e2e_20261109',user:process.env.DB_USER,password:process.env.DB_PASSWORD,ssl:false});await c.connect();for(const q of [
`SELECT id,folio,formula_id,total_quantity,remaining_quantity_kg,status,shift_session_id,destination_qr_code_id FROM process_preparations WHERE folio='MIX-EXT-1794258338807'`,
`SELECT id,extruder_id,consumption_order_qr_id,status,formula_id,process_preparation_id,output_pti_product_id,output_pti_color,shift_session_id,mixture_balance_initial_kg FROM extruder_queues WHERE process_preparation_id=(SELECT id FROM process_preparations WHERE folio='MIX-EXT-1794258338807') ORDER BY id`,
`SELECT material_id,source_silo_id,source_silo_receipt_lot_id,source_lot_number,quantity,unit_cost_snapshot,extended_cost_snapshot FROM process_preparation_inputs WHERE preparation_id=(SELECT id FROM process_preparations WHERE folio='MIX-EXT-1794258338807') ORDER BY id`,
`SELECT q.qr_code,t.quantity_initial,t.quantity_current,t.status,t.metadata FROM traceable_items t JOIN qr_code
```

---

### 3.3 `.codex-e2e-check.cjs`
- **Nombre original del archivo**: `.codex-e2e-check.cjs`
- **Ubicación original**: `.codex-e2e-check.cjs` (1,844 bytes, 9 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Inspeccionar esquema SQL, fórmulas (15, 16, 17), silos, supervisores y códigos QR WIP en la BD clonada E2E.
- **Módulo relacionado**: Extrusión / Almacén (ODC, Mezclas, Turnos, Relevo E2E)
- **Requisitos para ejecutarla**: PostgreSQL local en puerto 5433 con BD clonada `sistema_enterprise_ext_e2e_20261109` y servidor Express en `http://127.0.0.1:4001/api`.
- **Datos de entrada**: Consultas SQL `SELECT` sobre `formulas`, `silos`, `wip_inventories`, `users`.
- **Resultado esperado**: Impresión en JSON de filas y columnas de la BD de prueba.
- **Resultado observado**: Evidencia histórica registrada el 9 de noviembre de 2026 en `error_log.txt` y `backend/.codex-e2e-server.out.log` (12.85 MB, respaldado en bóveda).
- **Dependencias**: `backend/node_modules/dotenv (UNRESOLVED)`, `backend/node_modules/pg (UNRESOLVED)`
- **Casos de negocio evaluados**: Verificación de datos maestros y estado WIP previo/posterior a pruebas E2E.
- **Estado de vigencia**: **EXPERIMENTAL / OBSOLETO (Reemplazado por `backend/test/extrusion*.local.integration.test.js`)**
- **Justificación de conservación o eliminación**: Contiene flujo experimental del 09/11/2026 (9 de ellos tienen contraseñas hardcodeadas). Ya reemplazado por pruebas automatizadas con rollback en `backend/test/`. Consolidado aquí; eliminar con `git rm` en saneamiento de GitHub.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('./backend/node_modules/dotenv').config({path:'backend/.env'});const{Client}=require('./backend/node_modules/pg');(async()=>{const c=new Client({host:'127.0.0.1',port:5433,database:'sistema_enterprise_ext_e2e_20261109',user:process.env.DB_USER,password:process.env.DB_PASSWORD,ssl:false});await c.connect();for(const q of [
`SELECT f.id,f.code,f.name,f.expected_yield_pieces,f.allowed_extruders,f.restricted_extruders,f.extruder_assignment_mode,p.id pti_id,p.code pti_code,p.name pti_name,p.extrusion_machine_id,p.is_active FROM formulas f LEFT JOIN pti_products p ON p.formula_id=f.id AND p.is_active=true WHERE f.id IN (15,16,17) ORDER BY f.id,p.id`,
`SELECT fi.formula_id,fi.material_id,m.name,m.internal_code,fi.quantity,fi.equivalence_tag_id,mat.stock FROM formula_ingredients fi LEFT JOIN materials m ON m.id=fi.material_id LEFT JOIN (SELECT material_id,SUM(quantity) stock FROM material_consumptions WHERE area_id IS NULL GROUP BY material_id) mat ON mat.material_id=m.id WHERE fi.formula_id IN (15,16,17) ORDER BY fi.formula_id,fi.id`,
`SELECT id,shift_date,shift_code,status,supervisor_id,opened_at,closed_at,handoff_ready_at FROM extrusion_shift_sessions ORDER BY created_at DESC LI
```

---

### 3.4 `.codex-e2e-close-shift.cjs`
- **Nombre original del archivo**: `.codex-e2e-close-shift.cjs`
- **Ubicación original**: `.codex-e2e-close-shift.cjs` (2,051 bytes, 13 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Validar apertura, cierre de merma/scrap, relevo de turno (handoff) entre `supervisor_extrusion` y `supervisor_extrusion_e2e`, y continuidad de mezclas.
- **Módulo relacionado**: Extrusión / Almacén (ODC, Mezclas, Turnos, Relevo E2E)
- **Requisitos para ejecutarla**: PostgreSQL local en puerto 5433 con BD clonada `sistema_enterprise_ext_e2e_20261109` y servidor Express en `http://127.0.0.1:4001/api`.
- **Datos de entrada**: Sesión de turno activa, lecturas de merma (`actual_weight_kg`), `extruder_id: 5`, `shift_code: TURNO_1 / TURNO_2`.
- **Resultado esperado**: Conciliación de balance de turno, cierre de sesión (`handoff_ready: true`) y recepción de custodia en el turno entrante.
- **Resultado observado**: Evidencia histórica registrada el 9 de noviembre de 2026 en `error_log.txt` y `backend/.codex-e2e-server.out.log` (12.85 MB, respaldado en bóveda).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Reglas de negocio de relevo de turnos y balance de masa en Extrusión.
- **Estado de vigencia**: **EXPERIMENTAL / OBSOLETO (Reemplazado por `backend/test/extrusion*.local.integration.test.js`)**
- **Justificación de conservación o eliminación**: Contiene flujo experimental del 09/11/2026 (9 de ellos tienen contraseñas hardcodeadas). Ya reemplazado por pruebas automatizadas con rollback en `backend/test/`. Consolidado aquí; eliminar con `git rm` en saneamiento de GitHub.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const base='http://127.0.0.1:4001/api';
async function main(){
 const auth=await(await fetch(`${base}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({identifier:'supervisor_extrusion',password: "[REDACTED]"})})).json();const headers={authorization:`Bearer ${auth.data.token}`,'content-type':'application/json'};
 async function call(method,path,body){const r=await fetch(`${base}${path}`,{method,headers,...(body?{body:JSON.stringify(body)}:{})});const j=await r.json().catch(()=>({}));console.log(`${method} ${path}: ${r.status} ${JSON.stringify(j).slice(0,900)}`);if(!r.ok)throw Error(`${path}: ${j.message||j.error||r.status}`);return j.data;}
 const scrap=await call('POST','/extrusion/scrap',{extruder_id:5,mixture_qr_id:'E2E-EXT-20261109-WHITE-C2',actual_weight_kg:15,reason:'Prueba controlada de cierre de merma por mezcla',category:'MERMA_COLOR',color:'Blanco',shift_code:'TURNO_1',notes:'Dato ficticio E2E: merma pesada 15kg para balancear 485kg útiles del lote de 500kg.'});
 const prod=await call('POST','/extrusion/rack/scan',{rack_qr:'QR-E2E-EXT-RACK-20261109-B',pti_material_id:23,quantity:47,weight_kg:235,mixture_qr:'E2E-EXT-20261109-WHITE-
```

---

### 3.5 `.codex-e2e-complete-batch.cjs`
- **Nombre original del archivo**: `.codex-e2e-complete-batch.cjs`
- **Ubicación original**: `.codex-e2e-complete-batch.cjs` (1,795 bytes, 15 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Validar preparación de mezcla dividida en contenedores, encolado en extrusora y vaciado de contenedores hacia racks PTI.
- **Módulo relacionado**: Extrusión / Almacén (ODC, Mezclas, Turnos, Relevo E2E)
- **Requisitos para ejecutarla**: PostgreSQL local en puerto 5433 con BD clonada `sistema_enterprise_ext_e2e_20261109` y servidor Express en `http://127.0.0.1:4001/api`.
- **Datos de entrada**: Folio de preparación `MIX-EXT-*`, QR de racks `QR-E2E-EXT-RACK-20261109-A/B`, `pti_material_id: 23`.
- **Resultado esperado**: Actualización de `process_preparations`, `extruder_queues` y creación de entradas de producción en rack.
- **Resultado observado**: Evidencia histórica registrada el 9 de noviembre de 2026 en `error_log.txt` y `backend/.codex-e2e-server.out.log` (12.85 MB, respaldado en bóveda).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Trazabilidad de mezclas y producción PTI en Extrusión.
- **Estado de vigencia**: **EXPERIMENTAL / OBSOLETO (Reemplazado por `backend/test/extrusion*.local.integration.test.js`)**
- **Justificación de conservación o eliminación**: Contiene flujo experimental del 09/11/2026 (9 de ellos tienen contraseñas hardcodeadas). Ya reemplazado por pruebas automatizadas con rollback en `backend/test/`. Consolidado aquí; eliminar con `git rm` en saneamiento de GitHub.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const base = 'http://127.0.0.1:4001/api';
async function main() {
  const login = await (await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier: 'supervisor_extrusion', password: "[REDACTED]" }) })).json();
  const headers = { authorization: `Bearer ${login.data.token}`, 'content-type': 'application/json' };
  async function post(path, body) { const r = await fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); console.log(`${path}: ${r.status} ${JSON.stringify(j).slice(0, 1000)}`); return { r, j }; }
  const rack = await post('/extrusion/racks', { rack_code: 'E2E-EXT-RACK-20261109-B', max_capacity: 100, location_name: 'PRUEBA E2E Extrusión' });
  if (!rack.r.ok) throw Error('No se creó el rack secundario.');
  const result = await post('/extrusion/rack/scan', { rack_qr: 'QR-E2E-EXT-RACK-20261109-A', pti_material_id: 23, quantity: 49, weight_kg: 245, mixture_qr: 'E2E-EXT-20261109-WHITE-C1', notes: 'Prueba E2E controlada: vaciado de contenedor 1 dividido' });
  if (!result.r.ok) throw Error('No pudo consumirse por completo el conten
```

---

### 3.6 `.codex-e2e-create-supervisor2.cjs`
- **Nombre original del archivo**: `.codex-e2e-create-supervisor2.cjs`
- **Ubicación original**: `.codex-e2e-create-supervisor2.cjs` (778 bytes, 2 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Inspeccionar esquema SQL, fórmulas (15, 16, 17), silos, supervisores y códigos QR WIP en la BD clonada E2E.
- **Módulo relacionado**: Extrusión / Almacén (ODC, Mezclas, Turnos, Relevo E2E)
- **Requisitos para ejecutarla**: PostgreSQL local en puerto 5433 con BD clonada `sistema_enterprise_ext_e2e_20261109` y servidor Express en `http://127.0.0.1:4001/api`.
- **Datos de entrada**: Consultas SQL `SELECT` sobre `formulas`, `silos`, `wip_inventories`, `users`.
- **Resultado esperado**: Impresión en JSON de filas y columnas de la BD de prueba.
- **Resultado observado**: Evidencia histórica registrada el 9 de noviembre de 2026 en `error_log.txt` y `backend/.codex-e2e-server.out.log` (12.85 MB, respaldado en bóveda).
- **Dependencias**: `backend/node_modules/dotenv (UNRESOLVED)`, `backend/node_modules/pg (UNRESOLVED)`
- **Casos de negocio evaluados**: Verificación de datos maestros y estado WIP previo/posterior a pruebas E2E.
- **Estado de vigencia**: **EXPERIMENTAL / OBSOLETO (Reemplazado por `backend/test/extrusion*.local.integration.test.js`)**
- **Justificación de conservación o eliminación**: Contiene flujo experimental del 09/11/2026 (9 de ellos tienen contraseñas hardcodeadas). Ya reemplazado por pruebas automatizadas con rollback en `backend/test/`. Consolidado aquí; eliminar con `git rm` en saneamiento de GitHub.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('./backend/node_modules/dotenv').config({path:'backend/.env'});const{Client}=require('./backend/node_modules/pg');(async()=>{const c=new Client({host:'127.0.0.1',port:5433,database:'sistema_enterprise_ext_e2e_20261109',user:process.env.DB_USER,password:process.env.DB_PASSWORD,ssl:false});await c.connect();const r=await c.query("INSERT INTO users (first_name,last_name,email,username,password_hash,role_id,is_active,must_change_password,created_at,updated_at) SELECT 'Supervisor E2E','Turno 2','supervisor.e2e.ext2@traceflow.test','supervisor_extrusion_e2e',password_hash,role_id,true,false,now(),now() FROM users WHERE id=51 RETURNING id,username,role_id");console.log(JSON.stringify(r.rows));await c.end()})().catch(e=>{console.error(e.message);process.exitCode=1});

```

---

### 3.7 `.codex-e2e-formula.cjs`
- **Nombre original del archivo**: `.codex-e2e-formula.cjs`
- **Ubicación original**: `.codex-e2e-formula.cjs` (1,309 bytes, 7 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Inspeccionar esquema SQL, fórmulas (15, 16, 17), silos, supervisores y códigos QR WIP en la BD clonada E2E.
- **Módulo relacionado**: Extrusión / Almacén (ODC, Mezclas, Turnos, Relevo E2E)
- **Requisitos para ejecutarla**: PostgreSQL local en puerto 5433 con BD clonada `sistema_enterprise_ext_e2e_20261109` y servidor Express en `http://127.0.0.1:4001/api`.
- **Datos de entrada**: Consultas SQL `SELECT` sobre `formulas`, `silos`, `wip_inventories`, `users`.
- **Resultado esperado**: Impresión en JSON de filas y columnas de la BD de prueba.
- **Resultado observado**: Evidencia histórica registrada el 9 de noviembre de 2026 en `error_log.txt` y `backend/.codex-e2e-server.out.log` (12.85 MB, respaldado en bóveda).
- **Dependencias**: `backend/node_modules/dotenv (UNRESOLVED)`, `backend/node_modules/pg (UNRESOLVED)`
- **Casos de negocio evaluados**: Verificación de datos maestros y estado WIP previo/posterior a pruebas E2E.
- **Estado de vigencia**: **EXPERIMENTAL / OBSOLETO (Reemplazado por `backend/test/extrusion*.local.integration.test.js`)**
- **Justificación de conservación o eliminación**: Contiene flujo experimental del 09/11/2026 (9 de ellos tienen contraseñas hardcodeadas). Ya reemplazado por pruebas automatizadas con rollback en `backend/test/`. Consolidado aquí; eliminar con `git rm` en saneamiento de GitHub.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('./backend/node_modules/dotenv').config({path:'backend/.env'});const{Client}=require('./backend/node_modules/pg');(async()=>{const c=new Client({host:'127.0.0.1',port:5433,database:'sistema_enterprise_ext_e2e_20261109',user:process.env.DB_USER,password:process.env.DB_PASSWORD,ssl:false});await c.connect();for(const q of [
`SELECT fi.formula_id,fi.id ingredient_id,fi.material_id,m.internal_code,m.name,fi.quantity,fi.equivalence_tag_id,COALESCE(w.stock,0) wip_kg FROM formula_ingredients fi LEFT JOIN materials m ON m.id=fi.material_id LEFT JOIN (SELECT material_id,area_id,SUM(amount) stock FROM wip_inventories GROUP BY material_id,area_id) w ON w.material_id=fi.material_id AND w.area_id=(SELECT id FROM areas WHERE code='EXTRUSION' LIMIT 1) WHERE fi.formula_id IN (15,16,17) ORDER BY fi.formula_id,fi.id`,
`SELECT r.id,r.name,r.code FROM roles r JOIN users u ON u.role_id=r.id WHERE u.username='supervisor_extrusion'`,
`SELECT COUNT(*)::int AS active FROM extruder_queues WHERE extruder_id=5 AND status IN ('ACTIVA','EN_ESPERA','PAUSADA')`,
`SELECT column_name FROM information_schema.columns WHERE table_name='wip_inventories' ORDER BY ordinal_position`
]){const x=await c.query(q);con
```

---

### 3.8 `.codex-e2e-inspect.cjs`
- **Nombre original del archivo**: `.codex-e2e-inspect.cjs`
- **Ubicación original**: `.codex-e2e-inspect.cjs` (1,669 bytes, 12 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Inspeccionar esquema SQL, fórmulas (15, 16, 17), silos, supervisores y códigos QR WIP en la BD clonada E2E.
- **Módulo relacionado**: Extrusión / Almacén (ODC, Mezclas, Turnos, Relevo E2E)
- **Requisitos para ejecutarla**: PostgreSQL local en puerto 5433 con BD clonada `sistema_enterprise_ext_e2e_20261109` y servidor Express en `http://127.0.0.1:4001/api`.
- **Datos de entrada**: Consultas SQL `SELECT` sobre `formulas`, `silos`, `wip_inventories`, `users`.
- **Resultado esperado**: Impresión en JSON de filas y columnas de la BD de prueba.
- **Resultado observado**: Evidencia histórica registrada el 9 de noviembre de 2026 en `error_log.txt` y `backend/.codex-e2e-server.out.log` (12.85 MB, respaldado en bóveda).
- **Dependencias**: `backend/node_modules/dotenv (UNRESOLVED)`, `backend/node_modules/pg (UNRESOLVED)`
- **Casos de negocio evaluados**: Verificación de datos maestros y estado WIP previo/posterior a pruebas E2E.
- **Estado de vigencia**: **EXPERIMENTAL / OBSOLETO (Reemplazado por `backend/test/extrusion*.local.integration.test.js`)**
- **Justificación de conservación o eliminación**: Contiene flujo experimental del 09/11/2026 (9 de ellos tienen contraseñas hardcodeadas). Ya reemplazado por pruebas automatizadas con rollback en `backend/test/`. Consolidado aquí; eliminar con `git rm` en saneamiento de GitHub.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('./backend/node_modules/dotenv').config({ path: 'backend/.env' });
const { Client } = require('./backend/node_modules/pg');
(async()=>{const c=new Client({host:'127.0.0.1',port:5433,database:'sistema_enterprise_ext_e2e_20261109',user:process.env.DB_USER,password:process.env.DB_PASSWORD,ssl:false});await c.connect();
for(const q of [
`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND (table_name ILIKE '%tag%' OR table_name ILIKE '%material%' OR table_name ILIKE '%formula%' OR table_name ILIKE '%queue%' OR table_name ILIKE '%shift%' OR table_name ILIKE '%user%' OR table_name ILIKE '%role%') ORDER BY 1`,
`SELECT id,code,name,current_stock_kg,capacity_kg,material_tag_id,is_extrusion_feed,is_active FROM silos ORDER BY id`,
`SELECT id,formula_code,name,batch_size_kg,expected_yield_pieces,extruder_assignment_mode,allowed_extruders,is_active FROM formulas WHERE id=15`,
`SELECT fi.id,fi.material_id,m.name,m.code,fi.quantity_kg,fi.equivalence_tag_id FROM formula_ingredients fi LEFT JOIN materials m ON m.id=fi.material_id WHERE fi.formula_id=15 ORDER BY fi.id`,
`SELECT id,code,name,formula_id,color,expected_weight_kg,allowed_d
```

---

### 3.9 `.codex-e2e-odc-info.cjs`
- **Nombre original del archivo**: `.codex-e2e-odc-info.cjs`
- **Ubicación original**: `.codex-e2e-odc-info.cjs` (938 bytes, 13 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Probar creación, preparación, asignación FIFO de lotes y generación de QR hijo en Órdenes de Consumo (ODC) entre Extrusión y Almacén.
- **Módulo relacionado**: Extrusión / Almacén (ODC, Mezclas, Turnos, Relevo E2E)
- **Requisitos para ejecutarla**: PostgreSQL local en puerto 5433 con BD clonada `sistema_enterprise_ext_e2e_20261109` y servidor Express en `http://127.0.0.1:4001/api`.
- **Datos de entrada**: Credenciales de `supervisor_extrusion` y `admin_alm`, `requesting_area_id: 2`, `material_id` (`1146`, `1222`, `1223`).
- **Resultado esperado**: Creación de ODC (`POST /warehouse/consumption-orders`), transición a `PREPARANDO` y surtido con QR hijo.
- **Resultado observado**: Evidencia histórica registrada el 9 de noviembre de 2026 en `error_log.txt` y `backend/.codex-e2e-server.out.log` (12.85 MB, respaldado en bóveda).
- **Dependencias**: `backend/node_modules/dotenv (UNRESOLVED)`, `backend/node_modules/pg (UNRESOLVED)`
- **Casos de negocio evaluados**: Flujo ODC multi-insumo, reposición y top-off para fórmulas de extrusión.
- **Estado de vigencia**: **EXPERIMENTAL / OBSOLETO (Reemplazado por `backend/test/extrusion*.local.integration.test.js`)**
- **Justificación de conservación o eliminación**: Contiene flujo experimental del 09/11/2026 (9 de ellos tienen contraseñas hardcodeadas). Ya reemplazado por pruebas automatizadas con rollback en `backend/test/`. Consolidado aquí; eliminar con `git rm` en saneamiento de GitHub.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('./backend/node_modules/dotenv').config({ path: 'backend/.env' });
const { Client } = require('./backend/node_modules/pg');
(async () => {
  const client = new Client({ host: '127.0.0.1', port: 5433, database: 'sistema_enterprise_ext_e2e_20261109', user: process.env.DB_USER, password: process.env.DB_PASSWORD, ssl: false });
  await client.connect();
  for (const sql of [
    "SELECT id,code,name FROM areas WHERE upper(code)='EXTRUSION'",
    "SELECT u.id,u.username,r.code AS role_code,r.area_id FROM users u JOIN roles r ON r.id=u.role_id WHERE upper(u.username) LIKE '%ALM%' OR r.code IN ('ADMIN_ALM','ADMIN_ALMACEN','WAREHOUSEMAN') ORDER BY u.id LIMIT 20",
    "SELECT column_name FROM information_schema.columns WHERE table_name='lotes' ORDER BY ordinal_position"
  ]) console.log(JSON.stringify((await client.query(sql)).rows));
  await client.end();
})().catch(e => { console.error(e.message); process.exitCode = 1; });

```

---

### 3.10 `.codex-e2e-odc-multi.cjs`
- **Nombre original del archivo**: `.codex-e2e-odc-multi.cjs`
- **Ubicación original**: `.codex-e2e-odc-multi.cjs` (2,408 bytes, 13 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Probar creación, preparación, asignación FIFO de lotes y generación de QR hijo en Órdenes de Consumo (ODC) entre Extrusión y Almacén.
- **Módulo relacionado**: Extrusión / Almacén (ODC, Mezclas, Turnos, Relevo E2E)
- **Requisitos para ejecutarla**: PostgreSQL local en puerto 5433 con BD clonada `sistema_enterprise_ext_e2e_20261109` y servidor Express en `http://127.0.0.1:4001/api`.
- **Datos de entrada**: Credenciales de `supervisor_extrusion` y `admin_alm`, `requesting_area_id: 2`, `material_id` (`1146`, `1222`, `1223`).
- **Resultado esperado**: Creación de ODC (`POST /warehouse/consumption-orders`), transición a `PREPARANDO` y surtido con QR hijo.
- **Resultado observado**: Evidencia histórica registrada el 9 de noviembre de 2026 en `error_log.txt` y `backend/.codex-e2e-server.out.log` (12.85 MB, respaldado en bóveda).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Flujo ODC multi-insumo, reposición y top-off para fórmulas de extrusión.
- **Estado de vigencia**: **EXPERIMENTAL / OBSOLETO (Reemplazado por `backend/test/extrusion*.local.integration.test.js`)**
- **Justificación de conservación o eliminación**: Contiene flujo experimental del 09/11/2026 (9 de ellos tienen contraseñas hardcodeadas). Ya reemplazado por pruebas automatizadas con rollback en `backend/test/`. Consolidado aquí; eliminar con `git rm` en saneamiento de GitHub.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const base='http://127.0.0.1:4001/api';
async function login(identifier){const r=await fetch(`${base}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({identifier,password: "[REDACTED]"})});const j=await r.json();if(!r.ok||!j.data?.token)throw Error(`login ${identifier}: ${r.status}`);return {authorization:`Bearer ${j.data.token}`,'content-type':'application/json'};}
async function main(){const sup=await login('supervisor_extrusion');const alm=await login('admin_alm');async function req(h,m,p,b){const r=await fetch(`${base}${p}`,{method:m,headers:h,...(b?{body:JSON.stringify(b)}:{})});const j=await r.json().catch(()=>({}));console.log(`${m} ${p}: ${r.status} ${JSON.stringify(j).slice(0,650)}`);if(!r.ok)throw Error(`${j.error||j.message||r.status}`);return j;}
const order=await req(sup,'POST','/warehouse/consumption-orders',{requesting_area_id:2,items:[{material_id:1146,quantity:4.8},{material_id:1223,quantity:4.2}],notes:'E2E Extrusión aislada: segundo surtido FIFO multiinsumo para validar ODC y QR hijo.'});if(!order.uuid)throw Error('sin UUID');
let details=await req(alm,'GET',`/warehouse/consumption-orders/${order.uuid}`);let items=detail
```

---

### 3.11 `.codex-e2e-odc-run.cjs`
- **Nombre original del archivo**: `.codex-e2e-odc-run.cjs`
- **Ubicación original**: `.codex-e2e-odc-run.cjs` (2,885 bytes, 17 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Probar creación, preparación, asignación FIFO de lotes y generación de QR hijo en Órdenes de Consumo (ODC) entre Extrusión y Almacén.
- **Módulo relacionado**: Extrusión / Almacén (ODC, Mezclas, Turnos, Relevo E2E)
- **Requisitos para ejecutarla**: PostgreSQL local en puerto 5433 con BD clonada `sistema_enterprise_ext_e2e_20261109` y servidor Express en `http://127.0.0.1:4001/api`.
- **Datos de entrada**: Credenciales de `supervisor_extrusion` y `admin_alm`, `requesting_area_id: 2`, `material_id` (`1146`, `1222`, `1223`).
- **Resultado esperado**: Creación de ODC (`POST /warehouse/consumption-orders`), transición a `PREPARANDO` y surtido con QR hijo.
- **Resultado observado**: Evidencia histórica registrada el 9 de noviembre de 2026 en `error_log.txt` y `backend/.codex-e2e-server.out.log` (12.85 MB, respaldado en bóveda).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Flujo ODC multi-insumo, reposición y top-off para fórmulas de extrusión.
- **Estado de vigencia**: **EXPERIMENTAL / OBSOLETO (Reemplazado por `backend/test/extrusion*.local.integration.test.js`)**
- **Justificación de conservación o eliminación**: Contiene flujo experimental del 09/11/2026 (9 de ellos tienen contraseñas hardcodeadas). Ya reemplazado por pruebas automatizadas con rollback en `backend/test/`. Consolidado aquí; eliminar con `git rm` en saneamiento de GitHub.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const base='http://127.0.0.1:4001/api';
async function login(identifier){const r=await fetch(`${base}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({identifier,password: "[REDACTED]"})});const j=await r.json();if(!r.ok||!j.data?.token)throw Error(`login ${identifier}: ${r.status} ${j.message||j.error||''}`);return {authorization:`Bearer ${j.data.token}`,'content-type':'application/json'};}
async function main(){
 const sup=await login('supervisor_extrusion');
 const post=async(h,p,b)=>{const r=await fetch(`${base}${p}`,{method:'POST',headers:h,body:JSON.stringify(b)});return [r,await r.json().catch(()=>({}))]};
 const [created,order]=await post(sup,'/warehouse/consumption-orders',{requesting_area_id:2,items:[{material_id:1222,quantity:4.2}],notes:'E2E Extrusión copia local: reposición de carbonato para probar ODC y QR hijo.'});
 console.log('CREATE',created.status,JSON.stringify({order_number:order.order_number,uuid:order.uuid,status:order.status})); if(!created.ok||!order.uuid)throw Error('ODC no pudo crearse.');
 const alm=await login('admin_alm');
 let r=await fetch(`${base}/warehouse/consumption-orders/${order.uuid}`,{headers:alm}); 
```

---

### 3.12 `.codex-e2e-odc-topoff.cjs`
- **Nombre original del archivo**: `.codex-e2e-odc-topoff.cjs`
- **Ubicación original**: `.codex-e2e-odc-topoff.cjs` (1,641 bytes, 7 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Probar creación, preparación, asignación FIFO de lotes y generación de QR hijo en Órdenes de Consumo (ODC) entre Extrusión y Almacén.
- **Módulo relacionado**: Extrusión / Almacén (ODC, Mezclas, Turnos, Relevo E2E)
- **Requisitos para ejecutarla**: PostgreSQL local en puerto 5433 con BD clonada `sistema_enterprise_ext_e2e_20261109` y servidor Express en `http://127.0.0.1:4001/api`.
- **Datos de entrada**: Credenciales de `supervisor_extrusion` y `admin_alm`, `requesting_area_id: 2`, `material_id` (`1146`, `1222`, `1223`).
- **Resultado esperado**: Creación de ODC (`POST /warehouse/consumption-orders`), transición a `PREPARANDO` y surtido con QR hijo.
- **Resultado observado**: Evidencia histórica registrada el 9 de noviembre de 2026 en `error_log.txt` y `backend/.codex-e2e-server.out.log` (12.85 MB, respaldado en bóveda).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Flujo ODC multi-insumo, reposición y top-off para fórmulas de extrusión.
- **Estado de vigencia**: **EXPERIMENTAL / OBSOLETO (Reemplazado por `backend/test/extrusion*.local.integration.test.js`)**
- **Justificación de conservación o eliminación**: Contiene flujo experimental del 09/11/2026 (9 de ellos tienen contraseñas hardcodeadas). Ya reemplazado por pruebas automatizadas con rollback en `backend/test/`. Consolidado aquí; eliminar con `git rm` en saneamiento de GitHub.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const base='http://127.0.0.1:4001/api';
async function login(identifier){const r=await fetch(`${base}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({identifier,password: "[REDACTED]"})});const j=await r.json();if(!r.ok||!j.data?.token)throw Error(`login ${identifier}: ${r.status}`);return {authorization:`Bearer ${j.data.token}`,'content-type':'application/json'};}
async function main(){const sup=await login('supervisor_extrusion'),alm=await login('admin_alm');async function req(h,m,p,b){const r=await fetch(`${base}${p}`,{method:m,headers:h,...(b?{body:JSON.stringify(b)}:{})});const j=await r.json().catch(()=>({}));console.log(`${m} ${p}: ${r.status} ${JSON.stringify(j).slice(0,450)}`);if(!r.ok)throw Error(j.error||j.message||String(r.status));return j;}
const o=await req(sup,'POST','/warehouse/consumption-orders',{requesting_area_id:2,items:[{material_id:1146,quantity:1.2}],notes:'E2E Extrusión aislada: completar ingrediente masterbatch restante de fórmula blanca.'});
let d=await req(alm,'GET',`/warehouse/consumption-orders/${o.uuid}`);await req(alm,'PUT',`/warehouse/consumption-orders/${o.uuid}/status`,{status:'PREPARANDO'});d=await req
```

---

### 3.13 `.codex-e2e-open-shift2.cjs`
- **Nombre original del archivo**: `.codex-e2e-open-shift2.cjs`
- **Ubicación original**: `.codex-e2e-open-shift2.cjs` (876 bytes, 2 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Validar apertura, cierre de merma/scrap, relevo de turno (handoff) entre `supervisor_extrusion` y `supervisor_extrusion_e2e`, y continuidad de mezclas.
- **Módulo relacionado**: Extrusión / Almacén (ODC, Mezclas, Turnos, Relevo E2E)
- **Requisitos para ejecutarla**: PostgreSQL local en puerto 5433 con BD clonada `sistema_enterprise_ext_e2e_20261109` y servidor Express en `http://127.0.0.1:4001/api`.
- **Datos de entrada**: Sesión de turno activa, lecturas de merma (`actual_weight_kg`), `extruder_id: 5`, `shift_code: TURNO_1 / TURNO_2`.
- **Resultado esperado**: Conciliación de balance de turno, cierre de sesión (`handoff_ready: true`) y recepción de custodia en el turno entrante.
- **Resultado observado**: Evidencia histórica registrada el 9 de noviembre de 2026 en `error_log.txt` y `backend/.codex-e2e-server.out.log` (12.85 MB, respaldado en bóveda).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Reglas de negocio de relevo de turnos y balance de masa en Extrusión.
- **Estado de vigencia**: **EXPERIMENTAL / OBSOLETO (Reemplazado por `backend/test/extrusion*.local.integration.test.js`)**
- **Justificación de conservación o eliminación**: Contiene flujo experimental del 09/11/2026 (9 de ellos tienen contraseñas hardcodeadas). Ya reemplazado por pruebas automatizadas con rollback en `backend/test/`. Consolidado aquí; eliminar con `git rm` en saneamiento de GitHub.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const base='http://127.0.0.1:4001/api';(async()=>{const lr=await fetch(`${base}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({identifier:'supervisor_extrusion_e2e',password: "[REDACTED]"})});const login=await lr.json();if(!lr.ok||!login.data?.token)throw Error(`login ${lr.status}`);const h={authorization:`Bearer ${login.data.token}`,'content-type':'application/json'};for(const [m,p,b] of [['POST','/extrusion/shifts/session/entry',{}],['POST','/extrusion/shifts/session/open',{shift_date:'2026-11-09',shift_code:'TURNO_2'}]]){const r=await fetch(base+p,{method:m,headers:h,body:JSON.stringify(b)});const j=await r.json();console.log(p,r.status,JSON.stringify(j).slice(0,1100));if(p.endsWith('/open')&&!r.ok)throw Error(j.message||j.error||r.status)}})().catch(e=>{console.error('E2E-SHIFT2-FAIL',e.message);process.exitCode=1});

```

---

### 3.14 `.codex-e2e-run-api.cjs`
- **Nombre original del archivo**: `.codex-e2e-run-api.cjs`
- **Ubicación original**: `.codex-e2e-run-api.cjs` (2,450 bytes, 30 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Validar preparación de mezcla dividida en contenedores, encolado en extrusora y vaciado de contenedores hacia racks PTI.
- **Módulo relacionado**: Extrusión / Almacén (ODC, Mezclas, Turnos, Relevo E2E)
- **Requisitos para ejecutarla**: PostgreSQL local en puerto 5433 con BD clonada `sistema_enterprise_ext_e2e_20261109` y servidor Express en `http://127.0.0.1:4001/api`.
- **Datos de entrada**: Folio de preparación `MIX-EXT-*`, QR de racks `QR-E2E-EXT-RACK-20261109-A/B`, `pti_material_id: 23`.
- **Resultado esperado**: Actualización de `process_preparations`, `extruder_queues` y creación de entradas de producción en rack.
- **Resultado observado**: Evidencia histórica registrada el 9 de noviembre de 2026 en `error_log.txt` y `backend/.codex-e2e-server.out.log` (12.85 MB, respaldado en bóveda).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Trazabilidad de mezclas y producción PTI en Extrusión.
- **Estado de vigencia**: **EXPERIMENTAL / OBSOLETO (Reemplazado por `backend/test/extrusion*.local.integration.test.js`)**
- **Justificación de conservación o eliminación**: Contiene flujo experimental del 09/11/2026 (9 de ellos tienen contraseñas hardcodeadas). Ya reemplazado por pruebas automatizadas con rollback en `backend/test/`. Consolidado aquí; eliminar con `git rm` en saneamiento de GitHub.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const base = 'http://127.0.0.1:4001/api';
async function main() {
  const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identifier: 'supervisor_extrusion', password: "[REDACTED]" }) });
  const auth = await login.json();
  const token = auth.data?.token;
  if (!login.ok || !token) throw new Error(`login ${login.status}: ${auth.message || 'no token'}`);
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  async function call(method, path, body) {
    const response = await fetch(`${base}${path}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json().catch(() => ({}));
    console.log(`${method} ${path}: ${response.status} ${JSON.stringify(result).slice(0, 1200)}`);
    return { response, result };
  }
  const queues = await call('GET', '/extrusion/queue');
```

---

### 3.15 `.codex-e2e-schema.cjs`
- **Nombre original del archivo**: `.codex-e2e-schema.cjs`
- **Ubicación original**: `.codex-e2e-schema.cjs` (1,302 bytes, 16 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Inspeccionar esquema SQL, fórmulas (15, 16, 17), silos, supervisores y códigos QR WIP en la BD clonada E2E.
- **Módulo relacionado**: Extrusión / Almacén (ODC, Mezclas, Turnos, Relevo E2E)
- **Requisitos para ejecutarla**: PostgreSQL local en puerto 5433 con BD clonada `sistema_enterprise_ext_e2e_20261109` y servidor Express en `http://127.0.0.1:4001/api`.
- **Datos de entrada**: Consultas SQL `SELECT` sobre `formulas`, `silos`, `wip_inventories`, `users`.
- **Resultado esperado**: Impresión en JSON de filas y columnas de la BD de prueba.
- **Resultado observado**: Evidencia histórica registrada el 9 de noviembre de 2026 en `error_log.txt` y `backend/.codex-e2e-server.out.log` (12.85 MB, respaldado en bóveda).
- **Dependencias**: `backend/node_modules/dotenv (UNRESOLVED)`, `backend/node_modules/pg (UNRESOLVED)`
- **Casos de negocio evaluados**: Verificación de datos maestros y estado WIP previo/posterior a pruebas E2E.
- **Estado de vigencia**: **EXPERIMENTAL / OBSOLETO (Reemplazado por `backend/test/extrusion*.local.integration.test.js`)**
- **Justificación de conservación o eliminación**: Contiene flujo experimental del 09/11/2026 (9 de ellos tienen contraseñas hardcodeadas). Ya reemplazado por pruebas automatizadas con rollback en `backend/test/`. Consolidado aquí; eliminar con `git rm` en saneamiento de GitHub.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('./backend/node_modules/dotenv').config({ path: 'backend/.env' });
const { Client } = require('./backend/node_modules/pg');
(async () => {
 const c = new Client({ host:'127.0.0.1', port:5433, database:'sistema_enterprise_ext_e2e_20261109', user:process.env.DB_USER, password:process.env.DB_PASSWORD, ssl:false });
 await c.connect();
 for (const t of ['formulas','formula_ingredients','materials','pti_products','users','roles','extruder_queues','process_preparations','extrusion_shift_sessions','extrusion_production_entries','pti_racks','silo_receipt_lots']) {
  const cols=await c.query('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position',['public',t]);
  console.log(t+': '+cols.rows.map(x=>x.column_name).join(', '));
 }
 for (const [t,where] of [['formulas','id=15'],['formula_ingredients','formula_id=15'],['pti_products','true'],['users',"username IN ('admin','nexus','admin_extrusion','supervisor_extrusion')"]]) {
  try { const x=await c.query('SELECT to_jsonb(t) AS row FROM '+t+' t WHERE '+where+' LIMIT 30'); console.log('DATA '+t+' '+JSON.stringify(x.rows.map(r=>r.row))); }
  catch(e) { console.log('DATAERR '+
```

---

### 3.16 `.codex-e2e-shift-setup.cjs`
- **Nombre original del archivo**: `.codex-e2e-shift-setup.cjs`
- **Ubicación original**: `.codex-e2e-shift-setup.cjs` (967 bytes, 2 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Validar apertura, cierre de merma/scrap, relevo de turno (handoff) entre `supervisor_extrusion` y `supervisor_extrusion_e2e`, y continuidad de mezclas.
- **Módulo relacionado**: Extrusión / Almacén (ODC, Mezclas, Turnos, Relevo E2E)
- **Requisitos para ejecutarla**: PostgreSQL local en puerto 5433 con BD clonada `sistema_enterprise_ext_e2e_20261109` y servidor Express en `http://127.0.0.1:4001/api`.
- **Datos de entrada**: Sesión de turno activa, lecturas de merma (`actual_weight_kg`), `extruder_id: 5`, `shift_code: TURNO_1 / TURNO_2`.
- **Resultado esperado**: Conciliación de balance de turno, cierre de sesión (`handoff_ready: true`) y recepción de custodia en el turno entrante.
- **Resultado observado**: Evidencia histórica registrada el 9 de noviembre de 2026 en `error_log.txt` y `backend/.codex-e2e-server.out.log` (12.85 MB, respaldado en bóveda).
- **Dependencias**: `backend/node_modules/dotenv (UNRESOLVED)`, `backend/node_modules/pg (UNRESOLVED)`
- **Casos de negocio evaluados**: Reglas de negocio de relevo de turnos y balance de masa en Extrusión.
- **Estado de vigencia**: **EXPERIMENTAL / OBSOLETO (Reemplazado por `backend/test/extrusion*.local.integration.test.js`)**
- **Justificación de conservación o eliminación**: Contiene flujo experimental del 09/11/2026 (9 de ellos tienen contraseñas hardcodeadas). Ya reemplazado por pruebas automatizadas con rollback en `backend/test/`. Consolidado aquí; eliminar con `git rm` en saneamiento de GitHub.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('./backend/node_modules/dotenv').config({path:'backend/.env'});const{Client}=require('./backend/node_modules/pg');(async()=>{const c=new Client({host:'127.0.0.1',port:5433,database:'sistema_enterprise_ext_e2e_20261109',user:process.env.DB_USER,password:process.env.DB_PASSWORD,ssl:false});await c.connect();const q=await c.query("SELECT 1 FROM extrusion_shift_sessions WHERE shift_date='2026-11-05' AND shift_code='TURNO_2'");if(!q.rowCount){await c.query("INSERT INTO extrusion_shift_sessions (shift_date,shift_code,status,supervisor_id,opened_at,closed_at,closed_by,closing_snapshot,created_at,updated_at) VALUES ('2026-11-05','TURNO_2','CERRADO',57,'2026-11-05T18:00:00Z','2026-11-06T06:00:00Z',57,'{\"e2eSyntheticHistory\":true}'::jsonb,now(),now())");console.log('Added synthetic completed Turno 2 only to isolated clone');}else console.log('Synthetic history already present');await c.end()})().catch(e=>{console.error(e.message);process.exitCode=1});

```

---

### 3.17 `.codex-e2e-supervisors.cjs`
- **Nombre original del archivo**: `.codex-e2e-supervisors.cjs`
- **Ubicación original**: `.codex-e2e-supervisors.cjs` (597 bytes, 2 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Inspeccionar esquema SQL, fórmulas (15, 16, 17), silos, supervisores y códigos QR WIP en la BD clonada E2E.
- **Módulo relacionado**: Extrusión / Almacén (ODC, Mezclas, Turnos, Relevo E2E)
- **Requisitos para ejecutarla**: PostgreSQL local en puerto 5433 con BD clonada `sistema_enterprise_ext_e2e_20261109` y servidor Express en `http://127.0.0.1:4001/api`.
- **Datos de entrada**: Consultas SQL `SELECT` sobre `formulas`, `silos`, `wip_inventories`, `users`.
- **Resultado esperado**: Impresión en JSON de filas y columnas de la BD de prueba.
- **Resultado observado**: Evidencia histórica registrada el 9 de noviembre de 2026 en `error_log.txt` y `backend/.codex-e2e-server.out.log` (12.85 MB, respaldado en bóveda).
- **Dependencias**: `backend/node_modules/dotenv (UNRESOLVED)`, `backend/node_modules/pg (UNRESOLVED)`
- **Casos de negocio evaluados**: Verificación de datos maestros y estado WIP previo/posterior a pruebas E2E.
- **Estado de vigencia**: **EXPERIMENTAL / OBSOLETO (Reemplazado por `backend/test/extrusion*.local.integration.test.js`)**
- **Justificación de conservación o eliminación**: Contiene flujo experimental del 09/11/2026 (9 de ellos tienen contraseñas hardcodeadas). Ya reemplazado por pruebas automatizadas con rollback en `backend/test/`. Consolidado aquí; eliminar con `git rm` en saneamiento de GitHub.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('./backend/node_modules/dotenv').config({path:'backend/.env'});const{Client}=require('./backend/node_modules/pg');(async()=>{const c=new Client({host:'127.0.0.1',port:5433,database:'sistema_enterprise_ext_e2e_20261109',user:process.env.DB_USER,password:process.env.DB_PASSWORD,ssl:false});await c.connect();const r=await c.query("SELECT u.id,u.username,r.code,r.area_id,u.is_active FROM users u JOIN roles r ON r.id=u.role_id WHERE r.code='SUPERVISOR_EXTRUSION' ORDER BY u.id");console.log(JSON.stringify(r.rows));await c.end()})().catch(e=>{console.error(e.message);process.exitCode=1});

```

---

### 3.18 `.codex-e2e-turn-handoff-resume.cjs`
- **Nombre original del archivo**: `.codex-e2e-turn-handoff-resume.cjs`
- **Ubicación original**: `.codex-e2e-turn-handoff-resume.cjs` (2,067 bytes, 9 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Validar apertura, cierre de merma/scrap, relevo de turno (handoff) entre `supervisor_extrusion` y `supervisor_extrusion_e2e`, y continuidad de mezclas.
- **Módulo relacionado**: Extrusión / Almacén (ODC, Mezclas, Turnos, Relevo E2E)
- **Requisitos para ejecutarla**: PostgreSQL local en puerto 5433 con BD clonada `sistema_enterprise_ext_e2e_20261109` y servidor Express en `http://127.0.0.1:4001/api`.
- **Datos de entrada**: Sesión de turno activa, lecturas de merma (`actual_weight_kg`), `extruder_id: 5`, `shift_code: TURNO_1 / TURNO_2`.
- **Resultado esperado**: Conciliación de balance de turno, cierre de sesión (`handoff_ready: true`) y recepción de custodia en el turno entrante.
- **Resultado observado**: Evidencia histórica registrada el 9 de noviembre de 2026 en `error_log.txt` y `backend/.codex-e2e-server.out.log` (12.85 MB, respaldado en bóveda).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Reglas de negocio de relevo de turnos y balance de masa en Extrusión.
- **Estado de vigencia**: **EXPERIMENTAL / OBSOLETO (Reemplazado por `backend/test/extrusion*.local.integration.test.js`)**
- **Justificación de conservación o eliminación**: Contiene flujo experimental del 09/11/2026 (9 de ellos tienen contraseñas hardcodeadas). Ya reemplazado por pruebas automatizadas con rollback en `backend/test/`. Consolidado aquí; eliminar con `git rm` en saneamiento de GitHub.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const base='http://127.0.0.1:4001/api';async function login(id){const r=await fetch(`${base}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({identifier:id,password: "[REDACTED]"})});const j=await r.json();if(!r.ok||!j.data?.token)throw Error(`login ${r.status}`);return{authorization:`Bearer ${j.data.token}`,'content-type':'application/json'};}
(async()=>{const out=await login('supervisor_extrusion_e2e'),inH=await login('supervisor_extrusion');async function c(h,m,p,b){const r=await fetch(`${base}${p}`,{method:m,headers:h,...(b?{body:JSON.stringify(b)}:{})});const j=await r.json();console.log(p,r.status,JSON.stringify(j).slice(0,1100));if(!r.ok)throw Error(j.message||j.error||r.status);return j.data;}
await c(out,'POST','/extrusion/shifts/close',{extruder_id:5,shift_date:'2026-11-09',shift_code:'TURNO_2',shift_session_id:6,actual_scrap_weight_kg:0,notes:'Cierre E2E aislado: no se produjo PTI ni se generó scrap antes del relevo.'});
const ready=await c(out,'POST','/extrusion/shifts/session/6/close',{});if(!ready.handoff_ready)throw Error('no quedó listo');
const entry=await c(inH,'POST','/extrusion/shifts/session/entry',{});const s=entry.su
```

---

### 3.19 `.codex-e2e-turn-handoff.cjs`
- **Nombre original del archivo**: `.codex-e2e-turn-handoff.cjs`
- **Ubicación original**: `.codex-e2e-turn-handoff.cjs` (3,641 bytes, 22 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Validar apertura, cierre de merma/scrap, relevo de turno (handoff) entre `supervisor_extrusion` y `supervisor_extrusion_e2e`, y continuidad de mezclas.
- **Módulo relacionado**: Extrusión / Almacén (ODC, Mezclas, Turnos, Relevo E2E)
- **Requisitos para ejecutarla**: PostgreSQL local en puerto 5433 con BD clonada `sistema_enterprise_ext_e2e_20261109` y servidor Express en `http://127.0.0.1:4001/api`.
- **Datos de entrada**: Sesión de turno activa, lecturas de merma (`actual_weight_kg`), `extruder_id: 5`, `shift_code: TURNO_1 / TURNO_2`.
- **Resultado esperado**: Conciliación de balance de turno, cierre de sesión (`handoff_ready: true`) y recepción de custodia en el turno entrante.
- **Resultado observado**: Evidencia histórica registrada el 9 de noviembre de 2026 en `error_log.txt` y `backend/.codex-e2e-server.out.log` (12.85 MB, respaldado en bóveda).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Reglas de negocio de relevo de turnos y balance de masa en Extrusión.
- **Estado de vigencia**: **EXPERIMENTAL / OBSOLETO (Reemplazado por `backend/test/extrusion*.local.integration.test.js`)**
- **Justificación de conservación o eliminación**: Contiene flujo experimental del 09/11/2026 (9 de ellos tienen contraseñas hardcodeadas). Ya reemplazado por pruebas automatizadas con rollback en `backend/test/`. Consolidado aquí; eliminar con `git rm` en saneamiento de GitHub.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const base='http://127.0.0.1:4001/api';
async function login(id){const r=await fetch(`${base}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({identifier:id,password: "[REDACTED]"})});const j=await r.json();if(!r.ok||!j.data?.token)throw Error(`login ${id}: ${r.status}`);return {authorization:`Bearer ${j.data.token}`,'content-type':'application/json'};}
async function main(){const receiver=await login('supervisor_extrusion'),outgoing=await login('supervisor_extrusion_e2e');async function call(h,m,p,b){const r=await fetch(`${base}${p}`,{method:m,headers:h,...(b?{body:JSON.stringify(b)}:{})});const j=await r.json().catch(()=>({}));console.log(`${m} ${p}: ${r.status} ${JSON.stringify(j).slice(0,750)}`);if(!r.ok)throw Error(j.message||j.error||String(r.status));return j.data;}
const w=await call(outgoing,'GET','/extrusion/wip/inventory');const wanted=new Set([1222,1146,1223]);console.log('AVAILABLE_QRS',JSON.stringify(w.items.filter(x=>wanted.has(Number(x.material_id))).map(x=>({material_id:x.material_id,amount:x.amount_kg,qr:x.qr_code}))));
const inputs=[
 {material_id:1222,quantity:4.2,qr_code:'QR-LOT-CARB-1792473242013-87587-SN14'},
 {mater
```

---

### 3.20 `.codex-e2e-wipqr.cjs`
- **Nombre original del archivo**: `.codex-e2e-wipqr.cjs`
- **Ubicación original**: `.codex-e2e-wipqr.cjs` (1,187 bytes, 2 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Inspeccionar esquema SQL, fórmulas (15, 16, 17), silos, supervisores y códigos QR WIP en la BD clonada E2E.
- **Módulo relacionado**: Extrusión / Almacén (ODC, Mezclas, Turnos, Relevo E2E)
- **Requisitos para ejecutarla**: PostgreSQL local en puerto 5433 con BD clonada `sistema_enterprise_ext_e2e_20261109` y servidor Express en `http://127.0.0.1:4001/api`.
- **Datos de entrada**: Consultas SQL `SELECT` sobre `formulas`, `silos`, `wip_inventories`, `users`.
- **Resultado esperado**: Impresión en JSON de filas y columnas de la BD de prueba.
- **Resultado observado**: Evidencia histórica registrada el 9 de noviembre de 2026 en `error_log.txt` y `backend/.codex-e2e-server.out.log` (12.85 MB, respaldado en bóveda).
- **Dependencias**: `backend/node_modules/dotenv (UNRESOLVED)`, `backend/node_modules/pg (UNRESOLVED)`
- **Casos de negocio evaluados**: Verificación de datos maestros y estado WIP previo/posterior a pruebas E2E.
- **Estado de vigencia**: **EXPERIMENTAL / OBSOLETO (Reemplazado por `backend/test/extrusion*.local.integration.test.js`)**
- **Justificación de conservación o eliminación**: Contiene flujo experimental del 09/11/2026 (9 de ellos tienen contraseñas hardcodeadas). Ya reemplazado por pruebas automatizadas con rollback en `backend/test/`. Consolidado aquí; eliminar con `git rm` en saneamiento de GitHub.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('./backend/node_modules/dotenv').config({path:'backend/.env'});const{Client}=require('./backend/node_modules/pg');(async()=>{const c=new Client({host:'127.0.0.1',port:5433,database:'sistema_enterprise_ext_e2e_20261109',user:process.env.DB_USER,password:process.env.DB_PASSWORD,ssl:false});await c.connect();for(const t of ['qr_codes','areas','process_preparation_inputs','inventory_movements','extrusion_production_entries','extrusion_transitions','extrusion_scrap_logs']){const x=await c.query('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position',['public',t]);console.log(t+': '+x.rows.map(r=>r.column_name).join(','))}const q=await c.query("SELECT w.id,w.material_id,m.internal_code,m.name,w.lote_id,w.amount,w.area_id,q.qr_code,q.status AS qr_status FROM wip_inventories w JOIN materials m ON m.id=w.material_id JOIN qr_codes q ON q.id=w.qr_code_id WHERE w.area_id=(SELECT id FROM areas WHERE code='EXTRUSION' LIMIT 1) AND w.material_id IN (1222,1146,1223) AND w.amount>0 ORDER BY w.id");console.log('WIPQR '+JSON.stringify(q.rows));await c.end()})().catch(e=>{console.error(e.message);process.exitCode=1});

```

---

### 3.21 `.codex-e2e-server.cjs`
- **Nombre original del archivo**: `.codex-e2e-server.cjs`
- **Ubicación original**: `backend/.codex-e2e-server.cjs` (309 bytes, 4 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Levantar `backend/src/server.js` apuntando al puerto 4001 y a la BD clonada `sistema_enterprise_ext_e2e_20261109` en `127.0.0.1:5433`.
- **Módulo relacionado**: Extrusión / Almacén (ODC, Mezclas, Turnos, Relevo E2E)
- **Requisitos para ejecutarla**: PostgreSQL local en puerto 5433 con BD clonada `sistema_enterprise_ext_e2e_20261109` y servidor Express en `http://127.0.0.1:4001/api`.
- **Datos de entrada**: Variables de entorno inyectadas en `process.env`.
- **Resultado esperado**: Servidor Express escuchando en puerto 4001.
- **Resultado observado**: Evidencia histórica registrada el 9 de noviembre de 2026 en `error_log.txt` y `backend/.codex-e2e-server.out.log` (12.85 MB, respaldado en bóveda).
- **Dependencias**: `backend/src/server.js`
- **Casos de negocio evaluados**: Ejecución aislada de backend E2E.
- **Estado de vigencia**: **EXPERIMENTAL / OBSOLETO (Reemplazado por `backend/test/extrusion*.local.integration.test.js`)**
- **Justificación de conservación o eliminación**: Contiene flujo experimental del 09/11/2026 (9 de ellos tienen contraseñas hardcodeadas). Ya reemplazado por pruebas automatizadas con rollback en `backend/test/`. Consolidado aquí; eliminar con `git rm` en saneamiento de GitHub.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
Object.assign(process.env, { NODE_ENV:'development', DATABASE_URL:'', DB_HOST:'127.0.0.1', DB_PORT:'5433', DB_NAME:'sistema_enterprise_ext_e2e_20261109', PORT:'4001', CLIENT_URL:'http://127.0.0.1:5174' });
require('./src/server');

```

---

### 3.22 `assign_perm.js`
- **Nombre original del archivo**: `assign_perm.js`
- **Ubicación original**: `backend/assign_perm.js` (1,349 bytes, 38 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize, Role, Permission } = require('./src/database/models');

async function run() {
  try {
    const role = await Role.findOne({ where: { code: 'ADMIN_ALM' } });
    if (!role) {
      console.log('Role ADMIN_ALM not found');
      process.exit(1);
    }
    
    // Ensure permission exists
    let permission = await Permission.findOne({ where: { code: 'materials.delete' } });
    if (!permission) {
      permission = await Permission.create({
```

---

### 3.23 `check-db.js`
- **Nombre original del archivo**: `check-db.js`
- **Ubicación original**: `backend/check-db.js` (1,106 bytes, 37 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
if (!process.env.REMOTE_DATABASE_URL) throw new Error('REMOTE_DATABASE_URL is required for this script.');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.REMOTE_DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});
```

---

### 3.24 `check-db2.js`
- **Nombre original del archivo**: `check-db2.js`
- **Ubicación original**: `backend/check-db2.js` (1,082 bytes, 36 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
if (!process.env.REMOTE_DATABASE_URL) throw new Error('REMOTE_DATABASE_URL is required for this script.');
const { Sequelize } = require('sequelize');
const fs = require('fs');

const sequelize = new Sequelize(process.env.REMOTE_DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
```

---

### 3.25 `check-locks.js`
- **Nombre original del archivo**: `check-locks.js`
- **Ubicación original**: `backend/check-locks.js` (391 bytes, 13 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const db = require('./src/database/models');
async function run() {
  const [locks] = await db.sequelize.query(`
    SELECT l.relation::regclass, l.mode, l.granted, a.query, a.state, a.pid
    FROM pg_locks l
    JOIN pg_stat_activity a ON l.pid = a.pid
    WHERE l.relation::regclass::text IN ('roles', 'users', 'subareas')
  `);
  console.log('Locks:', locks);
  process.exit(0);
}
run();

```

---

### 3.26 `check-prod.js`
- **Nombre original del archivo**: `check-prod.js`
- **Ubicación original**: `backend/check-prod.js` (1,188 bytes, 37 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
if (!process.env.REMOTE_DATABASE_URL) throw new Error('REMOTE_DATABASE_URL is required for this script.');
const { Sequelize } = require('sequelize');
const fs = require('fs');

const sequelize = new Sequelize(process.env.REMOTE_DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  },
  logging: false
});

async function run() {
```

---

### 3.27 `check-prod2.js`
- **Nombre original del archivo**: `check-prod2.js`
- **Ubicación original**: `backend/check-prod2.js` (961 bytes, 29 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
if (!process.env.REMOTE_DATABASE_URL) throw new Error('REMOTE_DATABASE_URL is required for this script.');
const { Sequelize } = require('sequelize');
const fs = require('fs');

const sequelize = new Sequelize(process.env.REMOTE_DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

async function run() {
  let log = '';
  try {
```

---

### 3.28 `check.js`
- **Nombre original del archivo**: `check.js`
- **Ubicación original**: `backend/check.js` (559 bytes, 13 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DB_NAME || 'sistema_enterprise', process.env.DB_USER || 'postgres', process.env.DB_PASSWORD, {host: process.env.DB_HOST || 'localhost', dialect: 'postgres', logging: false});

async function main() {
    const fam = await s.query("SELECT * FROM material_families WHERE code='LIM-'");
    const code = await s.query("SELECT * FROM material_codes WHERE code='ESC-002'");
    console.log(fam[0]);
    console.log(code[0]);
    process.exit(0);
}
main();

```

---

### 3.29 `check_areas.js`
- **Nombre original del archivo**: `check_areas.js`
- **Ubicación original**: `backend/check_areas.js` (220 bytes, 5 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize } = require('./src/database/models');
sequelize.query(`SELECT id, name FROM areas;`)
  .then(res => { console.log(res[0]); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });

```

---

### 3.30 `check_fk.js`
- **Nombre original del archivo**: `check_fk.js`
- **Ubicación original**: `backend/check_fk.js` (1,244 bytes, 41 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
if (!process.env.REMOTE_DATABASE_URL) throw new Error('REMOTE_DATABASE_URL is required for this script.');
const { Client } = require('pg');

async function getNeonSchema() {
  const neonClient = new Client({
    connectionString: process.env.REMOTE_DATABASE_URL
  });

  try {
    await neonClient.connect();
    
    const res = await neonClient.query(`
      SELECT
```

---

### 3.31 `check_mat.js`
- **Nombre original del archivo**: `check_mat.js`
- **Ubicación original**: `backend/check_mat.js` (456 bytes, 11 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DB_NAME || 'sistema_enterprise', process.env.DB_USER || 'postgres', process.env.DB_PASSWORD, {host: process.env.DB_HOST || 'localhost', dialect: 'postgres', logging: false});

async function main() {
    const mat = await s.query("SELECT * FROM materials WHERE internal_code='LIM-ESC-002'");
    console.log(mat[0]);
    process.exit(0);
}
main();

```

---

### 3.32 `check_neon_status.js`
- **Nombre original del archivo**: `check_neon_status.js`
- **Ubicación original**: `backend/check_neon_status.js` (1,454 bytes, 34 líneas, Estado Git: `IGNORED`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Almacén / Producción / Base de Datos Neon
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local o Neon Cloud.
- **Datos de entrada**: Tablas operativas (`lotes`, `inventories`, `consumption_orders`, `extruder_queues`, `wip_inventories`) y tablas de MasterData.
- **Resultado esperado**: Verificación de conteos en 0 para tablas transaccionales o aborto inmediato por directiva de protección (`process.exit(1)`).
- **Resultado observado**: Dos scripts (`clean_neon_production.js` y `clean_warehouse_production.js`) tenían `process.exit(1)` insertado al inicio y `SyntaxError` por `await` fuera de función async; tres contenían URL de Neon hardcodeada.
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Limpieza histórica previa a salida en vivo de Almacén (octubre 2026) y bloqueo posterior para proteger marcha activa.
- **Estado de vigencia**: **OBSOLETO — ELIMINADO EN LOTE 4 (Respaldado en `recovery_vault`)**
- **Justificación de conservación o eliminación**: Ignorado por `.gitignore`, con errores de sintaxis y credenciales de Neon en texto plano. Respaldado con SHA-256 en `recovery_vault/deleted_files/backend/` y eliminado del árbol activo.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { Sequelize } = require('sequelize');
const neonUrl = 'postgresql://[REDACTED_URL]';

async function checkNeon() {
  const seq = new Sequelize(neonUrl, {
    dialect: 'postgres',
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    logging: false
  });
  try {
    await seq.authenticate();
    console.log('✔ Conectado a Neon (Nube) exitosamente');
    const [lotes] = await seq.query('SELECT COUNT(*) as c FROM lotes;');
    const [inv] = await seq.query('SELECT COUNT(*) as c FROM inventories;');
```

---

### 3.33 `check_perms.js`
- **Nombre original del archivo**: `check_perms.js`
- **Ubicación original**: `backend/check_perms.js` (239 bytes, 5 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize } = require('./src/database/models');
sequelize.query(`SELECT code FROM permissions;`)
  .then(res => { console.log(res[0].map(r => r.code)); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });

```

---

### 3.34 `check_qr.js`
- **Nombre original del archivo**: `check_qr.js`
- **Ubicación original**: `backend/check_qr.js` (227 bytes, 6 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { QrCode } = require('./src/database/models');
QrCode.findOne({where: {qr_code: 'ALM-000000172'}}).then(qr => {
  console.log('QR Status in DB:', qr ? qr.status : 'NOT_FOUND');
  process.exit(0);
}).catch(console.error);

```

---

### 3.35 `check_sync.js`
- **Nombre original del archivo**: `check_sync.js`
- **Ubicación original**: `backend/check_sync.js` (1,731 bytes, 56 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
if (!process.env.REMOTE_DATABASE_URL) throw new Error('REMOTE_DATABASE_URL is required for this script.');
if (!process.env.LOCAL_DB_PASSWORD) throw new Error('LOCAL_DB_PASSWORD is required for this script.');
const { Client } = require('pg');

async function checkSync() {
  const localClient = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'sistema_enterprise',
    user: 'postgres',
    password: process.env.LOCAL_DB_PASSWORD
  });

```

---

### 3.36 `cleanup-master-data.js`
- **Nombre original del archivo**: `cleanup-master-data.js`
- **Ubicación original**: `backend/cleanup-master-data.js` (1,552 bytes, 55 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const xlsx = require('xlsx');
const db = require('./src/database/models');

async function cleanupOldData() {
  const filePath = 'c:\\Users\\maicr\\OneDrive\\Desktop\\Demo\\docs\\Libro1_Corregido.xlsx';
  const workbook = xlsx.readFile(filePath);
  
  try {
    await db.sequelize.authenticate();
    
    const matSheet = workbook.Sheets['Materiales'];
    const matData = xlsx.utils.sheet_to_json(matSheet);
    
    const validNomQrs = new Set();
```

---

### 3.37 `cleanup-rest.js`
- **Nombre original del archivo**: `cleanup-rest.js`
- **Ubicación original**: `backend/cleanup-rest.js` (1,967 bytes, 57 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const xlsx = require('xlsx');
const db = require('./src/database/models');

async function cleanupOldData() {
  const filePath = 'c:\\Users\\maicr\\OneDrive\\Desktop\\Demo\\docs\\Libro1_Corregido.xlsx';
  const workbook = xlsx.readFile(filePath);
  
  try {
    await db.sequelize.authenticate();
    
    // valid types
    const validTipos = new Set(xlsx.utils.sheet_to_json(workbook.Sheets['Tipos']).map(r => String(r['TIPO']).trim()).filter(Boolean));
    const allTipos = await db.MaterialType.findAll();
    for (const t of allTipos) {
```

---

### 3.38 `clean_neon_production.js`
- **Nombre original del archivo**: `clean_neon_production.js`
- **Ubicación original**: `backend/clean_neon_production.js` (6,504 bytes, 155 líneas, Estado Git: `IGNORED`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Almacén / Producción / Base de Datos Neon
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local o Neon Cloud.
- **Datos de entrada**: Tablas operativas (`lotes`, `inventories`, `consumption_orders`, `extruder_queues`, `wip_inventories`) y tablas de MasterData.
- **Resultado esperado**: Verificación de conteos en 0 para tablas transaccionales o aborto inmediato por directiva de protección (`process.exit(1)`).
- **Resultado observado**: Dos scripts (`clean_neon_production.js` y `clean_warehouse_production.js`) tenían `process.exit(1)` insertado al inicio y `SyntaxError` por `await` fuera de función async; tres contenían URL de Neon hardcodeada.
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Limpieza histórica previa a salida en vivo de Almacén (octubre 2026) y bloqueo posterior para proteger marcha activa.
- **Estado de vigencia**: **OBSOLETO — ELIMINADO EN LOTE 4 (Respaldado en `recovery_vault`)**
- **Justificación de conservación o eliminación**: Ignorado por `.gitignore`, con errores de sintaxis y credenciales de Neon en texto plano. Respaldado con SHA-256 en `recovery_vault/deleted_files/backend/` y eliminado del árbol activo.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { Sequelize } = require('sequelize');

const neonUrl = 'postgresql://[REDACTED_URL]';

const seq = new Sequelize(neonUrl, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});
```

---

### 3.39 `clean_prod.js`
- **Nombre original del archivo**: `clean_prod.js`
- **Ubicación original**: `backend/clean_prod.js` (436 bytes, 17 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false }
    },
    logging: false
});

async function main() {
    await s.query("DELETE FROM materials WHERE internal_code='GOM-001'");
    console.log("Cleaned production GOM-001");
    process.exit(0);
```

---

### 3.40 `clean_qa_users.js`
- **Nombre original del archivo**: `clean_qa_users.js`
- **Ubicación original**: `backend/clean_qa_users.js` (217 bytes, 8 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/config/database.js`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize } = require('./src/config/database');
async function run() {
  await sequelize.query(`DELETE FROM users WHERE username LIKE 'QATES%'`);
  console.log('Deleted QA users');
  process.exit(0);
}
run();

```

---

### 3.41 `clean_warehouse_production.js`
- **Nombre original del archivo**: `clean_warehouse_production.js`
- **Ubicación original**: `backend/clean_warehouse_production.js` (6,317 bytes, 140 líneas, Estado Git: `IGNORED`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Almacén / Producción / Base de Datos Neon
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local o Neon Cloud.
- **Datos de entrada**: Tablas operativas (`lotes`, `inventories`, `consumption_orders`, `extruder_queues`, `wip_inventories`) y tablas de MasterData.
- **Resultado esperado**: Verificación de conteos en 0 para tablas transaccionales o aborto inmediato por directiva de protección (`process.exit(1)`).
- **Resultado observado**: Dos scripts (`clean_neon_production.js` y `clean_warehouse_production.js`) tenían `process.exit(1)` insertado al inicio y `SyntaxError` por `await` fuera de función async; tres contenían URL de Neon hardcodeada.
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Limpieza histórica previa a salida en vivo de Almacén (octubre 2026) y bloqueo posterior para proteger marcha activa.
- **Estado de vigencia**: **OBSOLETO — ELIMINADO EN LOTE 4 (Respaldado en `recovery_vault`)**
- **Justificación de conservación o eliminación**: Ignorado por `.gitignore`, con errores de sintaxis y credenciales de Neon en texto plano. Respaldado con SHA-256 en `recovery_vault/deleted_files/backend/` y eliminado del árbol activo.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize } = require('./src/database/models');

async function cleanWarehouseForProduction() {
  console.error('⛔ OPERACIÓN CANCELADA: El módulo de almacén se encuentra en MARCHA ACTIVA en la empresa.');
  console.error('⛔ Por directriz de producción, está estrictamente PROHIBIDO reiniciar, truncar o eliminar el inventario, lotes o masterdata.');
  process.exit(1);
}

    // 1. Limpiar colas de extrusión vinculadas a pruebas
    await sequelize.query('DELETE FROM extruder_queues;', { transaction });
    console.log('✔ Colas de extrusión eliminadas');

    // 2. Limpiar órdenes de consumo e ítems
    await sequelize.query('DELETE FROM consumption_order_items;', { transaction });
```

---

### 3.42 `count.js`
- **Nombre original del archivo**: `count.js`
- **Ubicación original**: `backend/count.js` (418 bytes, 8 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DB_NAME || 'sistema_enterprise', process.env.DB_USER || 'postgres', process.env.DB_PASSWORD, {host: process.env.DB_HOST || 'localhost', dialect: 'postgres'});
s.query("SELECT COUNT(*) FROM materials WHERE is_active=true").then(r => {
    console.log("ACTIVE COUNT: " + r[0][0].count);
    process.exit(0);
});

```

---

### 3.43 `debugDiscrepancy.js`
- **Nombre original del archivo**: `debugDiscrepancy.js`
- **Ubicación original**: `backend/debugDiscrepancy.js` (1,069 bytes, 32 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize, Inventory, Lote, Material } = require('./src/database/models');

async function debugDiscrepancy() {
  try {
    const material = await Material.findOne({ where: { name: 'Material de Prueba' } });
    if (!material) {
      console.log("Material no encontrado");
      process.exit(1);
    }

    const inventory = await Inventory.findOne({ where: { material_id: material.id } });
    console.log(`\n=== INVENTARIO ===`);
    console.log(`Inventory amount: ${inventory ? inventory.amount : 'N/A'}`);

```

---

### 3.44 `dedup_types.js`
- **Nombre original del archivo**: `dedup_types.js`
- **Ubicación original**: `backend/dedup_types.js` (3,493 bytes, 105 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/config/database.js`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const { sequelize } = require('./src/config/database.js');
const fs = require('fs');

function parseCSV(text) {
  const result = [];
  let inQuotes = false;
  let current = '';
  
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      current += c;
```

---

### 3.45 `do_sync.js`
- **Nombre original del archivo**: `do_sync.js`
- **Ubicación original**: `backend/do_sync.js` (2,254 bytes, 66 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
if (!process.env.REMOTE_DATABASE_URL) throw new Error('REMOTE_DATABASE_URL is required for this script.');
if (!process.env.LOCAL_DB_PASSWORD) throw new Error('LOCAL_DB_PASSWORD is required for this script.');
if (process.env.ALLOW_REMOTE_SYNC !== 'YES') throw new Error('Set ALLOW_REMOTE_SYNC=YES only after reviewing the remote data changes.');
const { Client } = require('pg');

async function doSync() {
  const localClient = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'sistema_enterprise',
    user: 'postgres',
    password: process.env.LOCAL_DB_PASSWORD
  });
```

---

### 3.46 `fetch-logs.js`
- **Nombre original del archivo**: `fetch-logs.js`
- **Ubicación original**: `backend/fetch-logs.js` (1,280 bytes, 51 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const https = require('https');
const fs = require('fs');

const options = {
  hostname: 'api.github.com',
  path: '/repos/abrahamlopezf/MES2.1/actions/runs?per_page=1',
  method: 'GET',
  headers: {
    'User-Agent': 'Node.js'
  }
};

const req = https.request(options, (res) => {
  let data = '';
```

---

### 3.47 `find_duplicates.js`
- **Nombre original del archivo**: `find_duplicates.js`
- **Ubicación original**: `backend/find_duplicates.js` (826 bytes, 32 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const fs = require('fs');

const text = fs.readFileSync('materials_check.txt', 'utf8');
const lines = text.split('\n');

const codes = [];
const duplicates = [];
const seenCodes = new Set();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const regexMatch = line.match(/([A-Z0-9]+-[A-Z0-9]+-[0-9]+)/);
```

---

### 3.48 `find_missing.js`
- **Nombre original del archivo**: `find_missing.js`
- **Ubicación original**: `backend/find_missing.js` (938 bytes, 21 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const fs = require('fs');
const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DB_NAME || 'sistema_enterprise', process.env.DB_USER || 'postgres', process.env.DB_PASSWORD, {host: process.env.DB_HOST || 'localhost', dialect: 'postgres', logging: false});

async function main() {
    const text = fs.readFileSync('docs/catalogo_materiales_stock_minimo.md', 'utf-8');
    const lines = text.split('\n').filter(l => l.includes('|')).slice(2);
    
    const mdNomenclatures = lines.map(l => l.split('|')[3].trim());
    
    const dbRows = await s.query("SELECT internal_code FROM materials WHERE is_active=true", {type: Sequelize.QueryTypes.SELECT});
    const dbNomenclatures = dbRows.map(r => r.internal_code);
    
```

---

### 3.49 `fix-constraints.js`
- **Nombre original del archivo**: `fix-constraints.js`
- **Ubicación original**: `backend/fix-constraints.js` (1,586 bytes, 40 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { Client } = require('pg');
require('dotenv').config();

async function fixConstraints() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'sistema_enterprise',
    user: 'postgres',
    password: process.env.DB_PASSWORD
  });
  await client.connect();

  console.log("Fetching all foreign keys for lotes...");
```

---

### 3.50 `fix-inventory.js`
- **Nombre original del archivo**: `fix-inventory.js`
- **Ubicación original**: `backend/fix-inventory.js` (692 bytes, 24 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize, Inventory, Lote } = require('./src/database/models');
async function fixInventory() {
  const transaction = await sequelize.transaction();
  try {
    const inventories = await Inventory.findAll({ transaction });
    for (const inv of inventories) {
      const sum = await Lote.sum('available_amount', {
        where: { material_id: inv.material_id, is_active: true },
        transaction
      });
      inv.amount = sum || 0;
      await inv.save({ transaction });
    }
    await transaction.commit();
```

---

### 3.51 `fix_and_sync.js`
- **Nombre original del archivo**: `fix_and_sync.js`
- **Ubicación original**: `backend/fix_and_sync.js` (3,214 bytes, 81 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
if (!process.env.REMOTE_DATABASE_URL) throw new Error('REMOTE_DATABASE_URL is required for this script.');
if (!process.env.LOCAL_DB_PASSWORD) throw new Error('LOCAL_DB_PASSWORD is required for this script.');
if (process.env.ALLOW_REMOTE_SCHEMA_FIX !== 'YES') throw new Error('Set ALLOW_REMOTE_SCHEMA_FIX=YES only after reviewing the remote schema changes.');
const { Client } = require('pg');

async function fixAndSync() {
  const localClient = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'sistema_enterprise',
    user: 'postgres',
    password: process.env.LOCAL_DB_PASSWORD
  });
```

---

### 3.52 `fix_materials.js`
- **Nombre original del archivo**: `fix_materials.js`
- **Ubicación original**: `backend/fix_materials.js` (6,942 bytes, 156 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/config/database.js`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize } = require('./src/config/database.js');
const { v4: uuidv4 } = require('uuid');

async function run() {
  await sequelize.authenticate();

  // Helper to fetch IDs
  const [families] = await sequelize.query('SELECT id, code FROM material_families');
  const [codes] = await sequelize.query('SELECT id, name FROM material_codes');
  const [types] = await sequelize.query('SELECT id, name FROM material_types');
  const [brands] = await sequelize.query('SELECT id, name FROM material_brands');
  const [locations] = await sequelize.query('SELECT id, code FROM material_locations');

  const adminId = 1;
```

---

### 3.53 `fix_uuid.js`
- **Nombre original del archivo**: `fix_uuid.js`
- **Ubicación original**: `backend/fix_uuid.js` (722 bytes, 13 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const fs = require('fs');
const path = require('path');
const dir = 'C:/Users/maicr/OneDrive/Desktop/Demo/backend/src/modules/materials';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.model.js'));
files.forEach(f => {
  let content = fs.readFileSync(path.join(dir, f), 'utf8');
  // Quitamos allowNull: false del modelo de Sequelize para que la validación en JS pase,
  // y dejamos que la BD se encargue mediante su constraint not null y su default.
  content = content.replace(/uuid: \{ type: DataTypes\.UUID, allowNull: false, unique: true \},/g, "uuid: { type: DataTypes.UUID, unique: true },");
  fs.writeFileSync(path.join(dir, f), content);
});
console.log('UUID validation bypassed on model level');

```

---

### 3.54 `generate-catalog-seeder.js`
- **Nombre original del archivo**: `generate-catalog-seeder.js`
- **Ubicación original**: `backend/generate-catalog-seeder.js` (11,301 bytes, 254 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
/**
 * generate-catalog-seeder.js
 * 
 * Lee catalog_dump.json (generado previamente desde la BD local)
 * y escribe el seeder Sequelize-CLI en:
 *   src/database/seeders/20260826120000-production-catalog-data.js
 * 
 * Uso: node generate-catalog-seeder.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
```

---

### 3.55 `generate_catalogs.js`
- **Nombre original del archivo**: `generate_catalogs.js`
- **Ubicación original**: `backend/generate_catalogs.js` (4,084 bytes, 115 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `../../services/BaseCatalogService (UNRESOLVED)`, `../../database/models (UNRESOLVED)`, `backend/${camelName}.service (UNRESOLVED)`, `../../utils/apiResponse (UNRESOLVED)`, `backend/${camelName}.controller (UNRESOLVED)`, `../../middlewares/validateRequest (UNRESOLVED)`, `backend/${camelName}.schema (UNRESOLVED)`, `../../utils/asyncHandler (UNRESOLVED)`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const fs = require('fs');
const path = require('path');

const catalogs = [
  { name: 'MaterialCode', routeName: 'material-codes', displayName: 'Código de Material' },
  { name: 'MaterialCategory', routeName: 'material-categories', displayName: 'Categoría de Material' },
  { name: 'MaterialBrand', routeName: 'material-brands', displayName: 'Marca de Material' },
  { name: 'MaterialType', routeName: 'material-types', displayName: 'Tipo de Material' },
  { name: 'OperationalArea', routeName: 'operational-areas', displayName: 'Área Operacional' }
];

const basePath = path.join(__dirname, 'src/modules/materials');

catalogs.forEach(cat => {
```

---

### 3.56 `generate_dump.js`
- **Nombre original del archivo**: `generate_dump.js`
- **Ubicación original**: `backend/generate_dump.js` (3,585 bytes, 122 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const fs = require('fs');
const { sequelize } = require('./src/database/models');

const catalogTables = [
  'areas',
  'subareas',
  'rankings',
  'scrap_catalog',
  'scrap_types',
  'scrap_causes',
  'material_units',
  'material_families',
  'material_codes',
  'material_brands',
```

---

### 3.57 `generate_seeders_from_text.js`
- **Nombre original del archivo**: `generate_seeders_from_text.js`
- **Ubicación original**: `backend/generate_seeders_from_text.js` (7,975 bytes, 220 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `models (UNRESOLVED)`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const fs = require('fs');
const path = require('path');

const rawData = fs.readFileSync(path.join(__dirname, 'raw_materials.tsv'), 'utf8');
const lines = rawData.split('\n').filter(l => l.trim().length > 0);
lines.shift(); // Saltar header

const families = new Set();
const codes = new Set();
const brands = new Set();
const types = new Set();
const materials = [];

// Mapping para derivar categorías
```

---

### 3.58 `qa_test.js`
- **Nombre original del archivo**: `qa_test.js`
- **Ubicación original**: `backend/qa_test.js` (9,669 bytes, 175 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script de prueba manual o diagnóstico de primera generación (qa_test.js).
- **Módulo relacionado**: Almacén / Usuarios / Roles / Etiquetas PDF / Rendimiento PG
- **Requisitos para ejecutarla**: PostgreSQL local y/o servidor Express en puerto 4000.
- **Datos de entrada**: Datos de prueba locales o payloads HTTP.
- **Resultado esperado**: Verificación por consola de la operación probada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/config/database.js`
- **Casos de negocio evaluados**: Pruebas iniciales de julio-noviembre 2026 (concurrencia ACID, EventBus, Joi, generación PDF de etiquetas, latencia de inserción en `lotes`).
- **Estado de vigencia**: **OBSOLETO (Superado por la suite `node:test` en `backend/test/`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const API_URL = 'http://localhost:4000/api';

async function qaFlow() {
  try {
    console.log('--- 1. Logging in as SUPERADMIN ---');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'nexus',
        password: process.env.TEST_ACCOUNT_PASSWORD
      })
    }).then(r => r.json());
```

---

### 3.59 `reactivate.js`
- **Nombre original del archivo**: `reactivate.js`
- **Ubicación original**: `backend/reactivate.js` (614 bytes, 12 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DB_NAME || 'sistema_enterprise', process.env.DB_USER || 'postgres', process.env.DB_PASSWORD, {host: process.env.DB_HOST || 'localhost', dialect: 'postgres', logging: false});

async function main() {
    await s.query("UPDATE materials SET is_active=true, status='ACTIVE' WHERE internal_code IN ('LIM-ESC-002', 'RF-BUJ-004', 'RF-BRA-003')");
    const r = await s.query("SELECT COUNT(*) FROM materials WHERE is_active=true");
    console.log("ACTIVE COUNT:", r[0][0].count);
    process.exit(0);
}
main();

```

---

### 3.60 `read-excel.js`
- **Nombre original del archivo**: `read-excel.js`
- **Ubicación original**: `backend/read-excel.js` (738 bytes, 26 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const xlsx = require('xlsx');

function dumpExcel() {
  const filePath = 'c:\\Users\\maicr\\OneDrive\\Desktop\\Demo\\docs\\Libro1_Corregido.xlsx';
  try {
    const workbook = xlsx.readFile(filePath);
    
    workbook.SheetNames.forEach(sheetName => {
      console.log(`\n=== SHEET: ${sheetName} ===`);
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      
      // Print first few rows to understand structure
      data.slice(0, 100).forEach((row, i) => {
```

---

### 3.61 `read-headers.js`
- **Nombre original del archivo**: `read-headers.js`
- **Ubicación original**: `backend/read-headers.js` (567 bytes, 20 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const xlsx = require('xlsx');

function dumpHeaders() {
  const filePath = 'c:\\Users\\maicr\\OneDrive\\Desktop\\Demo\\docs\\Libro1_Corregido.xlsx';
  try {
    const workbook = xlsx.readFile(filePath);
    
    workbook.SheetNames.forEach(sheetName => {
      console.log(`\n=== SHEET: ${sheetName} ===`);
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      console.log('Headers:', data[0]);
    });
  } catch (error) {
```

---

### 3.62 `resend_notifications.js`
- **Nombre original del archivo**: `resend_notifications.js`
- **Ubicación original**: `backend/resend_notifications.js` (1,209 bytes, 45 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize, ConsumptionOrder, Notification, User, Role } = require('./src/database/models');

async function resendNotifications() {
  try {
    // Buscar los admin de almacén
    const admins = await User.findAll({
      include: [{ model: Role, as: 'role', where: { code: 'ADMIN_ALM' } }]
    });

    if (admins.length === 0) {
      console.log('No admins found');
      process.exit(0);
    }

```

---

### 3.63 `reset-db.js`
- **Nombre original del archivo**: `reset-db.js`
- **Ubicación original**: `backend/reset-db.js` (1,081 bytes, 45 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize } = require('./src/database/models');
const db = require('./src/database/models');

async function resetDB() {
  try {
    console.log('Connecting to DB...');
    await sequelize.authenticate();
    
    console.log('Starting data wipe for non-identity tables...');
    
    const modelsToClear = [
      db.AuditLog,
      db.QrEvent,
      db.TraceabilityMovement,
```

---

### 3.64 `run-migrations.js`
- **Nombre original del archivo**: `run-migrations.js`
- **Ubicación original**: `backend/run-migrations.js` (282 bytes, 9 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { execSync } = require('child_process');
console.log('Running migrations...');
try {
  execSync('npx sequelize-cli db:migrate', { stdio: 'inherit', cwd: __dirname + '/../' });
  console.log('Migrations done.');
} catch (error) {
  console.error('Migration failed:', error);
}

```

---

### 3.65 `clean-qa-data.js`
- **Nombre original del archivo**: `clean-qa-data.js`
- **Ubicación original**: `backend/scripts/clean-qa-data.js` (1,951 bytes, 48 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: MasterData / Almacén / Sincronización Excel-Neon
- **Requisitos para ejecutarla**: Conexión a BD local y/o archivo `docs/Warehouse/Libro1_Corregido.xlsx`.
- **Datos de entrada**: Hojas de Excel (`Familias`, `Tipos`, `Marcas`, `Localidades`, `Materiales`) o tablas de MasterData.
- **Resultado esperado**: Sincronización, inspección o limpieza de datos QA/MasterData.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Importación de catálogos desde Excel del cliente, inspección Local vs Neon y flujo QA de almacén.
- **Estado de vigencia**: **AUXILIAR HISTÓRICO (En revisión para archivo o retiro)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize, User, QrCode, QrBatch, TraceabilityEvent, ConsumptionOrder, ConsumptionOrderItem, InventoryMovement, Lote, WipInventory } = require('../src/database/models');

async function cleanQA() {
  console.log("Iniciando limpieza de datos QA...");
  try {
    const qaUsers = await User.findAll({
      where: {
        last_name: 'QA'
      }
    });

    const userIds = qaUsers.map(u => u.id);
    console.log(`Encontrados ${userIds.length} usuarios QA.`);

```

---

### 3.66 `create_admin_extrusion.js`
- **Nombre original del archivo**: `create_admin_extrusion.js`
- **Ubicación original**: `backend/scripts/create_admin_extrusion.js` (4,499 bytes, 122 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: MasterData / Almacén / Sincronización Excel-Neon
- **Requisitos para ejecutarla**: Conexión a BD local y/o archivo `docs/Warehouse/Libro1_Corregido.xlsx`.
- **Datos de entrada**: Hojas de Excel (`Familias`, `Tipos`, `Marcas`, `Localidades`, `Materiales`) o tablas de MasterData.
- **Resultado esperado**: Sincronización, inspección o limpieza de datos QA/MasterData.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/config/database.js`
- **Casos de negocio evaluados**: Importación de catálogos desde Excel del cliente, inspección Local vs Neon y flujo QA de almacén.
- **Estado de vigencia**: **OBSOLETO / RIESGO DE SEGURIDAD (Eliminar con `git rm`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const bcrypt = require('bcrypt');
const { sequelize } = require('../src/config/database');

async function createAdminExtrusion() {
  try {
    console.log('--- 1. Ensuring role ADMIN_EXT exists ---');
    let [roles] = await sequelize.query(`SELECT id, name, code, area_id FROM roles WHERE code = 'ADMIN_EXT'`);
    let roleId;
    if (roles.length > 0) {
      roleId = roles[0].id;
      console.log('Role ADMIN_EXT already exists with id:', roleId);
    } else {
      const [insertResult] = await sequelize.query(`
        INSERT INTO roles (name, code, description, area_id, is_active, created_at, updated_at)
```

---

### 3.67 `fix-admin-alm-permissions.js`
- **Nombre original del archivo**: `fix-admin-alm-permissions.js`
- **Ubicación original**: `backend/scripts/fix-admin-alm-permissions.js` (1,121 bytes, 35 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: MasterData / Almacén / Sincronización Excel-Neon
- **Requisitos para ejecutarla**: Conexión a BD local y/o archivo `docs/Warehouse/Libro1_Corregido.xlsx`.
- **Datos de entrada**: Hojas de Excel (`Familias`, `Tipos`, `Marcas`, `Localidades`, `Materiales`) o tablas de MasterData.
- **Resultado esperado**: Sincronización, inspección o limpieza de datos QA/MasterData.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/config/database.js`
- **Casos de negocio evaluados**: Importación de catálogos desde Excel del cliente, inspección Local vs Neon y flujo QA de almacén.
- **Estado de vigencia**: **AUXILIAR HISTÓRICO (En revisión para archivo o retiro)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize } = require('../src/config/database');

async function fix() {
  try {
    await sequelize.authenticate();
    console.log('Conectado a la base de datos');
    
    const [roles] = await sequelize.query(`SELECT id FROM roles WHERE code = 'ADMIN_ALM'`);
    const [perms] = await sequelize.query(`SELECT id FROM permissions WHERE code = 'inventory.receive'`);

    if (roles.length > 0 && perms.length > 0) {
      const adminAlmId = roles[0].id;
      const receivePermId = perms[0].id;
      
```

---

### 3.68 `inspect.js`
- **Nombre original del archivo**: `inspect.js`
- **Ubicación original**: `backend/scripts/masterdata-neon/inspect.js` (6,549 bytes, 174 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: MasterData / Almacén / Sincronización Excel-Neon
- **Requisitos para ejecutarla**: Conexión a BD local y/o archivo `docs/Warehouse/Libro1_Corregido.xlsx`.
- **Datos de entrada**: Hojas de Excel (`Familias`, `Tipos`, `Marcas`, `Localidades`, `Materiales`) o tablas de MasterData.
- **Resultado esperado**: Sincronización, inspección o limpieza de datos QA/MasterData.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Importación de catálogos desde Excel del cliente, inspección Local vs Neon y flujo QA de almacén.
- **Estado de vigencia**: **AUXILIAR HISTÓRICO (En revisión para archivo o retiro)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
/**
 * INSPECCIÓN (SOLO LECTURA) — Local vs Neon
 *
 * No modifica nada. Reporta por cada tabla de MasterData:
 *  - total / activos / inactivos / soft-deleted
 *  - duplicados por `code` (entre registros vivos)
 *  - tablas transaccionales en Neon que dependen (FK) de MasterData y cuántos registros tienen
 *  - diferencias de migraciones (sequelize_meta) entre Local y Neon
 *
 * Uso:
 *   NEON_DATABASE_URL debe existir en backend/.env (NO se versiona).
 *   node scripts/masterdata-neon/inspect.js
 */
require('dotenv').config();
```

---

### 3.69 `restore-prueba.js`
- **Nombre original del archivo**: `restore-prueba.js`
- **Ubicación original**: `backend/scripts/masterdata-neon/restore-prueba.js` (1,123 bytes, 22 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: MasterData / Almacén / Sincronización Excel-Neon
- **Requisitos para ejecutarla**: Conexión a BD local y/o archivo `docs/Warehouse/Libro1_Corregido.xlsx`.
- **Datos de entrada**: Hojas de Excel (`Familias`, `Tipos`, `Marcas`, `Localidades`, `Materiales`) o tablas de MasterData.
- **Resultado esperado**: Sincronización, inspección o limpieza de datos QA/MasterData.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Importación de catálogos desde Excel del cliente, inspección Local vs Neon y flujo QA de almacén.
- **Estado de vigencia**: **AUXILIAR HISTÓRICO (En revisión para archivo o retiro)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config({ path: __dirname + '/../../.env' });
const { sequelize } = require('../../src/database/models');
(async () => {
  const t = await sequelize.transaction();
  try {
    const [[m]] = await sequelize.query(`SELECT * FROM materials WHERE id = 1237`, { transaction: t });
    const refs = [
      ['material_codes', m.material_code_id], ['material_families', m.family_id],
      ['material_types', m.type_id], ['material_brands', m.brand_id], ['material_locations', m.default_location_id],
    ];
    for (const [tbl, id] of refs) {
      if (!id) continue;
      const [, r] = await sequelize.query(`UPDATE ${tbl} SET deleted_at = NULL, is_active = TRUE WHERE id = :id AND deleted_at IS NOT NULL`, { replacements: { id }, transaction: t });
      console.log(`${tbl}#${id} restaurado:`, r.rowCount);
```

---

### 3.70 `migrate-master-data.js`
- **Nombre original del archivo**: `migrate-master-data.js`
- **Ubicación original**: `backend/scripts/migrate-master-data.js` (6,012 bytes, 169 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: MasterData / Almacén / Sincronización Excel-Neon
- **Requisitos para ejecutarla**: Conexión a BD local y/o archivo `docs/Warehouse/Libro1_Corregido.xlsx`.
- **Datos de entrada**: Hojas de Excel (`Familias`, `Tipos`, `Marcas`, `Localidades`, `Materiales`) o tablas de MasterData.
- **Resultado esperado**: Sincronización, inspección o limpieza de datos QA/MasterData.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Importación de catálogos desde Excel del cliente, inspección Local vs Neon y flujo QA de almacén.
- **Estado de vigencia**: **OBSOLETO / RIESGO DE SEGURIDAD (Eliminar con `git rm`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const { Client } = require('pg');

const localConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sistema_enterprise',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'QhBv47RkNK$1096',
};

const neonUrl = process.env.DATABASE_URL;

// Tablas a migrar en orden (para respetar llaves foráneas)
```

---

### 3.71 `parse-materials.js`
- **Nombre original del archivo**: `parse-materials.js`
- **Ubicación original**: `backend/scripts/parse-materials.js` (3,466 bytes, 111 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: MasterData / Almacén / Sincronización Excel-Neon
- **Requisitos para ejecutarla**: Conexión a BD local y/o archivo `docs/Warehouse/Libro1_Corregido.xlsx`.
- **Datos de entrada**: Hojas de Excel (`Familias`, `Tipos`, `Marcas`, `Localidades`, `Materiales`) o tablas de MasterData.
- **Resultado esperado**: Sincronización, inspección o limpieza de datos QA/MasterData.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Importación de catálogos desde Excel del cliente, inspección Local vs Neon y flujo QA de almacén.
- **Estado de vigencia**: **AUXILIAR HISTÓRICO (En revisión para archivo o retiro)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const fs = require('fs');

const rawText = fs.readFileSync(__dirname + '/raw-materials.txt', 'utf-8');

// Known brands to match at the end
const knownBrands = [
  "ROMA, SALVO ETC", "SANITAS", "SCOTCH", "DERMACAERE Y SUK", "DERMACARE", 
  "ACP", "ROTOPLAS JUMBO", "FRAM", "SISTA", "RESISTOL 5000", "SANDYQUIM", 
  "DURACELL", "NICHOLSON", "TOKAI", "SURTEK", "ADHECINTAS", "TUK", 
  "FANDELI", "EFKA", "KLEVAR", "GENERICA", "VARIAS", "M3", "N/A"
];

// Combine lines that were wrapped
const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);
```

---

### 3.72 `qa-warehouse-flow.js`
- **Nombre original del archivo**: `qa-warehouse-flow.js`
- **Ubicación original**: `backend/scripts/qa-warehouse-flow.js` (7,146 bytes, 166 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: MasterData / Almacén / Sincronización Excel-Neon
- **Requisitos para ejecutarla**: Conexión a BD local y/o archivo `docs/Warehouse/Libro1_Corregido.xlsx`.
- **Datos de entrada**: Hojas de Excel (`Familias`, `Tipos`, `Marcas`, `Localidades`, `Materiales`) o tablas de MasterData.
- **Resultado esperado**: Sincronización, inspección o limpieza de datos QA/MasterData.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`, `backend/src/modules/reception/useCases/receiveMaterial.useCase.js`, `backend/src/modules/warehouse/consumptionOrder.service.js`, `backend/src/modules/traceability/traceabilityDomain.service.js`, `backend/src/shared/utils/crypto.utils.js`
- **Casos de negocio evaluados**: Importación de catálogos desde Excel del cliente, inspección Local vs Neon y flujo QA de almacén.
- **Estado de vigencia**: **AUXILIAR HISTÓRICO (En revisión para archivo o retiro)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize, User, Role, QrCode, Material, Location, MaterialUnit, Area } = require('../src/database/models');
const receiveMaterialUseCase = require('../src/modules/reception/useCases/receiveMaterial.useCase');
const consumptionOrderService = require('../src/modules/warehouse/consumptionOrder.service');
const traceabilityDomainService = require('../src/modules/traceability/traceabilityDomain.service');
const { encryptQrData, decryptQrData } = require('../src/shared/utils/crypto.utils');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function runQATest() {
  console.log("======================================================");
  console.log("⚙️  INICIANDO PRUEBA QA END-TO-END: ALMACÉN & TRAZABILIDAD");
  console.log("======================================================\n");

  const report = [];
```

---

### 3.73 `seed-manual-entry-permission.js`
- **Nombre original del archivo**: `seed-manual-entry-permission.js`
- **Ubicación original**: `backend/scripts/seed-manual-entry-permission.js` (2,202 bytes, 66 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: MasterData / Almacén / Sincronización Excel-Neon
- **Requisitos para ejecutarla**: Conexión a BD local y/o archivo `docs/Warehouse/Libro1_Corregido.xlsx`.
- **Datos de entrada**: Hojas de Excel (`Familias`, `Tipos`, `Marcas`, `Localidades`, `Materiales`) o tablas de MasterData.
- **Resultado esperado**: Sincronización, inspección o limpieza de datos QA/MasterData.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Importación de catálogos desde Excel del cliente, inspección Local vs Neon y flujo QA de almacén.
- **Estado de vigencia**: **AUXILIAR HISTÓRICO (En revisión para archivo o retiro)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
'use strict';

require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
```

---

### 3.74 `seed-materials.js`
- **Nombre original del archivo**: `seed-materials.js`
- **Ubicación original**: `backend/scripts/seed-materials.js` (2,593 bytes, 80 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: MasterData / Almacén / Sincronización Excel-Neon
- **Requisitos para ejecutarla**: Conexión a BD local y/o archivo `docs/Warehouse/Libro1_Corregido.xlsx`.
- **Datos de entrada**: Hojas de Excel (`Familias`, `Tipos`, `Marcas`, `Localidades`, `Materiales`) o tablas de MasterData.
- **Resultado esperado**: Sincronización, inspección o limpieza de datos QA/MasterData.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Importación de catálogos desde Excel del cliente, inspección Local vs Neon y flujo QA de almacén.
- **Estado de vigencia**: **AUXILIAR HISTÓRICO (En revisión para archivo o retiro)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const fs = require('fs');
const { sequelize } = require('../src/database/models');
const db = require('../src/database/models');

const records = JSON.parse(fs.readFileSync(__dirname + '/parsed-materials.json', 'utf-8'));

async function seedData() {
  try {
    console.log('Connecting to DB for Re-Seeding from Parsed JSON...');
    await sequelize.authenticate();

    // Wipe specific tables to fix data
    const modelsToClear = [
      db.Material, db.MaterialCode, db.MaterialFamily, db.MaterialBrand, db.MaterialType, db.OperationalArea
```

---

### 3.75 `sync-excel.js`
- **Nombre original del archivo**: `sync-excel.js`
- **Ubicación original**: `backend/scripts/sync-excel.js` (9,745 bytes, 266 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: MasterData / Almacén / Sincronización Excel-Neon
- **Requisitos para ejecutarla**: Conexión a BD local y/o archivo `docs/Warehouse/Libro1_Corregido.xlsx`.
- **Datos de entrada**: Hojas de Excel (`Familias`, `Tipos`, `Marcas`, `Localidades`, `Materiales`) o tablas de MasterData.
- **Resultado esperado**: Sincronización, inspección o limpieza de datos QA/MasterData.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Importación de catálogos desde Excel del cliente, inspección Local vs Neon y flujo QA de almacén.
- **Estado de vigencia**: **AUXILIAR HISTÓRICO (En revisión para archivo o retiro)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const xlsx = require('xlsx');
const path = require('path');
const db = require('../src/database/models');
const { Op } = require('sequelize'); // Importación directa desde la librería

function findDuplicates(data, columnName, sheetName) {
  const seen = new Set();
  const duplicates = new Set();
  
  for (const row of data) {
    const value = row[columnName] ? String(row[columnName]).trim() : null;
    if (!value) continue;
    
    if (seen.has(value)) {
```

---

### 3.76 `sync-master-data.js`
- **Nombre original del archivo**: `sync-master-data.js`
- **Ubicación original**: `backend/scripts/sync-master-data.js` (8,163 bytes, 263 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: MasterData / Almacén / Sincronización Excel-Neon
- **Requisitos para ejecutarla**: Conexión a BD local y/o archivo `docs/Warehouse/Libro1_Corregido.xlsx`.
- **Datos de entrada**: Hojas de Excel (`Familias`, `Tipos`, `Marcas`, `Localidades`, `Materiales`) o tablas de MasterData.
- **Resultado esperado**: Sincronización, inspección o limpieza de datos QA/MasterData.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Importación de catálogos desde Excel del cliente, inspección Local vs Neon y flujo QA de almacén.
- **Estado de vigencia**: **AUXILIAR HISTÓRICO (En revisión para archivo o retiro)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const xlsx = require("xlsx");
const path = require("path");
const db = require("../src/database/models");
const { Op } = require("sequelize"); // Importación directa desde la librería

function findDuplicates(data, columnName, sheetName) {
  const seen = new Set();
  const duplicates = new Set();

  for (const row of data) {
    const value = row[columnName] ? String(row[columnName]).trim() : null;
    if (!value) continue;

    if (seen.has(value)) {
```

---

### 3.77 `sync-neon.js`
- **Nombre original del archivo**: `sync-neon.js`
- **Ubicación original**: `backend/scripts/sync-neon.js` (534 bytes, 19 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: MasterData / Almacén / Sincronización Excel-Neon
- **Requisitos para ejecutarla**: Conexión a BD local y/o archivo `docs/Warehouse/Libro1_Corregido.xlsx`.
- **Datos de entrada**: Hojas de Excel (`Familias`, `Tipos`, `Marcas`, `Localidades`, `Materiales`) o tablas de MasterData.
- **Resultado esperado**: Sincronización, inspección o limpieza de datos QA/MasterData.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Importación de catálogos desde Excel del cliente, inspección Local vs Neon y flujo QA de almacén.
- **Estado de vigencia**: **OBSOLETO / RIESGO DE SEGURIDAD (Eliminar con `git rm`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
process.env.NODE_ENV = 'production'; // Fuerza a database.js a usar DATABASE_URL
const db = require('../src/database/models');

async function syncNeon() {
  console.log('Synchronizing Neon database schema...');
  try {
    db.sequelize.options.logging = false;
    await db.sequelize.sync({ alter: true });
    console.log('✅ Schema synchronized successfully.');
  } catch (error) {
    console.error('❌ Error syncing schema:', error);
  } finally {
    await db.sequelize.close();
```

---

### 3.78 `seed_rank.js`
- **Nombre original del archivo**: `seed_rank.js`
- **Ubicación original**: `backend/seed_rank.js` (308 bytes, 8 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/config/database.js`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize } = require('./src/config/database');
async function run() {
  await sequelize.query('INSERT INTO rankings (id, name, nomenclature, created_at, updated_at) VALUES (1, \'Test\', \'T\', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;');
  console.log('seeded ranking');
  process.exit();
}
run();

```

---

### 3.79 `set_pwd.js`
- **Nombre original del archivo**: `set_pwd.js`
- **Ubicación original**: `backend/set_pwd.js` (548 bytes, 16 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/config/database.js`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const bcrypt = require('bcrypt');
const { sequelize } = require('./src/config/database');

async function run() {
  try {
    const hash = await bcrypt.hash('Admin123!', 10);
    await sequelize.query(`UPDATE users SET password_hash = '${hash}', must_change_password = false WHERE username IN ('nexus', 'admin_alm', 'admin')`);
    console.log('SQL updated users password_hash and must_change_password = false to Admin123!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to update:', error);
    process.exit(1);
  }
}
```

---

### 3.80 `20260707050000-create-material-categories.js`
- **Nombre original del archivo**: `20260707050000-create-material-categories.js`
- **Ubicación original**: `backend/src/database/legacy/20260707050000-create-material-categories.js` (1,838 bytes, 75 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('material_categories', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      code: {
        type: Sequelize.STRING(40),
        allowNull: false,
```

---

### 3.81 `20260707050100-create-materials.js`
- **Nombre original del archivo**: `20260707050100-create-materials.js`
- **Ubicación original**: `backend/src/database/legacy/20260707050100-create-materials.js` (3,155 bytes, 129 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('materials', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      material_category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
```

---

### 3.82 `20260707060000-create-material-stocks.js`
- **Nombre original del archivo**: `20260707060000-create-material-stocks.js`
- **Ubicación original**: `backend/src/database/legacy/20260707060000-create-material-stocks.js` (2,175 bytes, 87 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('material_stocks', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      material_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
```

---

### 3.83 `20260707060100-create-material-lots.js`
- **Nombre original del archivo**: `20260707060100-create-material-lots.js`
- **Ubicación original**: `backend/src/database/legacy/20260707060100-create-material-lots.js` (3,174 bytes, 124 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('material_lots', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      material_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
```

---

### 3.84 `20260707060200-create-material-stock-movements.js`
- **Nombre original del archivo**: `20260707060200-create-material-stock-movements.js`
- **Ubicación original**: `backend/src/database/legacy/20260707060200-create-material-stock-movements.js` (3,416 bytes, 128 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('material_stock_movements', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      material_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
```

---

### 3.85 `20260727000000-update-materials-catalog.js`
- **Nombre original del archivo**: `20260727000000-update-materials-catalog.js`
- **Ubicación original**: `backend/src/database/legacy/20260727000000-update-materials-catalog.js` (3,359 bytes, 130 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('material_subcategories', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      material_category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
```

---

### 3.86 `add-cart-columns.js`
- **Nombre original del archivo**: `add-cart-columns.js`
- **Ubicación original**: `backend/src/scripts/add-cart-columns.js` (1,030 bytes, 32 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de prueba/migración manual en `backend/src/scripts/` (add-cart-columns.js).
- **Módulo relacionado**: Extrusión / Almacén / Fórmulas
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local y/o servidor Express local en `http://localhost:4000/api`.
- **Datos de entrada**: Modelos Sequelize o peticiones HTTP locales con usuario `nexus`.
- **Resultado esperado**: Ejecución paso a paso del flujo operativo o alineación de catálogos/fórmulas.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/config/database.js`
- **Casos de negocio evaluados**: Validación de flujos de 13 pasos, híbrido silos vs manual, contenedores de mezcla, ruteo de rollos viajeros y backflushing.
- **Estado de vigencia**: **EXPERIMENTAL / HISTÓRICO (Conservado en Git, pendiente de depuración en reestructuración)**
- **Justificación de conservación o eliminación**: Documentado íntegramente en este inventario. Los scripts ya cubiertos por migraciones o por `backend/test/*.test.js` pueden retirarse en el saneamiento de Git.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize } = require('../config/database');

async function run() {
  try {
    const [cols] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pti_racks' 
        AND column_name IN ('container_type', 'tare_weight_kg');
    `);
    const colNames = cols.map(c => c.column_name);
    console.log('Existing columns in pti_racks:', colNames);

    if (!colNames.includes('container_type')) {
```

---

### 3.87 `align-client-extrusion-formulas.js`
- **Nombre original del archivo**: `align-client-extrusion-formulas.js`
- **Ubicación original**: `backend/src/scripts/align-client-extrusion-formulas.js` (4,244 bytes, 95 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de prueba/migración manual en `backend/src/scripts/` (align-client-extrusion-formulas.js).
- **Módulo relacionado**: Extrusión / Almacén / Fórmulas
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local y/o servidor Express local en `http://localhost:4000/api`.
- **Datos de entrada**: Modelos Sequelize o peticiones HTTP locales con usuario `nexus`.
- **Resultado esperado**: Ejecución paso a paso del flujo operativo o alineación de catálogos/fórmulas.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Validación de flujos de 13 pasos, híbrido silos vs manual, contenedores de mezcla, ruteo de rollos viajeros y backflushing.
- **Estado de vigencia**: **EXPERIMENTAL / HISTÓRICO (Conservado en Git, pendiente de depuración en reestructuración)**
- **Justificación de conservación o eliminación**: Documentado íntegramente en este inventario. Los scripts ya cubiertos por migraciones o por `backend/test/*.test.js` pueden retirarse en el saneamiento de Git.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
'use strict';

// Synchronizes only Extrusion formulas/ingredients. It never inserts, updates,
// or deletes warehouse materials, locations, inventory, or movements.
const {
  sequelize,
  Formula,
  FormulaIngredient,
  Material,
  ExtruderQueue,
} = require('../database/models');

const EXTRUDER_1_CODES = [
  'F-EXT-1-BLANCO', 'F-EXT-1-VERDE', 'F-EXT-1-AZUL', 'F-EXT-1-ROJO',
```

---

### 3.88 `backfill-child-qrs.js`
- **Nombre original del archivo**: `backfill-child-qrs.js`
- **Ubicación original**: `backend/src/scripts/backfill-child-qrs.js` (3,322 bytes, 110 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de prueba/migración manual en `backend/src/scripts/` (backfill-child-qrs.js).
- **Módulo relacionado**: Extrusión / Almacén / Fórmulas
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local y/o servidor Express local en `http://localhost:4000/api`.
- **Datos de entrada**: Modelos Sequelize o peticiones HTTP locales con usuario `nexus`.
- **Resultado esperado**: Ejecución paso a paso del flujo operativo o alineación de catálogos/fórmulas.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Validación de flujos de 13 pasos, híbrido silos vs manual, contenedores de mezcla, ruteo de rollos viajeros y backflushing.
- **Estado de vigencia**: **EXPERIMENTAL / HISTÓRICO (Conservado en Git, pendiente de depuración en reestructuración)**
- **Justificación de conservación o eliminación**: Documentado íntegramente en este inventario. Los scripts ya cubiertos por migraciones o por `backend/test/*.test.js` pueden retirarse en el saneamiento de Git.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const { ConsumptionOrder, ConsumptionOrderItem, Lote, QrCode, QrBatch, WipInventory } = require('../database/models');
const { Op } = require('sequelize');

async function backfill() {
  console.log('--- Iniciando Backfill de QRs Hijos para Items de ODC ---');

  const items = await ConsumptionOrderItem.findAll({
    where: {
      lote_id: { [Op.ne]: null },
      child_qr_id: null
    },
    include: [
      {
```

---

### 3.89 `check-db.js`
- **Nombre original del archivo**: `check-db.js`
- **Ubicación original**: `backend/src/scripts/check-db.js` (432 bytes, 17 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de prueba/migración manual en `backend/src/scripts/` (check-db.js).
- **Módulo relacionado**: Extrusión / Almacén / Fórmulas
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local y/o servidor Express local en `http://localhost:4000/api`.
- **Datos de entrada**: Modelos Sequelize o peticiones HTTP locales con usuario `nexus`.
- **Resultado esperado**: Ejecución paso a paso del flujo operativo o alineación de catálogos/fórmulas.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/config/database.js`
- **Casos de negocio evaluados**: Validación de flujos de 13 pasos, híbrido silos vs manual, contenedores de mezcla, ruteo de rollos viajeros y backflushing.
- **Estado de vigencia**: **EXPERIMENTAL / HISTÓRICO (Conservado en Git, pendiente de depuración en reestructuración)**
- **Justificación de conservación o eliminación**: Documentado íntegramente en este inventario. Los scripts ya cubiertos por migraciones o por `backend/test/*.test.js` pueden retirarse en el saneamiento de Git.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize } = require('../config/database');

async function main() {
  const [silos] = await sequelize.query("SELECT * FROM material_locations WHERE name ILIKE '%SILO%' OR code ILIKE '%SILO%'");
  console.log('Silo locations:', silos);

  const [areas] = await sequelize.query("SELECT * FROM areas");
  console.log('Areas:', areas);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
```

---

### 3.90 `check-formulas.js`
- **Nombre original del archivo**: `check-formulas.js`
- **Ubicación original**: `backend/src/scripts/check-formulas.js` (798 bytes, 27 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de prueba/migración manual en `backend/src/scripts/` (check-formulas.js).
- **Módulo relacionado**: Extrusión / Almacén / Fórmulas
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local y/o servidor Express local en `http://localhost:4000/api`.
- **Datos de entrada**: Modelos Sequelize o peticiones HTTP locales con usuario `nexus`.
- **Resultado esperado**: Ejecución paso a paso del flujo operativo o alineación de catálogos/fórmulas.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Validación de flujos de 13 pasos, híbrido silos vs manual, contenedores de mezcla, ruteo de rollos viajeros y backflushing.
- **Estado de vigencia**: **EXPERIMENTAL / HISTÓRICO (Conservado en Git, pendiente de depuración en reestructuración)**
- **Justificación de conservación o eliminación**: Documentado íntegramente en este inventario. Los scripts ya cubiertos por migraciones o por `backend/test/*.test.js` pueden retirarse en el saneamiento de Git.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { Formula, FormulaIngredient, Material } = require('../database/models');

async function main() {
  const formulas = await Formula.findAll({
    include: [{
      model: FormulaIngredient,
      as: 'ingredients',
      include: [{ model: Material, as: 'material' }]
    }],
    order: [['id', 'ASC']]
  });

  console.log(`Total formulas found: ${formulas.length}`);
  formulas.forEach(f => {
```

---

### 3.91 `check-qr.js`
- **Nombre original del archivo**: `check-qr.js`
- **Ubicación original**: `backend/src/scripts/check-qr.js` (1,095 bytes, 34 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de prueba/migración manual en `backend/src/scripts/` (check-qr.js).
- **Módulo relacionado**: Extrusión / Almacén / Fórmulas
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local y/o servidor Express local en `http://localhost:4000/api`.
- **Datos de entrada**: Modelos Sequelize o peticiones HTTP locales con usuario `nexus`.
- **Resultado esperado**: Ejecución paso a paso del flujo operativo o alineación de catálogos/fórmulas.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/config/database.js`
- **Casos de negocio evaluados**: Validación de flujos de 13 pasos, híbrido silos vs manual, contenedores de mezcla, ruteo de rollos viajeros y backflushing.
- **Estado de vigencia**: **EXPERIMENTAL / HISTÓRICO (Conservado en Git, pendiente de depuración en reestructuración)**
- **Justificación de conservación o eliminación**: Documentado íntegramente en este inventario. Los scripts ya cubiertos por migraciones o por `backend/test/*.test.js` pueden retirarse en el saneamiento de Git.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize } = require('../config/database');

async function main() {
  const qrCode = 'QR-LOT-CARB-1792473431913-86293-SN1';
  const [qrs] = await sequelize.query(`SELECT * FROM qr_codes WHERE qr_code = '${qrCode}'`);
  console.log('QR row:', qrs);

  if (qrs.length > 0) {
    const [wips] = await sequelize.query(`SELECT * FROM wip_inventories WHERE qr_code_id = ${qrs[0].id}`);
    console.log('WIP records for QR:', wips);
  } else {
    const [likeQrs] = await sequelize.query(`SELECT * FROM qr_codes WHERE qr_code LIKE '%CARB%' LIMIT 10`);
    console.log('Similar QRs:', likeQrs);
  }
```

---

### 3.92 `check-users.js`
- **Nombre original del archivo**: `check-users.js`
- **Ubicación original**: `backend/src/scripts/check-users.js` (353 bytes, 13 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de prueba/migración manual en `backend/src/scripts/` (check-users.js).
- **Módulo relacionado**: Extrusión / Almacén / Fórmulas
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local y/o servidor Express local en `http://localhost:4000/api`.
- **Datos de entrada**: Modelos Sequelize o peticiones HTTP locales con usuario `nexus`.
- **Resultado esperado**: Ejecución paso a paso del flujo operativo o alineación de catálogos/fórmulas.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Validación de flujos de 13 pasos, híbrido silos vs manual, contenedores de mezcla, ruteo de rollos viajeros y backflushing.
- **Estado de vigencia**: **EXPERIMENTAL / HISTÓRICO (Conservado en Git, pendiente de depuración en reestructuración)**
- **Justificación de conservación o eliminación**: Documentado íntegramente en este inventario. Los scripts ya cubiertos por migraciones o por `backend/test/*.test.js` pueden retirarse en el saneamiento de Git.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { User, Role } = require('../database/models');

async function main() {
  const users = await User.findAll({ include: [{ model: Role, as: 'role' }] });
  console.log(users.map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role?.code })));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

```

---

### 3.93 `inspect_telares_infra.js`
- **Nombre original del archivo**: `inspect_telares_infra.js`
- **Ubicación original**: `backend/src/scripts/inspect_telares_infra.js` (2,383 bytes, 60 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de prueba/migración manual en `backend/src/scripts/` (inspect_telares_infra.js).
- **Módulo relacionado**: Telares / BOM / Backflush
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local y/o servidor Express local en `http://localhost:4000/api`.
- **Datos de entrada**: Modelos Sequelize o peticiones HTTP locales con usuario `nexus`.
- **Resultado esperado**: Ejecución paso a paso del flujo operativo o alineación de catálogos/fórmulas.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Validación de flujos de 13 pasos, híbrido silos vs manual, contenedores de mezcla, ruteo de rollos viajeros y backflushing.
- **Estado de vigencia**: **EXPERIMENTAL / HISTÓRICO (Conservado en Git, pendiente de depuración en reestructuración)**
- **Justificación de conservación o eliminación**: Documentado íntegramente en este inventario. Los scripts ya cubiertos por migraciones o por `backend/test/*.test.js` pueden retirarse en el saneamiento de Git.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize } = require('../database/models');
sequelize.options.logging = false;

async function inspect() {
  try {
    console.log('--- REVISIÓN DE ÁREAS ---');
    const [areas] = await sequelize.query('SELECT id, name, code FROM areas ORDER BY id ASC', { logging: false });
    console.table(areas);

    console.log('--- TABLAS CON "BOM", "TELAR", "LOOM", "ROUTING", "VIAJERO", "LAMINADO", "GLOBO" ---');
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
```

---

### 3.94 `migrate-pti-catalog.js`
- **Nombre original del archivo**: `migrate-pti-catalog.js`
- **Ubicación original**: `backend/src/scripts/migrate-pti-catalog.js` (2,999 bytes, 67 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de prueba/migración manual en `backend/src/scripts/` (migrate-pti-catalog.js).
- **Módulo relacionado**: Extrusión / Almacén / Fórmulas
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local y/o servidor Express local en `http://localhost:4000/api`.
- **Datos de entrada**: Modelos Sequelize o peticiones HTTP locales con usuario `nexus`.
- **Resultado esperado**: Ejecución paso a paso del flujo operativo o alineación de catálogos/fórmulas.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Validación de flujos de 13 pasos, híbrido silos vs manual, contenedores de mezcla, ruteo de rollos viajeros y backflushing.
- **Estado de vigencia**: **EXPERIMENTAL / HISTÓRICO (Conservado en Git, pendiente de depuración en reestructuración)**
- **Justificación de conservación o eliminación**: Documentado íntegramente en este inventario. Los scripts ya cubiertos por migraciones o por `backend/test/*.test.js` pueden retirarse en el saneamiento de Git.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize } = require('../database/models');

async function migrate() {
  console.log('--- Iniciando migración de Catálogo PTI y cost_index en Fórmulas ---');
  
  // 1. Agregar cost_index a formulas si no existe
  await sequelize.query(`
    ALTER TABLE formulas 
    ADD COLUMN IF NOT EXISTS cost_index DECIMAL(8, 4) DEFAULT 1.1500;
  `);
  console.log('✔ Columna cost_index agregada/verificada en tabla formulas.');

  // 2. Crear tabla pti_products
  await sequelize.query(`
```

---

### 3.95 `provision-demo-users.js`
- **Nombre original del archivo**: `provision-demo-users.js`
- **Ubicación original**: `backend/src/scripts/provision-demo-users.js` (6,576 bytes, 180 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Aprovisionar o actualizar de forma segura las cuentas demo (`supervisor_extrusion` y administrador global) desde variables de entorno y secretos de GitHub Actions.
- **Módulo relacionado**: Core (Users, Roles, Permissions, Areas)
- **Requisitos para ejecutarla**: Variables `DATABASE_URL`, `DEMO_SUPERVISOR_*`, `DEMO_GLOBAL_*`.
- **Datos de entrada**: Credenciales validadas por política de complejidad (8-100 caracteres, mayúsculas, minúsculas, dígito y símbolo).
- **Resultado esperado**: Creación/actualización transaccional de usuarios y asignación de permisos de extrusión.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Aprovisionamiento seguro sin credenciales hardcodeadas.
- **Estado de vigencia**: **VIGENTE / CRÍTICO (Usado por `.github/workflows/provision-demo-users.yml`)**
- **Justificación de conservación o eliminación**: Script operativo de CI/CD en GitHub Actions. CONSERVAR.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
'use strict';

const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { sequelize, User, Role, Area, Permission } = require('../database/models');

const SUPERVISOR_PERMISSION_CODES = [
  'extrusion.view',
  'extrusion.formulas.view',
  'extrusion.formulas.manage',
  'extrusion.orders.view',
  'extrusion.orders.create',
  'extrusion.wip.view',
  'extrusion.wip.manage',
```

---

### 3.96 `run-full-13-step-flow.js`
- **Nombre original del archivo**: `run-full-13-step-flow.js`
- **Ubicación original**: `backend/src/scripts/run-full-13-step-flow.js` (23,569 bytes, 497 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de prueba/migración manual en `backend/src/scripts/` (run-full-13-step-flow.js).
- **Módulo relacionado**: Extrusión / Almacén / Fórmulas
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local y/o servidor Express local en `http://localhost:4000/api`.
- **Datos de entrada**: Modelos Sequelize o peticiones HTTP locales con usuario `nexus`.
- **Resultado esperado**: Ejecución paso a paso del flujo operativo o alineación de catálogos/fórmulas.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`, `backend/src/modules/reception/useCases/receiveMaterial.useCase.js`, `backend/src/modules/qrcodes/qrcodes.service.js`, `backend/src/modules/warehouse/inventoryDomain.service.js`, `backend/src/modules/warehouse/warehouse.service.js`, `backend/src/modules/warehouse/consumptionOrder.service.js`, `backend/src/modules/extrusion/extrusion.service.js`
- **Casos de negocio evaluados**: Validación de flujos de 13 pasos, híbrido silos vs manual, contenedores de mezcla, ruteo de rollos viajeros y backflushing.
- **Estado de vigencia**: **EXPERIMENTAL / HISTÓRICO (Conservado en Git, pendiente de depuración en reestructuración)**
- **Justificación de conservación o eliminación**: Documentado íntegramente en este inventario. Los scripts ya cubiertos por migraciones o por `backend/test/*.test.js` pueden retirarse en el saneamiento de Git.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
'use strict';

const {
  sequelize,
  User,
  Role,
  Material,
  Lote,
  Inventory,
  InventoryMovement,
  QrCode,
  QrBatch,
  ConsumptionOrder,
  ConsumptionOrderItem,
```

---

### 3.97 `seed-supervisor-extrusion.js`
- **Nombre original del archivo**: `seed-supervisor-extrusion.js`
- **Ubicación original**: `backend/src/scripts/seed-supervisor-extrusion.js` (250 bytes, 8 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de prueba/migración manual en `backend/src/scripts/` (seed-supervisor-extrusion.js).
- **Módulo relacionado**: Extrusión / Almacén / Fórmulas
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local y/o servidor Express local en `http://localhost:4000/api`.
- **Datos de entrada**: Modelos Sequelize o peticiones HTTP locales con usuario `nexus`.
- **Resultado esperado**: Ejecución paso a paso del flujo operativo o alineación de catálogos/fórmulas.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Validación de flujos de 13 pasos, híbrido silos vs manual, contenedores de mezcla, ruteo de rollos viajeros y backflushing.
- **Estado de vigencia**: **EXPERIMENTAL / HISTÓRICO (Conservado en Git, pendiente de depuración en reestructuración)**
- **Justificación de conservación o eliminación**: Documentado íntegramente en este inventario. Los scripts ya cubiertos por migraciones o por `backend/test/*.test.js` pueden retirarse en el saneamiento de Git.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
'use strict';

console.error(
  'Este script fue desactivado porque contenía credenciales fijas y reemplazaba usuarios existentes. ' +
    'Usa provision-demo-users.js con variables de entorno y secretos de GitHub Actions.'
);
process.exitCode = 1;

```

---

### 3.98 `seed-updated-extrusion-formulas.js`
- **Nombre original del archivo**: `seed-updated-extrusion-formulas.js`
- **Ubicación original**: `backend/src/scripts/seed-updated-extrusion-formulas.js` (28,909 bytes, 688 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de prueba/migración manual en `backend/src/scripts/` (seed-updated-extrusion-formulas.js).
- **Módulo relacionado**: Extrusión / Almacén / Fórmulas
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local y/o servidor Express local en `http://localhost:4000/api`.
- **Datos de entrada**: Modelos Sequelize o peticiones HTTP locales con usuario `nexus`.
- **Resultado esperado**: Ejecución paso a paso del flujo operativo o alineación de catálogos/fórmulas.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Validación de flujos de 13 pasos, híbrido silos vs manual, contenedores de mezcla, ruteo de rollos viajeros y backflushing.
- **Estado de vigencia**: **EXPERIMENTAL / HISTÓRICO (Conservado en Git, pendiente de depuración en reestructuración)**
- **Justificación de conservación o eliminación**: Documentado íntegramente en este inventario. Los scripts ya cubiertos por migraciones o por `backend/test/*.test.js` pueden retirarse en el saneamiento de Git.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
'use strict';

const {
  sequelize,
  Material,
  MaterialType,
  MaterialFamily,
  MaterialBrand,
  Location,
  Subarea,
  Area,
  Formula,
  FormulaIngredient,
  ProcessFormula,
```

---

### 3.99 `test-full-line-extrusion.js`
- **Nombre original del archivo**: `test-full-line-extrusion.js`
- **Ubicación original**: `backend/src/scripts/test-full-line-extrusion.js` (16,161 bytes, 359 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de prueba/migración manual en `backend/src/scripts/` (test-full-line-extrusion.js).
- **Módulo relacionado**: Extrusión / Almacén / Fórmulas
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local y/o servidor Express local en `http://localhost:4000/api`.
- **Datos de entrada**: Modelos Sequelize o peticiones HTTP locales con usuario `nexus`.
- **Resultado esperado**: Ejecución paso a paso del flujo operativo o alineación de catálogos/fórmulas.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`, `backend/src/modules/warehouse/inventoryDomain.service.js`, `backend/src/modules/warehouse/consumptionOrder.service.js`, `backend/src/modules/extrusion/extrusion.service.js`
- **Casos de negocio evaluados**: Validación de flujos de 13 pasos, híbrido silos vs manual, contenedores de mezcla, ruteo de rollos viajeros y backflushing.
- **Estado de vigencia**: **EXPERIMENTAL / HISTÓRICO (Conservado en Git, pendiente de depuración en reestructuración)**
- **Justificación de conservación o eliminación**: Documentado íntegramente en este inventario. Los scripts ya cubiertos por migraciones o por `backend/test/*.test.js` pueden retirarse en el saneamiento de Git.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
'use strict';

const {
  sequelize,
  User,
  Material,
  Lote,
  Inventory,
  QrCode,
  QrBatch,
  ConsumptionOrder,
  ConsumptionOrderItem,
  WipInventory,
  Formula,
```

---

### 3.100 `test-mix-containers-and-queue.js`
- **Nombre original del archivo**: `test-mix-containers-and-queue.js`
- **Ubicación original**: `backend/src/scripts/test-mix-containers-and-queue.js` (2,419 bytes, 59 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de prueba/migración manual en `backend/src/scripts/` (test-mix-containers-and-queue.js).
- **Módulo relacionado**: Extrusión / Almacén / Fórmulas
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local y/o servidor Express local en `http://localhost:4000/api`.
- **Datos de entrada**: Modelos Sequelize o peticiones HTTP locales con usuario `nexus`.
- **Resultado esperado**: Ejecución paso a paso del flujo operativo o alineación de catálogos/fórmulas.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`, `backend/src/modules/extrusion/extrusion.service.js`
- **Casos de negocio evaluados**: Validación de flujos de 13 pasos, híbrido silos vs manual, contenedores de mezcla, ruteo de rollos viajeros y backflushing.
- **Estado de vigencia**: **EXPERIMENTAL / HISTÓRICO (Conservado en Git, pendiente de depuración en reestructuración)**
- **Justificación de conservación o eliminación**: Documentado íntegramente en este inventario. Los scripts ya cubiertos por migraciones o por `backend/test/*.test.js` pueden retirarse en el saneamiento de Git.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize, Formula, FormulaIngredient, Material, WipInventory, QrCode, ExtruderQueue } = require('../database/models');
const extrusionService = require('../modules/extrusion/extrusion.service');

async function testMixContainersAndQueue() {
  try {
    console.log('--- TEST: MIX FORMULA CON CONTENEDORES Y ENCOLADO EN EXTRUSORA ---');

    // 1. Probar validación de restricciones en Extrusora 4 con F-EXT-1-BLANCO (restringida en Extrusora 4)
    const formulaBlanco = await Formula.findOne({
      where: { code: 'F-EXT-1-BLANCO' },
      include: [{ model: FormulaIngredient, as: 'ingredients', include: [{ model: Material, as: 'material' }] }]
    });

    if (!formulaBlanco) {
```

---

### 3.101 `test-odc-fifo-fulfillment.js`
- **Nombre original del archivo**: `test-odc-fifo-fulfillment.js`
- **Ubicación original**: `backend/src/scripts/test-odc-fifo-fulfillment.js` (5,660 bytes, 119 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Prueba de regresión integral sobre base de datos local desechable (con guardas estrictas `nodeEnv !== production`, `host === localhost` y nombre de BD con `test`).
- **Módulo relacionado**: Almacén -> Extrusión -> Telares (FIFO, ODC, Mezclas, Racks PTI, Fileta y Rollos)
- **Requisitos para ejecutarla**: Base de datos local clonada cuyo nombre incluya `test` y coincida con `ODC_TEST_DATABASE` / `TELARES_TEST_DATABASE`.
- **Datos de entrada**: Lotes FIFO, fórmulas activas, extrusoras, racks PTI y telares.
- **Resultado esperado**: Validación completa de fronteras de reglas de negocio sin errores de aserción.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/config/env.js`, `backend/src/database/models/index.js`, `backend/src/modules/warehouse/consumptionOrder.service.js`
- **Casos de negocio evaluados**: Cumplimiento FIFO en ODC, aislamiento de áreas y trazabilidad Almacén -> Extrusión -> Telares.
- **Estado de vigencia**: **PRUEBA AUXILIAR VIGENTE (Con guardas de aislamiento local)**
- **Justificación de conservación o eliminación**: Contiene validaciones profundas de integridad y guardas explícitas contra ejecución en producción. CONSERVAR o migrar a `backend/test/`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
'use strict';

// Mutating regression test. Run only against a disposable local database:
// DB_NAME=sistema_enterprise_test... ODC_TEST_DATABASE=sistema_enterprise_test... node src/scripts/test-odc-fifo-fulfillment.js
const env = require('../config/env');
const db = require('../database/models');
const consumptionOrderService = require('../modules/warehouse/consumptionOrder.service');

function assert(condition, message) {
  if (!condition) throw new Error(`ODC FIFO REGRESSION FAILED: ${message}`);
}

async function run() {
  assert(env.nodeEnv !== 'production', 'production is not allowed');
```

---

### 3.102 `test-points-1-to-7.js`
- **Nombre original del archivo**: `test-points-1-to-7.js`
- **Ubicación original**: `backend/src/scripts/test-points-1-to-7.js` (10,242 bytes, 194 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de prueba/migración manual en `backend/src/scripts/` (test-points-1-to-7.js).
- **Módulo relacionado**: Extrusión / Almacén / Fórmulas
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local y/o servidor Express local en `http://localhost:4000/api`.
- **Datos de entrada**: Modelos Sequelize o peticiones HTTP locales con usuario `nexus`.
- **Resultado esperado**: Ejecución paso a paso del flujo operativo o alineación de catálogos/fórmulas.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Validación de flujos de 13 pasos, híbrido silos vs manual, contenedores de mezcla, ruteo de rollos viajeros y backflushing.
- **Estado de vigencia**: **EXPERIMENTAL / HISTÓRICO (Conservado en Git, pendiente de depuración en reestructuración)**
- **Justificación de conservación o eliminación**: Documentado íntegramente en este inventario. Los scripts ya cubiertos por migraciones o por `backend/test/*.test.js` pueden retirarse en el saneamiento de Git.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
/**
 * Script de validación integral para los Puntos 1 al 7
 * Ejecuta validaciones contra el Backend local (puerto 4000)
 */
const API_BASE = 'http://localhost:4000/api';

async function req(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = {
    method,
    headers
```

---

### 3.103 `test-pti-endpoints.js`
- **Nombre original del archivo**: `test-pti-endpoints.js`
- **Ubicación original**: `backend/src/scripts/test-pti-endpoints.js` (3,725 bytes, 92 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de prueba/migración manual en `backend/src/scripts/` (test-pti-endpoints.js).
- **Módulo relacionado**: Extrusión / Almacén / Fórmulas
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local y/o servidor Express local en `http://localhost:4000/api`.
- **Datos de entrada**: Modelos Sequelize o peticiones HTTP locales con usuario `nexus`.
- **Resultado esperado**: Ejecución paso a paso del flujo operativo o alineación de catálogos/fórmulas.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Validación de flujos de 13 pasos, híbrido silos vs manual, contenedores de mezcla, ruteo de rollos viajeros y backflushing.
- **Estado de vigencia**: **EXPERIMENTAL / HISTÓRICO (Conservado en Git, pendiente de depuración en reestructuración)**
- **Justificación de conservación o eliminación**: Documentado íntegramente en este inventario. Los scripts ya cubiertos por migraciones o por `backend/test/*.test.js` pueden retirarse en el saneamiento de Git.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const API_BASE = 'http://localhost:4000/api';

async function req(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = {
    method,
    headers
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${endpoint}`, options);
```

---

### 3.104 `test-routing-globo-laminado.js`
- **Nombre original del archivo**: `test-routing-globo-laminado.js`
- **Ubicación original**: `backend/src/scripts/test-routing-globo-laminado.js` (3,393 bytes, 83 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de prueba/migración manual en `backend/src/scripts/` (test-routing-globo-laminado.js).
- **Módulo relacionado**: Telares -> Globo / Laminado / Corte
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local y/o servidor Express local en `http://localhost:4000/api`.
- **Datos de entrada**: Modelos Sequelize o peticiones HTTP locales con usuario `nexus`.
- **Resultado esperado**: Ejecución paso a paso del flujo operativo o alineación de catálogos/fórmulas.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`, `backend/src/modules/telares/telares.service.js`, `backend/src/modules/globo/globo.service.js`, `backend/src/modules/laminado/laminado.service.js`
- **Casos de negocio evaluados**: Validación de flujos de 13 pasos, híbrido silos vs manual, contenedores de mezcla, ruteo de rollos viajeros y backflushing.
- **Estado de vigencia**: **EXPERIMENTAL / HISTÓRICO (Conservado en Git, pendiente de depuración en reestructuración)**
- **Justificación de conservación o eliminación**: Documentado íntegramente en este inventario. Los scripts ya cubiertos por migraciones o por `backend/test/*.test.js` pueden retirarse en el saneamiento de Git.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const {
  ViajeroRoll,
  LoomRun,
  Loom,
  ProductionBom,
  GloboSpecification,
  LaminadoSpecification,
  WipInventory,
  Material,
  User,
  sequelize,
} = require('../database/models');
const telaresService = require('../modules/telares/telares.service');
const globoService = require('../modules/globo/globo.service');
```

---

### 3.105 `test-silo-hybrid-extrusion.js`
- **Nombre original del archivo**: `test-silo-hybrid-extrusion.js`
- **Ubicación original**: `backend/src/scripts/test-silo-hybrid-extrusion.js` (12,158 bytes, 260 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de prueba/migración manual en `backend/src/scripts/` (test-silo-hybrid-extrusion.js).
- **Módulo relacionado**: Extrusión / Almacén / Fórmulas
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local y/o servidor Express local en `http://localhost:4000/api`.
- **Datos de entrada**: Modelos Sequelize o peticiones HTTP locales con usuario `nexus`.
- **Resultado esperado**: Ejecución paso a paso del flujo operativo o alineación de catálogos/fórmulas.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`, `backend/src/config/env.js`, `backend/src/config/database.js`
- **Casos de negocio evaluados**: Validación de flujos de 13 pasos, híbrido silos vs manual, contenedores de mezcla, ruteo de rollos viajeros y backflushing.
- **Estado de vigencia**: **EXPERIMENTAL / HISTÓRICO (Conservado en Git, pendiente de depuración en reestructuración)**
- **Justificación de conservación o eliminación**: Documentado íntegramente en este inventario. Los scripts ya cubiertos por migraciones o por `backend/test/*.test.js` pueden retirarse en el saneamiento de Git.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const API_BASE = 'http://localhost:4000/api';

async function req(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || `HTTP ${res.status}`);
    error.status = res.status;
```

---

### 3.106 `test-telares-backflush-flow.js`
- **Nombre original del archivo**: `test-telares-backflush-flow.js`
- **Ubicación original**: `backend/src/scripts/test-telares-backflush-flow.js` (14,366 bytes, 325 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de prueba/migración manual en `backend/src/scripts/` (test-telares-backflush-flow.js).
- **Módulo relacionado**: Telares / BOM / Backflush
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local y/o servidor Express local en `http://localhost:4000/api`.
- **Datos de entrada**: Modelos Sequelize o peticiones HTTP locales con usuario `nexus`.
- **Resultado esperado**: Ejecución paso a paso del flujo operativo o alineación de catálogos/fórmulas.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`, `backend/src/modules/telares/telares.service.js`, `backend/src/modules/warehouse/consumptionOrder.service.js`
- **Casos de negocio evaluados**: Validación de flujos de 13 pasos, híbrido silos vs manual, contenedores de mezcla, ruteo de rollos viajeros y backflushing.
- **Estado de vigencia**: **EXPERIMENTAL / HISTÓRICO (Conservado en Git, pendiente de depuración en reestructuración)**
- **Justificación de conservación o eliminación**: Documentado íntegramente en este inventario. Los scripts ya cubiertos por migraciones o por `backend/test/*.test.js` pueden retirarse en el saneamiento de Git.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
'use strict';
const { Op } = require('sequelize');
const db = require('../database/models');
const telaresService = require('../modules/telares/telares.service');
const consumptionOrderService = require('../modules/warehouse/consumptionOrder.service');

async function runTest() {
  console.log('====================================================');
  console.log('🧪 INICIANDO PRUEBAS DE TELARES, BACKFLUSHING Y QR VIAJERO');
  console.log('====================================================\n');

  try {
    // 1. Obtener Telar y BOM
    const looms = await telaresService.getLooms();
```

---

### 3.107 `test-transform-flow.js`
- **Nombre original del archivo**: `test-transform-flow.js`
- **Ubicación original**: `backend/src/scripts/test-transform-flow.js` (7,144 bytes, 142 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de prueba/migración manual en `backend/src/scripts/` (test-transform-flow.js).
- **Módulo relacionado**: Telares -> Globo / Laminado / Corte
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local y/o servidor Express local en `http://localhost:4000/api`.
- **Datos de entrada**: Modelos Sequelize o peticiones HTTP locales con usuario `nexus`.
- **Resultado esperado**: Ejecución paso a paso del flujo operativo o alineación de catálogos/fórmulas.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`, `backend/src/modules/globo/globo.service.js`, `backend/src/modules/laminado/laminado.service.js`
- **Casos de negocio evaluados**: Validación de flujos de 13 pasos, híbrido silos vs manual, contenedores de mezcla, ruteo de rollos viajeros y backflushing.
- **Estado de vigencia**: **EXPERIMENTAL / HISTÓRICO (Conservado en Git, pendiente de depuración en reestructuración)**
- **Justificación de conservación o eliminación**: Documentado íntegramente en este inventario. Los scripts ya cubiertos por migraciones o por `backend/test/*.test.js` pueden retirarse en el saneamiento de Git.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const {
  ViajeroRoll,
  LoomRun,
  Loom,
  ProductionBom,
  GloboSpecification,
  LaminadoSpecification,
  WipInventory,
  sequelize,
} = require('../database/models');
const globoService = require('../modules/globo/globo.service');
const laminadoService = require('../modules/laminado/laminado.service');

async function testTransformFlow() {
```

---

### 3.108 `test-warehouse-to-telares-integrity.js`
- **Nombre original del archivo**: `test-warehouse-to-telares-integrity.js`
- **Ubicación original**: `backend/src/scripts/test-warehouse-to-telares-integrity.js` (18,536 bytes, 324 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Prueba de regresión integral sobre base de datos local desechable (con guardas estrictas `nodeEnv !== production`, `host === localhost` y nombre de BD con `test`).
- **Módulo relacionado**: Almacén -> Extrusión -> Telares (FIFO, ODC, Mezclas, Racks PTI, Fileta y Rollos)
- **Requisitos para ejecutarla**: Base de datos local clonada cuyo nombre incluya `test` y coincida con `ODC_TEST_DATABASE` / `TELARES_TEST_DATABASE`.
- **Datos de entrada**: Lotes FIFO, fórmulas activas, extrusoras, racks PTI y telares.
- **Resultado esperado**: Validación completa de fronteras de reglas de negocio sin errores de aserción.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/config/env.js`, `backend/src/database/models/index.js`, `backend/src/modules/warehouse/consumptionOrder.service.js`, `backend/src/modules/extrusion/extrusion.service.js`, `backend/src/modules/telares/telares.service.js`
- **Casos de negocio evaluados**: Cumplimiento FIFO en ODC, aislamiento de áreas y trazabilidad Almacén -> Extrusión -> Telares.
- **Estado de vigencia**: **PRUEBA AUXILIAR VIGENTE (Con guardas de aislamiento local)**
- **Justificación de conservación o eliminación**: Contiene validaciones profundas de integridad y guardas explícitas contra ejecución en producción. CONSERVAR o migrar a `backend/test/`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
'use strict';

// Explicitly restricted to a disposable local clone. Example:
// $env:DB_NAME='telares_integrity_test'; $env:TELARES_TEST_DATABASE='telares_integrity_test'; node src/scripts/test-warehouse-to-telares-integrity.js
const env = require('../config/env');
const db = require('../database/models');
const warehouseService = require('../modules/warehouse/consumptionOrder.service');
const extrusionService = require('../modules/extrusion/extrusion.service');
const telaresService = require('../modules/telares/telares.service');

function assert(condition, message) {
  if (!condition) throw new Error(`INTEGRITY ASSERTION FAILED: ${message}`);
}

```

---

### 3.109 `update-models.js`
- **Nombre original del archivo**: `update-models.js`
- **Ubicación original**: `backend/src/scripts/update-models.js` (1,858 bytes, 33 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de prueba/migración manual en `backend/src/scripts/` (update-models.js).
- **Módulo relacionado**: Extrusión / Almacén / Fórmulas
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local y/o servidor Express local en `http://localhost:4000/api`.
- **Datos de entrada**: Modelos Sequelize o peticiones HTTP locales con usuario `nexus`.
- **Resultado esperado**: Ejecución paso a paso del flujo operativo o alineación de catálogos/fórmulas.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/modules/globo/models/globoSpecification.model (UNRESOLVED)`, `backend/modules/globo/models/globoSpecificationMaterial.model (UNRESOLVED)`, `backend/modules/laminado/models/laminadoSpecification.model (UNRESOLVED)`, `backend/modules/laminado/models/laminadoSpecificationMaterial.model (UNRESOLVED)`
- **Casos de negocio evaluados**: Validación de flujos de 13 pasos, híbrido silos vs manual, contenedores de mezcla, ruteo de rollos viajeros y backflushing.
- **Estado de vigencia**: **EXPERIMENTAL / HISTÓRICO (Conservado en Git, pendiente de depuración en reestructuración)**
- **Justificación de conservación o eliminación**: Documentado íntegramente en este inventario. Los scripts ya cubiertos por migraciones o por `backend/test/*.test.js` pueden retirarse en el saneamiento de Git.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const fs = require('fs');
const path = require('path');

const modelsIndexPath = path.join(__dirname, '../database/models/index.js');
let content = fs.readFileSync(modelsIndexPath, 'utf8');

if (!content.includes('GloboSpecification')) {
  const addition = `// ============================================
// GLOBO Y LAMINADO SPECIFICATIONS & CATALOGS
// ============================================
db.GloboSpecification = require('../../modules/globo/models/globoSpecification.model')(sequelize, DataTypes);
db.GloboSpecificationMaterial = require('../../modules/globo/models/globoSpecificationMaterial.model')(sequelize, DataTypes);
db.LaminadoSpecification = require('../../modules/laminado/models/laminadoSpecification.model')(sequelize, DataTypes);
db.LaminadoSpecificationMaterial = require('../../modules/laminado/models/laminadoSpecificationMaterial.model')(sequelize, DataTypes);
```

---

### 3.110 `validate-migration.js`
- **Nombre original del archivo**: `validate-migration.js`
- **Ubicación original**: `backend/src/scripts/validate-migration.js` (1,911 bytes, 53 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Validación pre-migración ejecutada en CI/CD para comprobar conexión a PostgreSQL y existencia de las 12 tablas críticas del MES/Almacén antes de correr `db:migrate`.
- **Módulo relacionado**: Base de Datos / DevOps CI/CD
- **Requisitos para ejecutarla**: Variable `DATABASE_URL` con SSL habilitado.
- **Datos de entrada**: Esquema `public` de PostgreSQL.
- **Resultado esperado**: Código de salida 0 si las tablas críticas existen (o si la BD está vacía en instalación inicial); código 1 si faltan tablas críticas.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Protección de integridad de esquema antes de migraciones productivas.
- **Estado de vigencia**: **VIGENTE / CRÍTICO (Usado por `.github/workflows/migrations.yml` y `seed-catalogs.yml`)**
- **Justificación de conservación o eliminación**: Script operativo de CI/CD en GitHub Actions. CONSERVAR.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

```

---

### 3.111 `verify-catalog-seed.js`
- **Nombre original del archivo**: `verify-catalog-seed.js`
- **Ubicación original**: `backend/src/scripts/verify-catalog-seed.js` (2,043 bytes, 62 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Verificar mediante conteos mínimos esperados (`EXPECTED`) que el seeder de catálogos pobló correctamente familias, códigos, tipos, marcas, localidades y rankings.
- **Módulo relacionado**: MasterData / DevOps CI/CD
- **Requisitos para ejecutarla**: Conexión a BD configurada en `database/models`.
- **Datos de entrada**: Tablas `material_families`, `material_codes`, `material_types`, `material_brands`, `material_locations`, `rankings`.
- **Resultado esperado**: Código de salida 0 si todas las tablas superan el umbral mínimo; código 1 en caso contrario.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Post-verificación automatizada de carga de catálogos en Neon.
- **Estado de vigencia**: **VIGENTE / CRÍTICO (Usado por `.github/workflows/seed-catalogs.yml`)**
- **Justificación de conservación o eliminación**: Script operativo de CI/CD en GitHub Actions. CONSERVAR.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
/**
 * verify-catalog-seed.js
 * 
 * Verifica que el seeder de catálogos dejó los registros esperados en Neon.
 * Corre como post-step en el workflow seed-catalogs.yml
 */

'use strict';

require('dotenv').config();
const db = require('../database/models');

const EXPECTED = {
  material_families:  1,   // mínimo esperado
```

---

### 3.112 `sync-master-data.js`
- **Nombre original del archivo**: `sync-master-data.js`
- **Ubicación original**: `backend/sync-master-data.js` (7,990 bytes, 229 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const xlsx = require('xlsx');
const path = require('path');
const db = require('./src/database/models');
const { Op } = db.Sequelize; // Importante para usar operadores como 'notIn'

function findDuplicates(data, columnName, sheetName) {
  const seen = new Set();
  const duplicates = new Set();
  
  for (const row of data) {
    const value = row[columnName] ? String(row[columnName]).trim() : null;
    if (!value) continue;
    
    if (seen.has(value)) {
```

---

### 3.113 `sync_seq.js`
- **Nombre original del archivo**: `sync_seq.js`
- **Ubicación original**: `backend/sync_seq.js` (773 bytes, 22 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    logging: false
});

async function main() {
    const tables = ['materials', 'material_families', 'material_codes', 'material_brands', 'material_locations', 'material_types', 'operational_areas'];
    for (const t of tables) {
        try {
            const r = await s.query(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT MAX(id)+1 FROM ${t}), 1), false)`);
            console.log(`Synced ${t}`);
```

---

### 3.114 `terminate-locks.js`
- **Nombre original del archivo**: `terminate-locks.js`
- **Ubicación original**: `backend/terminate-locks.js` (317 bytes, 8 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const db = require('./src/database/models');
async function run() {
  await db.sequelize.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid != pg_backend_pid() AND datname = current_database()`);
  console.log('Terminated all other connections for current database');
  process.exit(0);
}
run();

```

---

### 3.115 `test-audit.js`
- **Nombre original del archivo**: `test-audit.js`
- **Ubicación original**: `backend/test-audit.js` (3,525 bytes, 92 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script de prueba manual o diagnóstico de primera generación (test-audit.js).
- **Módulo relacionado**: Módulo Legado Scrap / EventBus / Core Integrity
- **Requisitos para ejecutarla**: PostgreSQL local y/o servidor Express en puerto 4000.
- **Datos de entrada**: Datos de prueba locales o payloads HTTP.
- **Resultado esperado**: Verificación por consola de la operación probada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`, `backend/src/modules/scrap/services/updateContainerInventory.service.js`, `backend/src/modules/scrap/scrap.audit.service.js`
- **Casos de negocio evaluados**: Pruebas iniciales de julio-noviembre 2026 (concurrencia ACID, EventBus, Joi, generación PDF de etiquetas, latencia de inserción en `lotes`).
- **Estado de vigencia**: **OBSOLETO (Superado por la suite `node:test` en `backend/test/`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const { sequelize, ScrapContainer, AuditLog } = require('./src/database/models');
const { updateContainerInventory } = require('./src/modules/scrap/services/updateContainerInventory.service');

// Asegurarse de que el hook esté inicializado
require('./src/modules/scrap/scrap.audit.service'); 

async function runAuditTests() {
    try {
        await sequelize.authenticate();
        console.log("Conectado a la BD...");

        console.log("=====================================");
        console.log("TEST: Auditoría Automática (Hooks)");
```

---

### 3.116 `test-concurrency.js`
- **Nombre original del archivo**: `test-concurrency.js`
- **Ubicación original**: `backend/test-concurrency.js` (4,561 bytes, 107 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script de prueba manual o diagnóstico de primera generación (test-concurrency.js).
- **Módulo relacionado**: Módulo Legado Scrap / EventBus / Core Integrity
- **Requisitos para ejecutarla**: PostgreSQL local y/o servidor Express en puerto 4000.
- **Datos de entrada**: Datos de prueba locales o payloads HTTP.
- **Resultado esperado**: Verificación por consola de la operación probada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`, `backend/src/modules/scrap/services/updateContainerInventory.service.js`
- **Casos de negocio evaluados**: Pruebas iniciales de julio-noviembre 2026 (concurrencia ACID, EventBus, Joi, generación PDF de etiquetas, latencia de inserción en `lotes`).
- **Estado de vigencia**: **OBSOLETO (Superado por la suite `node:test` en `backend/test/`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const { sequelize, ScrapContainer } = require('./src/database/models');
const { updateContainerInventory } = require('./src/modules/scrap/services/updateContainerInventory.service');

async function runConcurrencyTests() {
    try {
        await sequelize.authenticate();
        console.log("Conectado a la BD...");

        console.log("=====================================");
        console.log("TEST: Concurrencia ACID y Race Conditions");
        console.log("=====================================");

        // Crear contenedor aislado para la prueba
```

---

### 3.117 `test-const.js`
- **Nombre original del archivo**: `test-const.js`
- **Ubicación original**: `backend/test-const.js` (537 bytes, 21 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script de prueba manual o diagnóstico de primera generación (test-const.js).
- **Módulo relacionado**: Almacén / Usuarios / Roles / Etiquetas PDF / Rendimiento PG
- **Requisitos para ejecutarla**: PostgreSQL local y/o servidor Express en puerto 4000.
- **Datos de entrada**: Datos de prueba locales o payloads HTTP.
- **Resultado esperado**: Verificación por consola de la operación probada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Pruebas iniciales de julio-noviembre 2026 (concurrencia ACID, EventBus, Joi, generación PDF de etiquetas, latencia de inserción en `lotes`).
- **Estado de vigencia**: **OBSOLETO (Superado por la suite `node:test` en `backend/test/`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { Client } = require('pg');
require('dotenv').config();

async function checkStats() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'sistema_enterprise',
    user: 'postgres',
    password: process.env.DB_PASSWORD
  });
  await client.connect();

  const res = await client.query(`SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'lotes'::regclass`);
```

---

### 3.118 `test-consumptions.js`
- **Nombre original del archivo**: `test-consumptions.js`
- **Ubicación original**: `backend/test-consumptions.js` (331 bytes, 8 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script de prueba manual o diagnóstico de primera generación (test-consumptions.js).
- **Módulo relacionado**: Almacén / Usuarios / Roles / Etiquetas PDF / Rendimiento PG
- **Requisitos para ejecutarla**: PostgreSQL local y/o servidor Express en puerto 4000.
- **Datos de entrada**: Datos de prueba locales o payloads HTTP.
- **Resultado esperado**: Verificación por consola de la operación probada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Pruebas iniciales de julio-noviembre 2026 (concurrencia ACID, EventBus, Joi, generación PDF de etiquetas, latencia de inserción en `lotes`).
- **Estado de vigencia**: **OBSOLETO (Superado por la suite `node:test` en `backend/test/`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize, MaterialConsumption, MaterialConsumptionItem, TraceabilityEvent } = require('./src/database/models');
async function test() {
  const events = await TraceabilityEvent.findAll({ order: [['created_at', 'DESC']], limit: 10 });
  console.log('Events:', JSON.stringify(events, null, 2));
  process.exit(0);
}
test();

```

---

### 3.119 `test-core-integrity.js`
- **Nombre original del archivo**: `test-core-integrity.js`
- **Ubicación original**: `backend/test-core-integrity.js` (8,289 bytes, 221 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script de prueba manual o diagnóstico de primera generación (test-core-integrity.js).
- **Módulo relacionado**: Almacén / Usuarios / Roles / Etiquetas PDF / Rendimiento PG
- **Requisitos para ejecutarla**: PostgreSQL local y/o servidor Express en puerto 4000.
- **Datos de entrada**: Datos de prueba locales o payloads HTTP.
- **Resultado esperado**: Verificación por consola de la operación probada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`, `backend/src/modules/formulas/processPreparation.service.js`, `backend/src/modules/processes/processRun.service.js`, `backend/src/modules/processes/processRunTelares.service.js`, `backend/src/modules/qrcodes/qrcodes.service.js`
- **Casos de negocio evaluados**: Pruebas iniciales de julio-noviembre 2026 (concurrencia ACID, EventBus, Joi, generación PDF de etiquetas, latencia de inserción en `lotes`).
- **Estado de vigencia**: **OBSOLETO (Superado por la suite `node:test` en `backend/test/`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const db = require('./src/database/models');
const processPreparationService = require('./src/modules/formulas/processPreparation.service');
const processRunService = require('./src/modules/processes/processRun.service');
const processRunTelaresService = require('./src/modules/processes/processRunTelares.service');
const qrCodesService = require('./src/modules/qrcodes/qrcodes.service');

const mockUser = {
  id: 1,
  areaId: 1, // Almacén inicialmente
  area_id: 1,
  role: { code: 'SUPERADMIN' }, // Para saltar verificaciones de seguridad
  ip_address: '127.0.0.1',
  user_agent: 'TestingSuite',
```

---

### 3.120 `test-dashboard.js`
- **Nombre original del archivo**: `test-dashboard.js`
- **Ubicación original**: `backend/test-dashboard.js` (2,721 bytes, 57 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script de prueba manual o diagnóstico de primera generación (test-dashboard.js).
- **Módulo relacionado**: Módulo Legado Scrap / EventBus / Core Integrity
- **Requisitos para ejecutarla**: PostgreSQL local y/o servidor Express en puerto 4000.
- **Datos de entrada**: Datos de prueba locales o payloads HTTP.
- **Resultado esperado**: Verificación por consola de la operación probada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`, `backend/src/modules/scrap/scrap.dashboard.service.js`
- **Casos de negocio evaluados**: Pruebas iniciales de julio-noviembre 2026 (concurrencia ACID, EventBus, Joi, generación PDF de etiquetas, latencia de inserción en `lotes`).
- **Estado de vigencia**: **OBSOLETO (Superado por la suite `node:test` en `backend/test/`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const { sequelize, ScrapContainer, ScrapMovement } = require('./src/database/models');
const scrapDashboardService = require('./src/modules/scrap/scrap.dashboard.service');

async function runDashboardTests() {
    try {
        await sequelize.authenticate();
        console.log("Conectado a la BD...");

        console.log("=====================================");
        console.log("TEST: Dashboard Summary");
        console.log("=====================================");
        const summary = await scrapDashboardService.getDashboardSummary();
        console.log("Total Containers:", summary.total_containers);
```

---

### 3.121 `test-events.js`
- **Nombre original del archivo**: `test-events.js`
- **Ubicación original**: `backend/test-events.js` (2,260 bytes, 67 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script de prueba manual o diagnóstico de primera generación (test-events.js).
- **Módulo relacionado**: Módulo Legado Scrap / EventBus / Core Integrity
- **Requisitos para ejecutarla**: PostgreSQL local y/o servidor Express en puerto 4000.
- **Datos de entrada**: Datos de prueba locales o payloads HTTP.
- **Resultado esperado**: Verificación por consola de la operación probada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`, `backend/src/modules/scrap/services/updateContainerInventory.service.js`, `backend/src/core/events/eventBus.js`
- **Casos de negocio evaluados**: Pruebas iniciales de julio-noviembre 2026 (concurrencia ACID, EventBus, Joi, generación PDF de etiquetas, latencia de inserción en `lotes`).
- **Estado de vigencia**: **OBSOLETO (Superado por la suite `node:test` en `backend/test/`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const { sequelize, ScrapContainer } = require('./src/database/models');
const { updateContainerInventory } = require('./src/modules/scrap/services/updateContainerInventory.service');
const { eventBus, ScrapEvents } = require('./src/core/events/eventBus');

async function runEventTests() {
    try {
        await sequelize.authenticate();
        console.log("Conectado a la BD...");

        let eventEmitted = false;
        let eventPayload = null;

        // Registrar listener temporal
```

---

### 3.122 `test-joi.js`
- **Nombre original del archivo**: `test-joi.js`
- **Ubicación original**: `backend/test-joi.js` (510 bytes, 25 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script de prueba manual o diagnóstico de primera generación (test-joi.js).
- **Módulo relacionado**: Almacén / Usuarios / Roles / Etiquetas PDF / Rendimiento PG
- **Requisitos para ejecutarla**: PostgreSQL local y/o servidor Express en puerto 4000.
- **Datos de entrada**: Datos de prueba locales o payloads HTTP.
- **Resultado esperado**: Verificación por consola de la operación probada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/modules/users/users.validator.js`
- **Casos de negocio evaluados**: Pruebas iniciales de julio-noviembre 2026 (concurrencia ACID, EventBus, Joi, generación PDF de etiquetas, latencia de inserción en `lotes`).
- **Estado de vigencia**: **OBSOLETO (Superado por la suite `node:test` en `backend/test/`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { updateUserSchema } = require('./src/modules/users/users.validator');

const payload = {
  first_name: 'Admin',
  last_name: 'Super',
  username: 'admin',
  numero_nomina: '',
  email: 'admin@nexus.com',
  is_active: true,
  telefono: '',
  role_id: 1,
  area_id: null
};

```

---

### 3.123 `test-manual-entry.js`
- **Nombre original del archivo**: `test-manual-entry.js`
- **Ubicación original**: `backend/test-manual-entry.js` (1,915 bytes, 73 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script de prueba manual o diagnóstico de primera generación (test-manual-entry.js).
- **Módulo relacionado**: Almacén / Usuarios / Roles / Etiquetas PDF / Rendimiento PG
- **Requisitos para ejecutarla**: PostgreSQL local y/o servidor Express en puerto 4000.
- **Datos de entrada**: Datos de prueba locales o payloads HTTP.
- **Resultado esperado**: Verificación por consola de la operación probada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Pruebas iniciales de julio-noviembre 2026 (concurrencia ACID, EventBus, Joi, generación PDF de etiquetas, latencia de inserción en `lotes`).
- **Estado de vigencia**: **OBSOLETO (Superado por la suite `node:test` en `backend/test/`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const http = require('http');

const request = (options, data = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch(e) {
          resolve({ status: res.statusCode, data: body });
        }
```

---

### 3.124 `test-pdf.js`
- **Nombre original del archivo**: `test-pdf.js`
- **Ubicación original**: `backend/test-pdf.js` (2,359 bytes, 78 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script de prueba manual o diagnóstico de primera generación (test-pdf.js).
- **Módulo relacionado**: Almacén / Usuarios / Roles / Etiquetas PDF / Rendimiento PG
- **Requisitos para ejecutarla**: PostgreSQL local y/o servidor Express en puerto 4000.
- **Datos de entrada**: Datos de prueba locales o payloads HTTP.
- **Resultado esperado**: Verificación por consola de la operación probada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Pruebas iniciales de julio-noviembre 2026 (concurrencia ACID, EventBus, Joi, generación PDF de etiquetas, latencia de inserción en `lotes`).
- **Estado de vigencia**: **OBSOLETO (Superado por la suite `node:test` en `backend/test/`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');

async function testPdf() {
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  doc.pipe(fs.createWriteStream('test-label.pdf'));

  const cmToPt = 28.3465;
  const cellSize = 5 * cmToPt; // 141.73
  
  const x = 100;
  const y = 100;

```

---

### 3.125 `test-perf.js`
- **Nombre original del archivo**: `test-perf.js`
- **Ubicación original**: `backend/test-perf.js` (2,447 bytes, 84 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script de prueba manual o diagnóstico de primera generación (test-perf.js).
- **Módulo relacionado**: Almacén / Usuarios / Roles / Etiquetas PDF / Rendimiento PG
- **Requisitos para ejecutarla**: PostgreSQL local y/o servidor Express en puerto 4000.
- **Datos de entrada**: Datos de prueba locales o payloads HTTP.
- **Resultado esperado**: Verificación por consola de la operación probada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Pruebas iniciales de julio-noviembre 2026 (concurrencia ACID, EventBus, Joi, generación PDF de etiquetas, latencia de inserción en `lotes`).
- **Estado de vigencia**: **OBSOLETO (Superado por la suite `node:test` en `backend/test/`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize, Lote, Inventory, InventoryMovement, User } = require('./src/database/models');
const { performance } = require('perf_hooks');

async function testPerf() {
  try {
    console.log("Authenticating DB...");
    await sequelize.authenticate();
    console.log("DB Authenticated.");

    const t = await sequelize.transaction();
    console.log("Transaction started.");

    const loteData = [
      {
```

---

### 3.126 `test-prod-api.js`
- **Nombre original del archivo**: `test-prod-api.js`
- **Ubicación original**: `backend/test-prod-api.js` (1,382 bytes, 40 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script de prueba manual o diagnóstico de primera generación (test-prod-api.js).
- **Módulo relacionado**: Almacén / Usuarios / Roles / Etiquetas PDF / Rendimiento PG
- **Requisitos para ejecutarla**: PostgreSQL local y/o servidor Express en puerto 4000.
- **Datos de entrada**: Datos de prueba locales o payloads HTTP.
- **Resultado esperado**: Verificación por consola de la operación probada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Pruebas iniciales de julio-noviembre 2026 (concurrencia ACID, EventBus, Joi, generación PDF de etiquetas, latencia de inserción en `lotes`).
- **Estado de vigencia**: **OBSOLETO (Superado por la suite `node:test` en `backend/test/`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const axios = require('axios');
require('dotenv').config();

const API_BASE = (process.env.QA_API_BASE || 'http://localhost:4000/api').replace(/\/$/, '');
if (!process.env.TEST_ACCOUNT_PASSWORD) throw new Error('TEST_ACCOUNT_PASSWORD is required.');
if (/mes-backend-3oux\.onrender\.com/i.test(API_BASE) && process.env.ALLOW_PRODUCTION_SECURITY_TESTS !== 'YES') {
  throw new Error('Set ALLOW_PRODUCTION_SECURITY_TESTS=YES only when production probing has been explicitly approved.');
}

async function check() {
  try {
    console.log('Logging in...');
    // Login to get token
```

---

### 3.127 `test-production-integration.js`
- **Nombre original del archivo**: `test-production-integration.js`
- **Ubicación original**: `backend/test-production-integration.js` (2,933 bytes, 62 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script de prueba manual o diagnóstico de primera generación (test-production-integration.js).
- **Módulo relacionado**: Módulo Legado Scrap / EventBus / Core Integrity
- **Requisitos para ejecutarla**: PostgreSQL local y/o servidor Express en puerto 4000.
- **Datos de entrada**: Datos de prueba locales o payloads HTTP.
- **Resultado esperado**: Verificación por consola de la operación probada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`, `backend/src/core/events/eventBus.js`, `backend/src/modules/scrap/scrap.listeners.js`
- **Casos de negocio evaluados**: Pruebas iniciales de julio-noviembre 2026 (concurrencia ACID, EventBus, Joi, generación PDF de etiquetas, latencia de inserción en `lotes`).
- **Estado de vigencia**: **OBSOLETO (Superado por la suite `node:test` en `backend/test/`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const { sequelize, ProcessRunInput, ProcessRunOutput, ProcessRun, ScrapContainer } = require('./src/database/models');
const { eventBus, ProductionEvents } = require('./src/core/events/eventBus');

// Inicializar listeners
const registerScrapListeners = require('./src/modules/scrap/scrap.listeners');
registerScrapListeners();

async function runProductionIntegrationTests() {
    try {
        await sequelize.authenticate();
        console.log("Conectado a la BD...");

        console.log("=====================================");
```

---

### 3.128 `test-put.js`
- **Nombre original del archivo**: `test-put.js`
- **Ubicación original**: `backend/test-put.js` (761 bytes, 29 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script de prueba manual o diagnóstico de primera generación (test-put.js).
- **Módulo relacionado**: Almacén / Usuarios / Roles / Etiquetas PDF / Rendimiento PG
- **Requisitos para ejecutarla**: PostgreSQL local y/o servidor Express en puerto 4000.
- **Datos de entrada**: Datos de prueba locales o payloads HTTP.
- **Resultado esperado**: Verificación por consola de la operación probada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Pruebas iniciales de julio-noviembre 2026 (concurrencia ACID, EventBus, Joi, generación PDF de etiquetas, latencia de inserción en `lotes`).
- **Estado de vigencia**: **OBSOLETO (Superado por la suite `node:test` en `backend/test/`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const axios = require('axios');

async function testPut() {
  try {
    const res = await axios.put('http://localhost:4000/api/users/1', {
      first_name: "Admin",
      last_name: "User",
      email: "admin@nexus.com",
      username: "admin",
      role_id: 1,
      area_id: null,
      is_active: true,
      telefono: "",
      numero_nomina: ""
```

---

### 3.129 `test-query.js`
- **Nombre original del archivo**: `test-query.js`
- **Ubicación original**: `backend/test-query.js` (681 bytes, 34 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script de prueba manual o diagnóstico de primera generación (test-query.js).
- **Módulo relacionado**: Almacén / Usuarios / Roles / Etiquetas PDF / Rendimiento PG
- **Requisitos para ejecutarla**: PostgreSQL local y/o servidor Express en puerto 4000.
- **Datos de entrada**: Datos de prueba locales o payloads HTTP.
- **Resultado esperado**: Verificación por consola de la operación probada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Pruebas iniciales de julio-noviembre 2026 (concurrencia ACID, EventBus, Joi, generación PDF de etiquetas, latencia de inserción en `lotes`).
- **Estado de vigencia**: **OBSOLETO (Superado por la suite `node:test` en `backend/test/`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const db = require('./src/database/models');

async function test() {
  try {
    const formulas = await db.ProcessFormula.findAll({
      include: [
        {
          model: db.Area,
          as: 'target_area',
          required: false,
        },
        {
          model: db.ProcessFormulaItem,
          as: 'items',
```

---

### 3.130 `test-raw.js`
- **Nombre original del archivo**: `test-raw.js`
- **Ubicación original**: `backend/test-raw.js` (1,229 bytes, 40 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script de prueba manual o diagnóstico de primera generación (test-raw.js).
- **Módulo relacionado**: Almacén / Usuarios / Roles / Etiquetas PDF / Rendimiento PG
- **Requisitos para ejecutarla**: PostgreSQL local y/o servidor Express en puerto 4000.
- **Datos de entrada**: Datos de prueba locales o payloads HTTP.
- **Resultado esperado**: Verificación por consola de la operación probada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Pruebas iniciales de julio-noviembre 2026 (concurrencia ACID, EventBus, Joi, generación PDF de etiquetas, latencia de inserción en `lotes`).
- **Estado de vigencia**: **OBSOLETO (Superado por la suite `node:test` en `backend/test/`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { Client } = require('pg');
const { performance } = require('perf_hooks');
require('dotenv').config();

async function rawTest() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'sistema_enterprise',
    user: 'postgres',
    password: process.env.DB_PASSWORD
  });

  console.log("Connecting...");
```

---

### 3.131 `test-report.js`
- **Nombre original del archivo**: `test-report.js`
- **Ubicación original**: `backend/test-report.js` (1,762 bytes, 45 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script de prueba manual o diagnóstico de primera generación (test-report.js).
- **Módulo relacionado**: Módulo Legado Scrap / EventBus / Core Integrity
- **Requisitos para ejecutarla**: PostgreSQL local y/o servidor Express en puerto 4000.
- **Datos de entrada**: Datos de prueba locales o payloads HTTP.
- **Resultado esperado**: Verificación por consola de la operación probada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`, `backend/src/modules/scrap/scrap.report.service.js`
- **Casos de negocio evaluados**: Pruebas iniciales de julio-noviembre 2026 (concurrencia ACID, EventBus, Joi, generación PDF de etiquetas, latencia de inserción en `lotes`).
- **Estado de vigencia**: **OBSOLETO (Superado por la suite `node:test` en `backend/test/`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const { sequelize } = require('./src/database/models');
const scrapReportService = require('./src/modules/scrap/scrap.report.service');

async function runReportTests() {
    try {
        await sequelize.authenticate();
        console.log("Conectado a la BD...");

        console.log("=====================================");
        console.log("TEST: Reporte Sin Filtros");
        console.log("=====================================");
        const allData = await scrapReportService.getReportData({});
        console.log("Resumen:", allData.resumen);
```

---

### 3.132 `test-req.js`
- **Nombre original del archivo**: `test-req.js`
- **Ubicación original**: `backend/test-req.js` (1,120 bytes, 35 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script de prueba manual o diagnóstico de primera generación (test-req.js).
- **Módulo relacionado**: Almacén / Usuarios / Roles / Etiquetas PDF / Rendimiento PG
- **Requisitos para ejecutarla**: PostgreSQL local y/o servidor Express en puerto 4000.
- **Datos de entrada**: Datos de prueba locales o payloads HTTP.
- **Resultado esperado**: Verificación por consola de la operación probada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/modules/auth/auth.service.js`
- **Casos de negocio evaluados**: Pruebas iniciales de julio-noviembre 2026 (concurrencia ACID, EventBus, Joi, generación PDF de etiquetas, latencia de inserción en `lotes`).
- **Estado de vigencia**: **OBSOLETO (Superado por la suite `node:test` en `backend/test/`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const { login } = require('./src/modules/auth/auth.service');

async function test() {
  try {
    if (!process.env.TEST_ACCOUNT_PASSWORD) throw new Error('TEST_ACCOUNT_PASSWORD is required.');
    const { token } = await login(process.env.TEST_ACCOUNT_USERNAME || 'admin_alm', process.env.TEST_ACCOUNT_PASSWORD);
    const res = await fetch('http://localhost:5000/api/v1/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
```

---

### 3.133 `test-roles.js`
- **Nombre original del archivo**: `test-roles.js`
- **Ubicación original**: `backend/test-roles.js` (933 bytes, 30 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script de prueba manual o diagnóstico de primera generación (test-roles.js).
- **Módulo relacionado**: Almacén / Usuarios / Roles / Etiquetas PDF / Rendimiento PG
- **Requisitos para ejecutarla**: PostgreSQL local y/o servidor Express en puerto 4000.
- **Datos de entrada**: Datos de prueba locales o payloads HTTP.
- **Resultado esperado**: Verificación por consola de la operación probada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Pruebas iniciales de julio-noviembre 2026 (concurrencia ACID, EventBus, Joi, generación PDF de etiquetas, latencia de inserción en `lotes`).
- **Estado de vigencia**: **OBSOLETO (Superado por la suite `node:test` en `backend/test/`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
async function test() {
  try {
    const loginRes = await fetch('http://localhost:4000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin_alm', password: process.env.TEST_ACCOUNT_PASSWORD })
    });
    const loginJson = await loginRes.json();
    const token = loginJson.data?.token;
    if (!token) {
      console.log("No token: "[REDACTED]"http://localhost:4000/api/roles', {
      headers: { Authorization: `Bearer ${token}` }
    });
```

---

### 3.134 `test-stats.js`
- **Nombre original del archivo**: `test-stats.js`
- **Ubicación original**: `backend/test-stats.js` (845 bytes, 34 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script de prueba manual o diagnóstico de primera generación (test-stats.js).
- **Módulo relacionado**: Almacén / Usuarios / Roles / Etiquetas PDF / Rendimiento PG
- **Requisitos para ejecutarla**: PostgreSQL local y/o servidor Express en puerto 4000.
- **Datos de entrada**: Datos de prueba locales o payloads HTTP.
- **Resultado esperado**: Verificación por consola de la operación probada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Pruebas iniciales de julio-noviembre 2026 (concurrencia ACID, EventBus, Joi, generación PDF de etiquetas, latencia de inserción en `lotes`).
- **Estado de vigencia**: **OBSOLETO (Superado por la suite `node:test` en `backend/test/`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { Client } = require('pg');
require('dotenv').config();

async function checkStats() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'sistema_enterprise',
    user: 'postgres',
    password: process.env.DB_PASSWORD
  });
  await client.connect();

  const query = `
```

---

### 3.135 `test-triggers.js`
- **Nombre original del archivo**: `test-triggers.js`
- **Ubicación original**: `backend/test-triggers.js` (321 bytes, 8 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script de prueba manual o diagnóstico de primera generación (test-triggers.js).
- **Módulo relacionado**: Almacén / Usuarios / Roles / Etiquetas PDF / Rendimiento PG
- **Requisitos para ejecutarla**: PostgreSQL local y/o servidor Express en puerto 4000.
- **Datos de entrada**: Datos de prueba locales o payloads HTTP.
- **Resultado esperado**: Verificación por consola de la operación probada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Pruebas iniciales de julio-noviembre 2026 (concurrencia ACID, EventBus, Joi, generación PDF de etiquetas, latencia de inserción en `lotes`).
- **Estado de vigencia**: **OBSOLETO (Superado por la suite `node:test` en `backend/test/`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize } = require('./src/database/models');
async function test() {
  const triggers = await sequelize.query("SELECT event_object_table, trigger_name, action_statement FROM information_schema.triggers WHERE event_object_table = 'lotes'");
  console.log('TRIGGERS:', triggers[0]);
  process.exit(0);
}
test();

```

---

### 3.136 `test-warehouse-integration.js`
- **Nombre original del archivo**: `test-warehouse-integration.js`
- **Ubicación original**: `backend/test-warehouse-integration.js` (1,895 bytes, 55 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script de prueba manual o diagnóstico de primera generación (test-warehouse-integration.js).
- **Módulo relacionado**: Módulo Legado Scrap / EventBus / Core Integrity
- **Requisitos para ejecutarla**: PostgreSQL local y/o servidor Express en puerto 4000.
- **Datos de entrada**: Datos de prueba locales o payloads HTTP.
- **Resultado esperado**: Verificación por consola de la operación probada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/database/models/index.js`, `backend/src/core/events/eventBus.js`, `backend/src/modules/scrap/scrap.listeners.js`
- **Casos de negocio evaluados**: Pruebas iniciales de julio-noviembre 2026 (concurrencia ACID, EventBus, Joi, generación PDF de etiquetas, latencia de inserción en `lotes`).
- **Estado de vigencia**: **OBSOLETO (Superado por la suite `node:test` en `backend/test/`)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const { sequelize } = require('./src/database/models');
const { eventBus, ScrapEvents } = require('./src/core/events/eventBus');

// Inicializar listeners
const registerScrapListeners = require('./src/modules/scrap/scrap.listeners');
registerScrapListeners();

async function runWarehouseIntegrationTests() {
    try {
        await sequelize.authenticate();
        console.log("Conectado a la BD...");

        console.log("=====================================");
```

---

### 3.137 `update_trace.js`
- **Nombre original del archivo**: `update_trace.js`
- **Ubicación original**: `backend/update_trace.js` (316 bytes, 5 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/config/database.js`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize } = require('./src/config/database');
sequelize.query("UPDATE traceability_events SET notes = 'Localidad actualizada a: A1 (A1)' WHERE notes = 'Localidad actualizada a ID 1'")
  .then(() => { console.log('Updated db'); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });

```

---

### 3.138 `update_types.js`
- **Nombre original del archivo**: `update_types.js`
- **Ubicación original**: `backend/update_types.js` (2,220 bytes, 68 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/config/database.js`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
require('dotenv').config();
const { sequelize } = require('./src/config/database.js');
const fs = require('fs');

function parseCSV(text) {
  const result = [];
  let inQuotes = false;
  let current = '';
  
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      current += c;
```

---

### 3.139 `verify_db_post_cleanup.js`
- **Nombre original del archivo**: `verify_db_post_cleanup.js`
- **Ubicación original**: `backend/verify_db_post_cleanup.js` (2,439 bytes, 68 líneas, Estado Git: `IGNORED`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Almacén / Producción / Base de Datos Neon
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local o Neon Cloud.
- **Datos de entrada**: Tablas operativas (`lotes`, `inventories`, `consumption_orders`, `extruder_queues`, `wip_inventories`) y tablas de MasterData.
- **Resultado esperado**: Verificación de conteos en 0 para tablas transaccionales o aborto inmediato por directiva de protección (`process.exit(1)`).
- **Resultado observado**: Dos scripts (`clean_neon_production.js` y `clean_warehouse_production.js`) tenían `process.exit(1)` insertado al inicio y `SyntaxError` por `await` fuera de función async; tres contenían URL de Neon hardcodeada.
- **Dependencias**: `backend/src/database/models/index.js`
- **Casos de negocio evaluados**: Limpieza histórica previa a salida en vivo de Almacén (octubre 2026) y bloqueo posterior para proteger marcha activa.
- **Estado de vigencia**: **OBSOLETO — ELIMINADO EN LOTE 4 (Respaldado en `recovery_vault`)**
- **Justificación de conservación o eliminación**: Ignorado por `.gitignore`, con errores de sintaxis y credenciales de Neon en texto plano. Respaldado con SHA-256 en `recovery_vault/deleted_files/backend/` y eliminado del árbol activo.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize } = require('./src/database/models');

async function verifyDb() {
  try {
    console.log('=== VERIFICACIÓN POST-LIMPIEZA ===\n');

    const tablesToZero = [
      'inventories',
      'lotes',
      'consumption_orders',
      'consumption_order_items',
      'material_consumptions',
      'material_consumption_items',
      'inventory_movements',
```

---

### 3.140 `verify_materials2.js`
- **Nombre original del archivo**: `verify_materials2.js`
- **Ubicación original**: `backend/verify_materials2.js` (1,793 bytes, 53 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/config/database.js`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize } = require('./src/config/database.js');
const fs = require('fs');

async function run() {
  await sequelize.authenticate();
  
  // Find materials
  const [dbMaterials] = await sequelize.query('SELECT internal_code FROM materials');
  const dbCodes = dbMaterials.map(m => m.internal_code);
  
  // Extract all the QR nomenclature using strict TSV logic
  const text = fs.readFileSync('materials_check.txt', 'utf8');
  const lines = text.split('\n');
  
```

---

### 3.141 `verify_materials3.js`
- **Nombre original del archivo**: `verify_materials3.js`
- **Ubicación original**: `backend/verify_materials3.js` (2,567 bytes, 83 líneas, Estado Git: `TRACKED_CLEAN`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Transversal / Base de Datos
- **Requisitos para ejecutarla**: Node.js, variables de entorno en backend/.env y acceso a PostgreSQL.
- **Datos de entrada**: Consultas SQL / Variables de entorno.
- **Resultado esperado**: Salida por consola (stdout) con el estado verificado o actualización aplicada.
- **Resultado observado**: Sin evidencia de ejecución durante esta auditoría (no ejecutado por protección de BD).
- **Dependencias**: `backend/src/config/database.js`
- **Casos de negocio evaluados**: Inspección técnica de tablas o catálogos.
- **Estado de vigencia**: **OBSOLETO (Conservado en Git pendiente de commit de saneamiento)**
- **Justificación de conservación o eliminación**: Conservado temporalmente por estar rastreado en Git; su conocimiento técnico queda consolidado en este documento para posterior remoción con `git rm`.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { sequelize } = require('./src/config/database.js');
const fs = require('fs');

async function run() {
  await sequelize.authenticate();
  
  const [dbMaterials] = await sequelize.query('SELECT internal_code FROM materials');
  const dbCodes = dbMaterials.map(m => m.internal_code);
  
  const text = fs.readFileSync('materials_check.txt', 'utf8');
  const lines = text.split('\n');
  
  const userCodes = [];
  const missingData = [];
```

---

### 3.142 `verify_neon_post_cleanup.js`
- **Nombre original del archivo**: `verify_neon_post_cleanup.js`
- **Ubicación original**: `backend/verify_neon_post_cleanup.js` (2,937 bytes, 86 líneas, Estado Git: `IGNORED`)
- **Objetivo de la prueba / script**: Script auxiliar de diagnóstico o prueba manual.
- **Módulo relacionado**: Almacén / Producción / Base de Datos Neon
- **Requisitos para ejecutarla**: Conexión a PostgreSQL local o Neon Cloud.
- **Datos de entrada**: Tablas operativas (`lotes`, `inventories`, `consumption_orders`, `extruder_queues`, `wip_inventories`) y tablas de MasterData.
- **Resultado esperado**: Verificación de conteos en 0 para tablas transaccionales o aborto inmediato por directiva de protección (`process.exit(1)`).
- **Resultado observado**: Dos scripts (`clean_neon_production.js` y `clean_warehouse_production.js`) tenían `process.exit(1)` insertado al inicio y `SyntaxError` por `await` fuera de función async; tres contenían URL de Neon hardcodeada.
- **Dependencias**: Ninguna dependencia local (usa módulos nativos o NPM como `pg`, `sequelize`, `dotenv`, `xlsx`).
- **Casos de negocio evaluados**: Limpieza histórica previa a salida en vivo de Almacén (octubre 2026) y bloqueo posterior para proteger marcha activa.
- **Estado de vigencia**: **OBSOLETO — ELIMINADO EN LOTE 4 (Respaldado en `recovery_vault`)**
- **Justificación de conservación o eliminación**: Ignorado por `.gitignore`, con errores de sintaxis y credenciales de Neon en texto plano. Respaldado con SHA-256 en `recovery_vault/deleted_files/backend/` y eliminado del árbol activo.
- **Fragmento técnico relevante (sanitizado)**:
```javascript
const { Sequelize } = require('sequelize');

const neonUrl = 'postgresql://[REDACTED_URL]';

const seq = new Sequelize(neonUrl, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

async function verifyNeonPostCleanup() {
  await seq.authenticate();
  console.log('✔ Conectado a Neon para verificación post-limpieza');

```

---

