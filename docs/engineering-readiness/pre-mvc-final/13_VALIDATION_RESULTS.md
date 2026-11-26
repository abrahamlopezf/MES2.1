# 13 — RESULTADOS CONSOLIDADOS DE VALIDACIÓN FINAL PRE-MVC

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha de Ejecución:** 2026-11-26  
**Estado de Master Data (`2,928` filas):** `36db9b70c666b2753d70b9fa87522f5cbf1309b8d9162dac3889b9a4693ee241` (**100% ÍNTEGRA EN DEV Y QA**)

---

## 1. Resumen de Comandos de Verificación Ejecutados

| # | Verificación Ejecutada | Comando | Código de Salida | Resultado Observado | Estado |
| :---: | :--- | :--- | :---: | :--- | :---: |
| 1 | **Diagnóstico Integral de Entorno Local (`dev:check`)** | `node backend/src/scripts/dev-check.js` | `0` | **`8/8 OK (`allPassed: true`)`**:<br>1. Node `v24.22.3`<br>2. Lockfiles `backend=true, frontend=true`<br>3. `dbGuard (DEV)`: `APP_ENV=local`, `127.0.0.1:5432`, `sistema_enterprise`, `USER=traceflow_app_local`<br>4. `dbGuard (QA)`: `APP_ENV=test`, `127.0.0.1:5432`, `sistema_enterprise_test`, `USER=traceflow_app_test`<br>5. `Security & Secret Scan`: `Scanned=1209, Findings=0`<br>6. `PostgreSQL Local (DEV)`: `user=traceflow_app_local, migrations_applied=163`<br>7. `PostgreSQL Local (QA)`: `user=traceflow_app_test, migrations_applied=164`<br>8. `Master Data SHA-256 Parity`: `rows=2928, sha256=36db9b70...e241` | ✅ **`APROBADO`** |
| 2 | **Escáner de Secretos e Índice de Git (`security:check`)** | `node backend/src/scripts/security-check.js` | `0` | **`0` hallazgos (`findingsCount: 0`)** en `1,209` archivos tras la desvinculación en índice (`git rm --cached`) de los 4 artefactos sensibles. | ✅ **`APROBADO`** |
| 3 | **Integridad de Esquema y Materiales Activos (`db:verify:local`)** | `npm --prefix backend run db:verify:local` | `0` | `APP_ENV=local`, `DB=sistema_enterprise`, `641` materiales activos verificados, tablas operativas y Master Data protegidas. | ✅ **`APROBADO`** |
| 4 | **Huella Criptográfica de Master Data (`test:integrity`)** | `npm --prefix backend run test:integrity` | `0` | `30` tablas evaluadas, `2,928` filas maestras, `globalMasterDataSha256: 36db9b70c666b2753d70b9fa87522f5cbf1309b8d9162dac3889b9a4693ee241`. | ✅ **`APROBADO`** |
| 5 | **Suites Unitarias, Guardas y Caracterización Backend (`test:unit`)** | `npm --prefix backend run test:unit` | `1` *(por los 3 casos de Telares)* | **`16` suites (`96` casos individuales): `93 PASS`, `3 FAIL`, `0 SKIP`**. (`envIsolationGuard.test.js` `10/10 PASS`; `characterization.contracts.test.js` `10/10 PASS`; los `3 FAIL` son las discrepancias preexistentes de `QA-TEL-ROUTE-001`). | ⚠️ **`93/96 CASOS PASS` (`14/16 SUITES PASS`)** |
| 6 | **Suites de Integración Local en `sistema_enterprise_test`** | `npm --prefix backend run test:integration` *(con `APP_ENV=test` y `RUN_*=1`)* | `1` *(por `corteLaminadoFlow:71`)* | **`6` suites (`6` casos): `4 PASS`, `1 FAIL`, `1 SKIP`**.<br>- En instancia desechable `sistema_enterprise_disposable_verify_test` sin cola activa en `EXT-4`, `extrusionFloor` avanza hasta línea 131 y falla con `409 La mezcla no pertenece al turno operativo activo` por falta de `shift_session_id` en el test. | ⚠️ **`4/6 SUITES PASS`** |
| 7 | **Pruebas Unitarias e Integración de Frontend (`Vitest`)** | `npm --prefix frontend run test -- --run` | `0` | **`11/11` suites aprobadas (`31/31` casos individuales `PASS`)**. | ✅ **`APROBADO`** |
| 8 | **Compilación de Producción Frontend (`vite build`)** | `npm --prefix frontend run build` | `0` | **`1,863` módulos transformados, `0` errores** (`index-BGe7BUdv.css` `248.17 kB`, `index-CBABaFc9.js` `3,708.06 kB`). | ✅ **`APROBADO`** |
| 9 | **Pruebas Negativas de Aislamiento de Roles PostgreSQL** | `audit_pg_post_codex.js` | `0` | 1. `traceflow_app_test` $\rightarrow$ `sistema_enterprise`: **Bloqueado (`permiso denegado`)**.<br>2. `traceflow_app_local` $\rightarrow$ `sistema_enterprise_test`: **Bloqueado (`permiso denegado`)**.<br>3. `traceflow_app_test` `UPDATE`/`INSERT` en `materials`/`rankings` (QA): **Bloqueado (`permiso denegado`)**.<br>4. `traceflow_app_test` `DISABLE TRIGGER` / `session_replication_role`: **Bloqueado**. | ✅ **`APROBADO`** |

---

## 2. Verificación Post-Pruebas de No Alteración

Al concluir todas las pruebas anteriores (incluyendo la creación y destrucción de la instancia temporal desechable `sistema_enterprise_disposable_verify_test`), se ejecutó nuevamente `node backend/src/scripts/dev-check.js`, confirmando:
- **`sistema_enterprise` (DEV):** `163` migraciones, `2,928` filas maestras, `SHA-256: 36db9b70c666b2753d70b9fa87522f5cbf1309b8d9162dac3889b9a4693ee241`.
- **`sistema_enterprise_test` (QA):** `164` migraciones, `2,928` filas maestras, `SHA-256: 36db9b70c666b2753d70b9fa87522f5cbf1309b8d9162dac3889b9a4693ee241`.
- **Ningún archivo funcional del MES fue alterado.**
