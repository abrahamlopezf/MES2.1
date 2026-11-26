# 11 — Validaciones Posteriores a la Limpieza y Análisis de Regresiones

## 1. Metodología de Validación (Fase 0 vs. Fase 8)

Para demostrar con rigor técnico que la limpieza controlada de la **Fase 4** (`136` archivos y `4` directorios temporales eliminados) no alteró el comportamiento funcional del sistema ni los cambios pendientes de otros desarrolladores, se ejecutaron exactamente las mismas pruebas y verificaciones en la **Fase 0 (Línea Base Inicial)** y en la **Fase 8 (Estado Final Post-Limpieza)**.

> [!IMPORTANT]
> Siguiendo las reglas de protección de datos de la Fase 0 y Fase 8:
> *"No ejecutes comandos contra una base de datos cuya identidad y aislamiento no hayan sido verificados."*  
> Ninguna prueba que modifique bases de datos (`RUN_*=1`), migración o seeder fue ejecutada contra PostgreSQL local ni contra Neon Cloud.

---

## 2. Matriz Comparativa de Resultados

| # | Verificación Ejecutada | Comando / Mecanismo | Resultado Fase 0 (Antes) | Resultado Fase 8 (Después) | Clasificación Oficial |
|---|---|---|---|---|---|
| 1 | **Integridad de Archivos Funcionales Modificados y Nuevos (`96` archivos)** | Comparación de hash `SHA-256` contra `pending_work_baseline.json` y `git diff` | `96` archivos registrados (`76` `M` + `20` `??` fuera de renders PNG) | **`96 / 96` hashes SHA-256 idénticos (`0` discrepancias)** | **APROBADO** |
| 2 | **Estado de Archivos Rastreados en Git** | `git status --porcelain` | `1,262` rastreados (`1,186` limpios, `76` modificados, `0` eliminados) | `1,262` rastreados (`1,186` limpios, `76` modificados, `0` eliminados) | **APROBADO** |
| 3 | **Compilación de Producción del Frontend** | `cd frontend && npm run build` (Vite `5.4.21`) | `✓ 1863 modules transformed` (`dist/assets/index-*.js` generado sin errores) | `✓ 1863 modules transformed` (`0` errores de compilación o resolución de imports activos) | **APROBADO** |
| 4 | **Suite de Pruebas Automatizadas del Frontend (Unitarias, Contratos e Integración)** | `cd frontend && npx vitest run` (Vitest `1.6.1`) | `11 passed (11)` suites / `31 passed (31)` tests (`0` fallos) | `11 passed (11)` suites / `31 passed (31)` tests (`0` fallos) | **APROBADO** |
| 5 | **Validación Sintáctica del Backend (Compilación V8 VM)** | `new vm.Script(code)` sobre todos los archivos `.js` y `.cjs` de `backend/` y raíz | `670 / 672` válidos (`2` errores de sintaxis en `clean_neon_production.js` y `clean_warehouse_production.js`) | **`667 / 667` válidos (`0` errores de sintaxis en todo el repositorio)** | **APROBADO** |
| 6 | **Carga de Módulos, Configuración, Rutas Express y 77 Modelos Sequelize** | `require('./backend/src/app')` y `require('./backend/src/database/models')` | `app` cargada como función Express + `77` modelos Sequelize inicializados y asociados | `app` cargada como función Express + `77` modelos Sequelize inicializados y asociados (`0` errores) | **APROBADO** |
| 7 | **Integridad de Recursos Estáticos y Configuraciones** | Verificación de `frontend/public/*`, `frontend/index.html`, `backend/.sequelizerc`, `.github/workflows/*.yml` | Todos los recursos estáticos y scripts referenciados por CI/CD presentes | Todos los recursos estáticos y scripts referenciados por CI/CD intactos | **APROBADO** |
| 8 | **Pruebas Unitarias del Backend (`node:test`)** | `cd backend && node --test test/*.test.js src/database/tests/*.test.js src/modules/extrusion/services/*.test.js src/modules/warehouse/*.test.js` | `81` tests: `72` aprobados, `6` omitidos (`SKIP`), `3` fallidos en `telares` | `81` tests: `72` aprobados, `6` omitidos (`SKIP`), `3` fallidos en `telares` (resultado 100 % idéntico) | **ERROR PREEXISTENTE** |
| 9 | **Pruebas de Integración Local con Base de Datos (`6` suites `.local.integration.test.js`)** | Omitidas automáticamente por bandera `RUN_* !== '1'` | `6` omitidas (`# SKIP`) | `6` omitidas (`# SKIP`) para proteger datos locales/remotos | **NO EJECUTADO** |
| 10 | **Arranque con Conexión Viva a PostgreSQL (`startServer()`)** | `testDatabaseConnection()` en `backend/src/server.js` | No ejecutado por política de aislamiento de BD (`backend/.env` contiene `DATABASE_URL` de Neon) | No ejecutado para evitar tráfico hacia bases de datos activas | **NO VERIFICABLE SIN BD AISLADA** |

---

## 3. Detalle de las Suites de Prueba Ejecutadas

### 3.1 Frontend — Vitest (`11 / 11` Suites Aprobadas, `31 / 31` Tests Aprobados)

| Archivo de Prueba | Tipo | Casos Evaluados | Estado |
|---|---|---:|---|
| `frontend/src/testing/runtime/CapabilityRegistry.unit.test.js` | Unitaria Runtime | 5 | **APROBADO** |
| `frontend/src/testing/runtime/EventBus.unit.test.js` | Unitaria Runtime | 5 | **APROBADO** |
| `frontend/src/testing/runtime/WorkflowEngine.unit.test.js` | Unitaria Runtime | 4 | **APROBADO** |
| `frontend/src/testing/contracts/CapabilityRegistry.contract.test.js` | Contrato | 3 | **APROBADO** |
| `frontend/src/testing/contracts/EventBus.contract.test.js` | Contrato | 3 | **APROBADO** |
| `frontend/src/testing/contracts/WorkflowEngine.contract.test.js` | Contrato | 2 | **APROBADO** |
| `frontend/src/testing/integration/Runtime.integration.test.js` | Integración Runtime | 1 | **APROBADO** |
| `frontend/src/testing/integration/WorkspaceHarness.integration.test.jsx` | Integración UI/QR | 1 | **APROBADO** |
| `frontend/src/modules/extrusion/domain/colorRules.test.ts` | Unitaria Dominio | 3 | **APROBADO** |
| `frontend/src/modules/extrusion/domain/queueOutputVariant.test.ts` | Unitaria Dominio | 3 | **APROBADO** |
| `frontend/tests/identity/IdentityFacade.test.ts` | Unitaria Dominio | 1 | **APROBADO** |

### 3.2 Backend — Node.js Test Runner (`14` Suites Unitarias + `6` Suites de Integración con Guardas)

| Archivo de Prueba | Tipo | Casos | Estado |
|---|---|---:|---|
| `backend/src/database/tests/backfill-unambiguous-queue-output-snapshots.test.js` | Unitaria Migración | 1 | **APROBADO** |
| `backend/src/modules/extrusion/services/formulaColorRules.test.js` | Unitaria Dominio | 4 | **APROBADO** |
| `backend/src/modules/extrusion/services/queueBatchRules.test.js` | Unitaria Dominio | 2 | **APROBADO** |
| `backend/src/modules/extrusion/services/shiftBalance.test.js` | Unitaria Dominio | 11 | **APROBADO** |
| `backend/src/modules/extrusion/services/shiftPolicy.test.js` | Unitaria Dominio | 16 | **APROBADO** |
| `backend/src/modules/warehouse/inventoryLotReconciliation.test.js` | Unitaria Dominio | 2 | **APROBADO** |
| `backend/src/modules/warehouse/siloReceiptMovement.test.js` | Unitaria Dominio | 1 | **APROBADO** |
| `backend/test/formulaMachinePolicy.test.js` | Unitaria Dominio | 4 | **APROBADO** |
| `backend/test/qr.traceability-tree.test.js` | Unitaria Dominio | 4 | **APROBADO** |
| `backend/test/queueOutputSnapshot.test.js` | Unitaria Dominio | 2 | **APROBADO** |
| `backend/test/siloConsumptionAllocator.test.js` | Unitaria Dominio | 4 | **APROBADO** |
| `backend/test/telares-shift-timezone.test.js` | Unitaria Dominio | 2 | **APROBADO** |
| `backend/test/telares.production-rules.test.js` | Unitaria Dominio | 9 (`8` pass / `1` fail) | **ERROR PREEXISTENTE** |
| `backend/test/telares.rules.test.js` | Unitaria Dominio | 13 (`11` pass / `2` fail) | **ERROR PREEXISTENTE** |
| `backend/test/corteLaminadoFlow.local.integration.test.js` | Integración Local | 1 (`SKIP`) | **NO EJECUTADO** |
| `backend/test/extrusion-pp-packages.local.integration.test.js` | Integración Local | 1 (`SKIP`) | **NO EJECUTADO** |
| `backend/test/extrusionFloor.local.integration.test.js` | Integración Local | 1 (`SKIP`) | **NO EJECUTADO** |
| `backend/test/extrusionShiftHandoff.local.integration.test.js` | Integración Local | 1 (`SKIP`) | **NO EJECUTADO** |
| `backend/test/extrusionTransfer.local.integration.test.js` | Integración Local | 1 (`SKIP`) | **NO EJECUTADO** |
| `backend/test/telaresE2E.local.integration.test.js` | Integración Local | 1 (`SKIP`) | **NO EJECUTADO** |

---

## 4. Documentación del Error Preexistente en `telares` (No Atribuible a la Limpieza)

En cumplimiento de la Regla 18 (*"No aplicar correcciones funcionales aunque encuentres errores. Documenta los hallazgos para una intervención posterior"*), se documenta la causa exacta de los 3 casos fallidos detectados idénticamente en la Fase 0 y en la Fase 8:

- **Archivos involucrados**:
  - [`backend/src/modules/telares/productionRules.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/modules/telares/productionRules.js#L25-L45) (actualmente modificado `M` en el árbol de trabajo por otro desarrollador)
  - [`backend/test/telares.production-rules.test.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/test/telares.production-rules.test.js#L36-L47)
  - [`backend/test/telares.rules.test.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/test/telares.rules.test.js#L9-L55) (también modificado `M` en el árbol de trabajo)
- **Causa técnica**:
  1. En `productionRules.js`, el cambio pendiente del desarrollador actualizó `normalizeProductionRoute(route, productKind)` para permitir nuevamente el destino `'GLOBO'` en rollos de tela (`ROLLO_TELA`), y para rechazar `'GLOBO'` o `'LAMINADO'` cuando `productKind` es `'BANDA'` o `'CINTA'` lanzando el código de error `INVALID_BANDA_CINTA_ROUTE`.
  2. Sin embargo, los tests `Telares output routes block Globo for rolls, bands and cintilla alike` (`telares.production-rules.test.js:36`), `normalizeProductionRoute valida destinos de Diagrama 1 (ROLLO_TELA) y bloquea GLOBO` (`telares.rules.test.js:9`) y `normalizeProductionRoute valida destinos de Diagrama 2 (BANDA y CINTA) y bloquea GLOBO/LAMINADO` (`telares.rules.test.js:33`) aún esperan la regla anterior donde `GLOBO` estaba bloqueado con `error.code === 'GLOBO_NOT_ALLOWED_FOR_TELARES_OUTPUT'`.
- **Acción recomendada para la siguiente intervención**: Confirmar con el líder funcional si `GLOBO` permanece habilitado para `ROLLO_TELA` y actualizar las 3 aserciones de `telares.production-rules.test.js` y `telares.rules.test.js` para reflejar la regla definitiva antes de hacer commit.
