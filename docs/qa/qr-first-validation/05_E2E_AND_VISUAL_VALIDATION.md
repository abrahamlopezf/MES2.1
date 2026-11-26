# Plan E2E y validación visual

## Ejecución efectiva del 26 de noviembre de 2026

No se escribieron datos operativos ni se ejecutaron corridas industriales: el control fail-closed dejó QA compartida como no apta para escrituras, porque `extrusoras_formulas` carece de sus triggers de protección. Se verificó la base por medio de consultas de solo lectura; no se usó Neon, producción ni se alteró DEV/QA.

- QA: `sistema_enterprise_test`, loopback `127.0.0.1:5432`, runtime `traceflow_app_test`; sin `SUPERUSER`, `CREATEDB`, `CREATEROLE`, `REPLICATION`, `BYPASSRLS`, `CREATE SCHEMA`, roles heredados elevados o permiso de conexión a DEV.
- DEV y QA: 90 tablas públicas; 2,972 filas maestras en 30 tablas y fingerprint v2 idéntico. `extrusoras_formulas` contiene 44 filas/7 columnas. Evidencia JSON v2 en `evidence/`.
- Triggers QA: 58/60 habilitados sobre 29/30 tablas; falta `extrusoras_formulas`. `readyForWrites=false`.
- Migraciones: DEV 163; QA 164. La única diferencia es `20261124130000-add-laminado-cut-transfer-confirmations.js` aplicada solo en QA.
- Backend `test:unit`: 92/96. La falla de protección QA refleja el hueco real; las otras tres son expectativas/rutas Telares→Globo sin ficha elegible identificada por el cliente. Los cuatro casos HTTP pasaron al correr en entorno local con sockets habilitados.
- Frontend: 49/49 pruebas; Vite build completó con éxito (3.71 MB minificado, advertencia de bundle mayor a 500 KB).
- `dev:check`: 8/8; `db:verify:privileges`: 20/20; pruebas dirigidas de aislamiento, fingerprint y acceso a lote QR: 17/17.
- E2E visual autenticado, RBAC vía API, genealogía persistida, concurrencia y multicorridas: **NOT EXECUTED**. No se generaron cuentas sintéticas ni se usó una sesión de usuario existente.

Resultados detallados y clasificación de bloqueos: [Ejecución QA QR-First 2026-11-26](evidence/2026-11-26-execution-report.md). Los reportes históricos no se cuentan como nueva ejecución; véase [13_VALIDATION_RESULTS](../../engineering-readiness/pre-mvc-final/13_VALIDATION_RESULTS.md).

## Escenarios requeridos y situación

| Caso | Diseño de verificación | Situación |
|---|---|---|
| E2E-01 Extrusión→Telares | Recepción de material sintético, mezcla, PTI/rack QR, consumo y rollo con QR; conciliar cantidades y árbol | No ejecutado; requiere QA desechable y turno válido. |
| E2E-02 Telares→Laminado | Ficha compatible, orden de Corte, QR original, recepción, materiales, transformación, salida QR y genealogía | No ejecutado; el test existente de integración no reemplaza UI+persistencia. |
| E2E-03 Telares→Globo | Solo ficha confirmada por Producto; validar QR/ruta/resultado | Bloqueado: lista de fichas elegibles no definida (`QA-TEL-ROUTE-001`). |
| E2E-04 Laminado→siguiente proceso | Custodia, destino venta/corte, handoff y recepción según contrato | No ejecutado de punta a punta. |
| E2E-05 QR desde ventana global | Escanear QR por tipo; comprobar detalle y que no cambian estados/inventarios | No ejecutado. |
| E2E-06 QR en área incompatible | Mostrar solo consulta; rechazar escritura y conciliar ningún cambio | No ejecutado. |
| E2E-07 Doble asignación concurrente | Dos sesiones intentan asociar mismo QR; una única asociación duradera | No ejecutado. |
| E2E-08 Participación por tramos | Dos o más operadores, límites de metros adyacentes, cambio de turno y consulta del QR | No ejecutado. |
| E2E-09 Múltiples entradas | Varias bobinas/PTI y materias primas con cantidades diferentes | No ejecutado. |
| E2E-10 Parcial/remanente | Consumo menor al saldo; comprobar balance, QR fuente, hijo/relación y custodia | No ejecutado. |
| E2E-11 Fallo transaccional | Fallo controlado en staging desechable al asociar QR/registrar output; todo rollback | No ejecutado. |
| E2E-12 Permisos | Roles mínimos prueban leer/generar/asignar/operar solo su área, incluida llamada directa API | No ejecutado visualmente; revisar rutas/permisos no basta. |

## Protocolo seguro para la próxima corrida

1. Crear/seleccionar una base QA desechable, comprobar host/db/rol y fingerprint antes de cualquier write.
2. Usar usuarios QA autorizados separados por rol; no usar producción ni reutilizar credenciales/tokens de sesión.
3. Capturar estado inicial de QR, stock, WIP, custodia, turnos y huella Master Data.
4. Ejecutar cada acción desde la UI y guardar request/response sanitizados, timestamps y IDs sintéticos.
5. Verificar API y persistencia con consultas read-only tras cada commit de UI; nunca sustituir una acción por UPDATE manual.
6. Cubrir vista escritorio y móvil; revisión estática no cuenta como visual.
7. Repetir cada escenario con precondiciones nuevas y registrar reinicio/error sin modificar DEV o QA compartida.
8. Comparar huellas de Master Data y verificar rollback/limpieza solo en el disposable al terminar.

## Inventario visual pendiente

Generar lote, imprimir y reimprimir; tabla/lista y filtros de QR; escaneo global/cámara/manual; selección de telar, BOM y metros; backflush y remanente; segmentos de operador; registro de salida; transferencia/recepción de Corte; WIP, consumo y salida de Laminado; Globo; historial/árbol; permisos y errores; layouts móvil/tablet; teclado/foco del scanner y accesibilidad de mensajes.
