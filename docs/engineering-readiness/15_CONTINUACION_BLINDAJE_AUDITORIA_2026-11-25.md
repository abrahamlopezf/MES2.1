# Continuación de blindaje local y auditoría — 25 de noviembre de 2026

## Alcance y dictamen

Este informe consolida la continuación solicitada para blindaje local, integridad de Master Data, políticas de turnos, auditoría multicorrida y preparación MVC. Se conserva la línea base y los documentos históricos; los estados anteriores no se reinterpretan como evidencia nueva.

**Dictamen: trabajo parcial; no declarar TraceFlow listo para operación ni para una corrida E2E completa.** Se corrigió un bypass del perfil de Sequelize CLI, se saneó localmente el índice Git de cuatro artefactos sensibles y se ejecutaron pruebas con sockets locales permitidos. Aún quedan riesgos de permisos PostgreSQL, fallos de rutas y una integración Corte → Laminado fallida.

El texto literal del Prompt Master no aparece como archivo independiente en `docs/`. Para esta matriz se tomó como fuente la solicitud actual (fases 1–10), junto con `docs/audit/13_PLAN_DE_TRABAJO_SIGUIENTE.md`, `docs/engineering-readiness/00_BASELINE.md` y los contratos/planes existentes. No se marcó una fase completa solo por estar documentada.

## Matriz de cumplimiento del Prompt Master

| Fase | Estado | Evidencia disponible | Archivos/pruebas | Pendiente o riesgo |
|---|---|---|---|---|
| 1. Preservar trabajo y registrar regla de turno separada de MVC | Parcial | Se conservaron las modificaciones existentes de política y UI. Las pruebas de política siguen pasando. Este documento distingue la regla funcional del plan MVC. | `backend/src/modules/extrusion/services/shiftPolicy.js`, `backend/src/modules/extrusion/extrusion.service.js`, `frontend/src/modules/extrusion/presentation/presenters/ExtrusionShiftSessionPanel.tsx`; 18 pruebas de política dentro de la suite unitaria. | La tolerancia o autorización industrial para recibir antes del horario no está confirmada por el cliente. No se inventó una excepción.
| 2. Recuperar alcance y crear matriz | Ejecutada para el alcance recibido | Matriz de diez fases en este informe y documentos previos de auditoría/MVC. | Este archivo; `docs/audit/13_PLAN_DE_TRABAJO_SIGUIENTE.md`; `docs/engineering-readiness/08_FUNCTIONAL_CONTRACTS.md`–`12_ROLLBACK_STRATEGY.md`. | Falta localizar un archivo independiente que contenga el Prompt Master original, si existe fuera del repositorio.
| 3. Aislamiento PostgreSQL, QA, respaldo y Master Data | Parcial | El backend usa `APP_ENV=local`, `127.0.0.1:5432`, `sistema_enterprise`; QA es `sistema_enterprise_test`. Rechazos remotos y CLI probados. Backup restaurado en BD temporal y fingerprint idéntico. DEV/QA conservan 2,928 filas maestras y SHA-256 `36db9b70c666b2753d70b9fa87522f5cbf1309b8d9162dac3889b9a4693ee241`. Hay 58 triggers de protección DELETE/TRUNCATE en 29 tablas. | `dbGuard.js`, `sequelize-cli.config.js`, `envIsolationGuard.test.js`, `master-data-fingerprint.js`; `npm run dev:check`; restauración verificada con `pg_restore` y fingerprint; prueba QA que verifica rechazo de DELETE. | El proceso del backend corre con `postgres` superusuario, propietario de DEV y QA, y puede conectarse a ambas bases. Los roles `traceflow_app_local`, `traceflow_app_test` y `traceflow_migrator` también tienen CONNECT a ambas. La restricción actual depende de guardas de aplicación; falta diseñar y probar roles no privilegiados por perfil. Los triggers actuales bloquean DELETE/TRUNCATE, no UPDATE/INSERT. No se debe considerar este control completo todavía.
| 4. Cuatro fallos HTTP `EACCES` | Ejecutada | Los cuatro casos HTTP levantan servidor local y pasan al habilitar sockets mediante ejecución autorizada. No hay evidencia de fallo funcional de Express; el rechazo previo fue del sandbox de red local. | `test/characterization.contracts.test.js`, pruebas HTTP 1–4; suite backend ejecutada con socket local habilitado. | Ninguno respecto a los cuatro `EACCES`; no extrapolar esta evidencia a todos los endpoints.
| 5. Tres discrepancias de Telares | Parcial / requiere decisión de producto | Dos tests esperan bloquear Globo en todo `ROLLO_TELA`; el código permite `GLOBO → CORTE`. Un tercer test espera otro código de error para Banda/Cintilla; la regla sí rechaza la ruta, pero devuelve `INVALID_BANDA_CINTA_ROUTE`. | `productionRules.js`, `telares.production-rules.test.js`, `telares.rules.test.js`; fallan 3 assertions. | El usuario aclaró que solo algunos rollos pueden ir a Globo, pero todavía no definió cuáles. No se cambió regla ni expectativa. Se requiere la lista de códigos PTI/fichas elegibles y confirmar si el error específico forma parte del contrato HTTP.
| 6. Política de relevo | Parcial, con núcleo probado | Política unitaria prueba antes/exactamente/después de inicio, overnight, fecha operativa, días, horario personalizado, expiración y handoff secuencial. Integración de servicio conserva colas/saldos entre supervisores. SQL confirmó dos contenedores recibidos por el turno más reciente, 494.840 kg por EXT-02 y EXT-04, 989.680 kg total. | `shiftPolicy.test.js`, `extrusionShiftHandoff.local.integration.test.js`; consulta SQL solo lectura a DEV. | No se ejercitaron carreras simultáneas concurrentes, doble submit HTTP, expiración de sesión JWT ni API directa con roles no autorizados. La integración está transaccional y con rollback. La operación de recibir temprano sigue sin regla industrial confirmada.
| 7. Auditoría multicorrida de áreas | Parcial | ODC/empaque FIFO → WIP Extrusión, relevo, transferencia entre extrusoras y corrida QA de Telares pasaron en integraciones transaccionales sobre QA. | Suite `test/*.local.integration.test.js`: 4 PASS, 1 FAIL, 1 SKIP. | Falló `corteLaminadoFlow` al consultar órdenes después de recogida completa. `extrusionFloor` se omitió porque EXT-04 tiene mezcla operativa real; fue una salvaguarda, no un fallo. Globo no cuenta con corrida integral aquí. No hubo corrida visual/browser autenticada ni proceso completo Almacén → Extrusión → Telares → Laminado/Globo.
| 8. Higiene del repositorio y credenciales | Parcial | Escáner ampliado: 0 hallazgos actuales en 1,184 archivos. Se quitaron del índice Git, sin borrar los archivos locales, logs, dump SQL y `.env.qa` rastreados. Scripts inseguros de migración/inspección/seed fallan antes de conectar. | `security-check.js`, tres scripts bloqueados; `git rm --cached` de `backend/error_log.txt`, `backend/master_data_dump.sql`, `error_log.txt`, `frontend/.env.qa`. | Las cuatro eliminaciones están staged localmente; no hubo commit. La rotación de credenciales posiblemente expuestas en historial y el saneamiento remoto de GitHub no se hicieron, de acuerdo con la autorización vigente. El historial remoto aún requiere revisión/rotación coordinada.
| 9. Preparación MVC y caracterización | Parcial | Ya existen contratos, mapa de dependencias, arquitectura destino, roadmap y rollback. Caracterización HTTP/modelos/dominios pasó salvo tres discrepancias Telares. | `08_FUNCTIONAL_CONTRACTS.md`, `09_DEPENDENCY_MAP.md`, `10_MVC_TARGET_ARCHITECTURE.md`, `11_REFACTORING_ROADMAP.md`, `12_ROLLBACK_STRATEGY.md`; `characterization.contracts.test.js`. | No se inició refactor MVC. La caracterización no es una cobertura total de acciones/front-end y tiene fallos contractuales abiertos.
| 10. Criterio de finalización global | Pendiente | Evidencia parcial descrita arriba. | Este informe y `docs/qa/`. | No hay base para declarar blindaje total ni funcionalidad al 100%.

## Evidencia de base de datos, respaldo e integridad

- El perfil efectivo de desarrollo se verificó como `APP_ENV=local`, host PostgreSQL `127.0.0.1/32:5432`, base `sistema_enterprise`; la prueba de QA usa `sistema_enterprise_test`.
- `npm run dev:check` terminó con `allPassed: true`: aislamiento de configuración, escaneo, conexiones locales, 163 migraciones en DEV, 164 en QA y paridad de 30 tablas maestras / 2,928 filas.
- El backup `sistema_enterprise_phase0.dump` fue restaurado realmente en `traceflow_restore_verify_20261125`, una base temporal nueva. La huella de Master Data restaurada coincidió con la huella vigente. La base temporal se eliminó al finalizar; DEV y QA no se restauraron ni reemplazaron.
- La suite QA comprobó que un DELETE en `materials` es rechazado por `QA_MASTER_DATA_GUARD`. Las definiciones consultadas muestran triggers `BEFORE DELETE` y `BEFORE TRUNCATE`, no protección equivalente para UPDATE/INSERT.
- Las pruebas de integración se ejecutaron con `APP_ENV=test` sobre QA y usan transacciones revertidas. Después de la ejecución, `dev:check` volvió a confirmar la paridad exacta de Master Data.
- No se conectó a Neon.

## Auditoría de turnos: cobertura comprobada

| Escenario | Resultado | Tipo de evidencia |
|---|---|---|
| Antes del inicio programado / exactamente al inicio / después | Pasa | Pruebas unitarias de `isShiftStartReached` y apertura de relevo por servicio.
| Cruce de día y turno nocturno | Pasa | Pruebas unitarias de fecha operativa y America/Mexico_City.
| Cambio de días y calendario personalizado de tres turnos | Pasa | Pruebas unitarias de política y schedule configurable.
| Turno expirado y custodia de mezclas | Pasa en política; probado parcialmente en integración | Unit tests y prueba QA de handoff sin consumo.
| Supervisor entrante distinto y continuidad de mezclas | Pasa | Prueba transaccional de servicio y consulta SQL de saldos actuales.
| Sin saldos duplicados en el handoff auditado | Sin duplicado observado | Un registro por contenedor en el handoff del último turno; no es stress test de concurrencia.
| Recarga de página tras handoff | Pasa en una prueba UI previa | Reportado en `docs/qa/QA_MASTER_REPORT.md`; esta continuación no repitió la UI.
| Doble recepción concurrente, doble submit API, sesión expirada y rol no autorizado | No comprobado dinámicamente | Hay validaciones visibles en middleware/servicio, pero falta test HTTP/concurrencia.
| Excepción de recepción antes del inicio / tolerancia industrial | Pendiente de cliente | Regla estricta actual rechaza hasta el inicio configurado; no hay tolerancia inventada.

En la programación local actual, el tercer turno se guarda con código histórico `TURNO_4` y etiqueta visible `Turno 3` (22:00–06:00, L–V). La sesión abierta más reciente también tiene código `TURNO_4`. Esto no demuestra un cuarto turno operativo, pero sí puede confundir reportes o consultas que muestren el código interno sin etiqueta.

## Fallos y resolución

### `EACCES` en pruebas HTTP

Las pruebas 1–4 de caracterización HTTP pasan con socket local habilitado. El origen observado fue la política del sandbox que impedía abrir el servidor efímero de pruebas; no fue un error del sistema operativo ni del contrato HTTP. No se desactivaron pruebas ni aserciones.

### Tres fallos de Telares

La suite de 95 pruebas unitarias termina con **92 PASS y 3 FAIL**. Los fallos corresponden a la divergencia de Globo descrita arriba: las aserciones son globales, mientras el código admite `GLOBO → CORTE` para producto rollo. La selección por ficha debe limitarse a las fichas que el cliente confirme. No se cambió código ni tests para ocultar la discrepancia.

### Integración Corte → Laminado

La integración falla porque `CorteService.listOrders()` incluye `PICKED` entre estados activos; el test afirma que una orden totalmente recogida debe desaparecer de pendientes. La pantalla de solicitudes usa `process-orders?include_closed=true` y presenta estados de seguimiento; el panel de recogida filtra explícitamente `REQUESTED` y `PARTIALLY_PICKED`. Por ello el contrato de `listOrders()` no queda suficientemente claro para clasificarlo como defecto probado. Se conserva el fallo y no se cambió la expectativa. La suite aborta antes de verificar el resto del flujo en esa prueba.

## Resultados de pruebas ejecutadas

- Backend unitario: **95 pruebas, 92 PASS, 3 FAIL, 0 SKIP**. Las cuatro pruebas HTTP que antes daban `EACCES` pasaron con sockets autorizados.
- Integración QA: **6 pruebas, 4 PASS, 1 FAIL, 1 SKIP**. Pasaron ODC/empaque FIFO y WIP Extrusión, handoff de turno, traslado entre extrusoras y flujo QA completo de Telares con rollback. Falló Corte → Laminado en la semántica de órdenes listadas; se omitió ingreso a rack de Extrusión porque EXT-04 tenía una mezcla operativa activa.
- Frontend Vitest: **11 archivos, 31 PASS**.
- Vite build: **pasa**; tardó 1 min 23 s. Transformó 1,863 módulos y generó bundle principal de 3.708 MB (971 KB gzip), con advertencia de chunk mayor a 500 KB.
- Frontend lint: **falla**, 116 errores con `--quiet` (sin contar las advertencias ocultadas). Continúa como riesgo preexistente pendiente de clasificación.
- `npm run dev:check`: **7/7 OK**, repetido después de las integraciones. Escáner: 0 hallazgos actuales; DEV/QA con la misma huella de Master Data.
- Scripts bloqueados de migración remota, inspección Neon y seed ad hoc: los tres terminan con error explícito antes de abrir una conexión.

## Cambios de esta continuación

### Código/configuración

- `backend/src/config/dbGuard.js`: valida coherencia entre perfil de infraestructura y perfil solicitado por Sequelize CLI.
- `backend/src/config/sequelize-cli.config.js`: detecta `--env` y rechaza la selección de un perfil remoto desde local/QA antes de cargar conexión; el perfil test usa la base test correspondiente.
- `backend/test/envIsolationGuard.test.js`: agrega el caso de bypass CLI y valida rechazo antes de conexión.
- `backend/src/scripts/security-check.js`: escanea extensiones de entorno, SQL, logs y documentación; también detecta artefactos sensibles rastreados aun si `.gitignore` los excluye.
- Se bloquearon tres scripts legacy que abrían/copiaban datos remotos o escribían permisos maestros fuera de migraciones controladas: `backend/scripts/migrate-master-data.js`, `backend/scripts/masterdata-neon/inspect.js`, `backend/scripts/seed-manual-entry-permission.js`.

### Índice Git

Se ejecutó `git rm --cached` para los cuatro archivos sensibles mencionados en el análisis de seguridad. Los archivos permanecen en disco; solo las eliminaciones están staged. **No se creó commit, push, merge ni despliegue.**

## Cobertura funcional por área

| Área | Estado de esta auditoría | Qué falta para aprobar E2E |
|---|---|---|
| Almacén | Parcial: prueba de ODC con empaques FIFO conectada al WIP de Extrusión pasó en QA. | Recepción UI, ajustes/bajas, silos, ODC de distintos materiales, conciliación API/DB y navegación por roles.
| Extrusión | Parcial: ODC/WIP, balance de empaque, handoff, continuidad y transferencia de contenedor entre extrusoras pasaron en integraciones QA. | Corrida de piso/registro de PTI y rack no corrió porque EXT-04 conserva mezcla real; cierres, scrap, FIFO de racks y turno en UI/API/DB bajo cuentas/roles diferenciados.
| Telares | Parcial: integración QA racks → WIP → rollo con QR, conversión, metros y operadores pasó con rollback. | Prueba desde interfaz por banda y rollo, varios telares simultáneos, scrap, historial QR/genealogía, rutas permitidas por ficha.
| Laminado | Parcial. | Resolver semántica de órdenes PICKED; ejecutar transformación/consumos/scrap, salida con QR y transferencia a Corte.
| Globo/Liner | Sin corrida integral en esta auditoría. | Alinear catálogo/turno, órdenes, compatibilidad, ODC/WIP, transformación, scrap y transferencia a Corte.

No se hizo una corrida visual autenticada en navegador en esta continuación. Al iniciar la revisión, no había servidores escuchando en 4000/5173; la cobertura de frontend fue Vitest y build. Las pruebas de integración API/servicio corrieron en QA local.

## Preparación MVC

La arquitectura MVC sigue siendo documental y no se inició refactor funcional. Los contratos HTTP, propietarios de reglas, límites transaccionales, dependencias, flujos de inventario y ruta de refactor se describen en los documentos `08`–`12` de `docs/engineering-readiness/`. La preparación está **parcial**, porque la línea base funcional no está en verde: persisten tres discrepancias de Telares, un fallo de integración de órdenes, lint rojo, ausencia de E2E visual multicorrida y falta de aislamiento por roles PostgreSQL.

## Riesgos prioritarios pendientes

1. Sustituir `postgres` superusuario en runtime local por rol de aplicación no privilegiado; crear perfil de migración separado y probar permisos de lectura/escritura por DB antes de cambiar `.env`.
2. Confirmar los PTI/fichas concretos que pueden seguir `TELARES → GLOBO → CORTE`.
3. Acordar el contrato de `CorteService.listOrders()` para órdenes PICKED y probar todo el proceso hasta Laminado.
4. Diseñar pruebas HTTP y de concurrencia para doble recepción de turno, sesión expirada y roles no autorizados.
5. Completar corrida E2E visual controlada y multicorrida para Almacén, Extrusión, Telares, Laminado y Globo en QA, preservando Master Data.
6. Resolver 116 errores de lint, reducir el bundle inicial y medir el build en CI.
7. Coordinar rotación de secretos posiblemente expuestos y saneamiento de historial en GitHub; no se hizo ninguna rotación remota ni modificación de historial.

