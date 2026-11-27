# Matriz de cumplimiento QR-First V2.0

La regla funcional vigente está en [`QR_FIRST_FUNCTIONAL_SPEC.md`](../../QR_FIRST_FUNCTIONAL_SPEC.md). Esta matriz registra el estado constatado por inspección de código y pruebas existentes, no una ejecución industrial nueva. Estados: **A** implementado y validado; **B** implementado, falta validación; **C** parcial; **D** no implementado; **E** comportamiento contradice la regla; **F** falta definición/dato; **BLOCKED** validación/escrituras detenidas por el gate del entorno.

| Requisito V2 | Estado | Evidencia de implementación / pruebas | Brecha y acción |
|---|---|---|---|
| Gate QA 60/60 y escritura segura | B | Revalidado en solo lectura el 2026-11-26 mediante `qa-readiness-check.js`: `sistema_enterprise_test`, `traceflow_app_test`, 60 triggers habilitados/30 tablas, `extrusoras_formulas` presente, no conecta a DEV ni hereda privilegios elevados, `readyForWrites=true`. DEV tiene 163 migraciones y QA 164; solo en QA está `20261124130000-add-laminado-cut-transfer-confirmations.js`. | El informe histórico 58/60 queda como evidencia de una ejecución anterior, no estado actual. Antes de DDL, resolver la divergencia en una copia descartable; no aplicar migraciones en QA compartida. QA admite escrituras operativas autorizadas, pero en esta reanudación aún no se ejecutaron. |
| Solicitud→entrega persistente de QR | D | Generación/asignación por lotes y `qr_area_assignments`; frontend de solicitudes usa `InMemoryIdentityRepository`; sin entidad persistente que relacione request, cantidad y QR entregados. | Diseño aditivo de solicitud/entrega/QR individual/usuarios/fechas/historial; confirmar permisos/estados existentes antes de implementación aplicable. |
| QR virgen por área, uso único y transacción | C | Asignación directa y eventos existen; vinculación transaccional en algunas rutas (mezcla, Telares, transformación). | Falta ciclo verificable de entrega/recepción y cobertura común de QR de otra área, reuso, doble vínculo y concurrencia. |
| Mezcla: 500 kg divididos en N contenedores con residual exacto | E/C | `extrusion.service.js` crea varios contenedores, QR y genealogía; borrador de mezcla divide cantidades según fórmula y precisión existente. | V2 fija base 500 kg; implementación actual puede derivar total de fórmula y usa precisión distinta. Caracterizar impacto de fórmula/consumo antes de cambiar. Añadir tests 1..N, conservación y transacción. |
| Traslado de contenedor conserva identidad/saldo | B | Servicio y pruebas de integración de transferencia existen (`extrusionTransfer.local.integration.test.js`). | Falta E2E por rol y prueba de saldos/genealogía después del traslado. |
| QR de rack Extrusión y producción acumulativa | B | `PtiRack`, producción y custodia existentes; integración `extrusionFloor.local.integration.test.js`, handoff. | E2E por operador, múltiples entradas compatibles, QR usado/ajeno y conciliación física. |
| Custodia/relevo de rack | B | Flujos de sesión/cierre/relevo existentes y pruebas; transferencia a Telares rechaza custodia activa. | Validar continuidad y liberación legítima en UI con dos usuarios; no modificar escenario preexistente. |
| Telares: continuidad de corrida entre turnos | C | Rollo, segmentos por operador y avance existentes; integración `telaresE2E.local.integration.test.js`. | No consta segmento explícito de turno/relevo continuo de misma corrida. Definir diseño y prueba; solapamiento de operadores sigue F. |
| Telares: tramo por usuario sin duplicar metros | B/C | `viajero_roll_operator_segments` y validación de tramos existen. | Falta cobertura de turnos, precarga y auditoría UX; regla de solapamiento F. |
| Kg Telares con fórmula de cliente | C | `calculateFabricWeightKg` implementada y tests unitarios. | Reconciliar fórmula/parámetros concretos contra ficha aprobada; no declarar validación industrial sin dicha evidencia. |
| Libre vs venta y bloqueo de transferencias internas | B | Rutas/destino de venta implementados. | Falta prueba por rol de bloqueo de consumo/transferencia y registro de venta. |
| Corte solicita rollos o metros | E | `CorteLaminadoOrdersPage.tsx`, `CorteService.createOrder()` solo usan `requested_roll_count`; selecciona ficha de proceso, no catálogo completo de producto compatible de Telares. | UI/contrato/servicio actual limita demanda a rollos y cada línea a un rollo de entrada. Diseñar modelo y probar 30+25 para demanda50; evaluar persistencia aditiva luego del diseño. |
| Recogida de múltiples rollos, reserva concurrente | C | Reserva por elemento y bloqueo transaccional de selección individual. | No existe operación UI multi-QR demostrada; añadir selección multi-escaneo atómica y prueba de dos usuarios/reintentos. |
| Laminado/Lainer 1:N y N:M | E | `laminado.service.js::transformRoll` recibe una entrada y un QR/salida. La transacción consume el origen y cambia la fila fuente de `viajero_rolls` a la identidad QR/cantidades de salida; no crea una identidad hija independiente. | Confirmado: una entrada puede generar varias salidas. No afirmar que migración sea obligatoria antes de diseñar; `TraceabilityLink` permite vínculos múltiples, pero falta el contrato transaccional que agrupe entradas, salidas, orden y consumos. Resolver con diseño antes de decidir esquema. `08_FUNCTIONAL_CONTRACTS.md` histórico prometía hasta tres salidas sin sustento en servicio actual. |
| Ancho de entrada y múltiples salidas reales | C/F | Ficha permite parámetros; UI actual registra una salida por llamada. | Persistir dimensiones por salida y consumo sin repetir la cantidad fuente. No inferir masa/rendimiento. |
| QR de mezcla Laminado/Lainer | F | No hay regla confirmada del cliente. | No imponer contenedores QR. |
| Lainer separado de Globo | E/F | Código/UI enruta destino GLOBO y lo presenta como “Liner / Globo”; existe módulo/tabla/rol Globo y no existe módulo/área maestra Lainer. La V2 contradice la aclaración anterior del cliente que los consideraba nombres del mismo proceso. | V2 tiene precedencia: señalar esta incompatibilidad deliberada. No crear área/rol/fichas Master Data; la configuración y migración funcional de Lainer necesita definición de producto aprobada. |
| Globo con sus propias reglas | F | Hay catálogo y módulo Globo, fichas existentes previamente reportadas inactivas/borrador. | No derivar de Lainer. No activar ni asignar PTI. |
| Escáner general QR y grafo fan-in/fan-out | C | Lookup y árbol existentes; `traceability_links` admite relaciones múltiples. El árbol limita profundidad a 8, 100 relaciones anidadas y 10 vínculos directos padre/hijo. | No exponer genealogía truncada como completa; agregar indicador de integridad/paginación o recorrido completo. Probar por rol y permisos de costo. |
| E2E industrial multirol en Chrome | D (en ejecución no demostrada) | Informes recientes registran cero corridas nuevas; la auditoría QR no realizó E2E autenticada. | Ejecutar solo tras gate seguro y cuentas QA; guardar evidencia por sesión/operación. |
| Integridad Master Data | B | Fingerprint QA recalculado en solo lectura el 2026-11-26: 2,972 filas, 30 tablas, SHA-256 `aa80cc00d5f9faec21d0ddf476c3def4fe24926083cc71c4f4f87ecace9fcf83`. | Repetir después de cualquier operación de base autorizada y comparar con este valor. |

## Ejecución autenticada y pruebas — 2026-11-27

Esta sección supersede el estado de login de la nota inmediatamente anterior; conserva los resultados históricos sin reescribirlos. La prueba actual se limitó a navegación autenticada, inspección de formularios y capturas. No se enviaron operaciones industriales ni se crearon registros.

### Sesiones QA verificadas en Chrome/CDP

Seis procesos Chrome visibles, perfiles independientes y páginas en `http://127.0.0.1:5176/dashboard`. Para cada perfil, `GET /api/auth/me` respondió HTTP 200 con la identidad esperada:

| Área | Usuario | Rol / área efectivos | Permisos API | Resultado navegador |
|---|---|---|---:|---|
| Almacén | `admin_alm` | `ADMIN_ALM` / `ALMACEN` | 23 | Dashboard; navegación por “Identidad y Lotes” y página “Historial de QRs” accesibles. |
| Extrusión | `SUPREL` | `SUPERVISOR_EXTRUSION` / `EXTRUSION` | 22 | Dashboard y tablero de colas abiertos desde el enlace visible. |
| Telares | `sup_tel_1150` | `SUPERVISOR_TELARES` / `TELARES` | 5, todos QR | Dashboard/WIP de los 21 telares visible; no se ejecutó producción. |
| Laminado | `SUPLAM` | `SUPERVISOR_LAMINADO` / `LAMINADO` | 3 (`view`, `process`, `wip.view`) | Dashboard operativo/WIP abierto desde el enlace visible; indica una orden de Corte y cero rollos en custodia, pero la UI no muestra el folio #44 para confirmar identidad entre sesiones. |
| Corte | `QACOR` | `SUPERVISOR_CORTE` / `CORTE` | 0 | Formulario de solicitudes visible; aparece solo `TEST-LAM-PTI-LOCAL-01` y la orden preexistente `CL-20261126-000044`. No se creó otra orden. |
| Globo | `SUPGLO` | `SUPERVISOR_GLOBO` / `GLOBO` | 3 (`view`, `process`, `wip.view`) | Dashboard operativo/WIP abierto desde el enlace visible; 0 rollos en piso y 2 en tránsito. Esto no acredita habilitación de Lainer. |

El rol con cero permisos de Corte y los cinco permisos QR de Telares requieren revisión de RBAC: la visibilidad de pantalla no basta para aprobar operaciones autorizadas. No se cambiaron roles/permisos. Evidencias: `docs/qa/evidence/2026-11-27-qrfirst-sessions/` (`*-dashboard-current.png`, `*-e2e-current.png`, `browser-smoke-2026-11-27.json`, `corte-request-form-readonly.json`, `module-ui-e2e-2026-11-27.json`).

### Pruebas de esta ejecución

| Suite / recorrido | Resultado | Evidencia y límite |
|---|---|---|
| Backend unitario | 97/100; 3 fallos | `npm --prefix backend run test:unit`. Dos casos ROLLO_TELA esperan bloqueo genérico a Globo; la implementación admite la forma y valida además por BOM. El tercer fallo es una expectativa obsoleta del código de error para una ruta BANDA/CINTA que sí se rechaza. Falta lista aprobada de fichas Globo; no se cambió código ni expectativa. |
| Frontend Vitest | 65/65 | `npm --prefix frontend run test -- --run`. |
| Backend integración | 4 PASS, 1 FAIL, 1 SKIP | Con banderas específicas y entorno QA: Corte→Laminado, ODC/PP FIFO, transferencia de mezcla y Telares pasaron con fixtures revertidos. El relevo falló HTTP 409 por registro ya existente para fecha/turno. Extrusión Floor se autoomitió por mezcla activa en Extrusora 4. No se alteraron registros operativos. El intento inicial sin banderas dio 6/6 SKIP y no se cuenta como validación. |
| Playwright/CDP Chrome visible | 6 sesiones autenticadas; navegación por área 6/6 | Confirmó HTTP 200 e identidad por perfil. Extrusión, Laminado y Globo se abrieron por enlace visible; Almacén historial QR y Corte formulario se inspeccionaron sin enviar; Telares mostró su tablero/WIP. Laminado muestra una orden pendiente, pero no expone el folio para cotejarla con `CL-20261126-000044` visible en Corte. No hay evidencia de producción ni escritura frontend en esta ejecución. |
| Corte, catálogo/unidad | Brecha V2 confirmada | El formulario muestra “Rollos requeridos”, sin selector metros. Solo aparece `TEST-LAM-PTI-LOCAL-01`. La orden #44 preexistente usa esa ficha. No se envió solicitud. |

### Gate, rutas, migraciones y disponibilidad industrial

- QA revalidada después de las integraciones: `sistema_enterprise_test`, runtime `traceflow_app_test`, loopback `127.0.0.1:5432`; guardas 60/60 en 30/30 tablas y `readyForWrites=true`. Sin conexión a DEV desde el runtime QA ni privilegios elevados. Huella actual: 2,972 filas/30 tablas, SHA-256 `aa80cc00d5f9faec21d0ddf476c3def4fe24926083cc71c4f4f87ecace9fcf83`. No hubo operaciones industriales desde Chrome.
- Migraciones DEV 163, QA 164. La única exclusiva de QA es `20261124130000-add-laminado-cut-transfer-confirmations.js`: agrega enums `EN_TRANSITO`, `PENDIENTE_TRANSFERENCIA`, `PENDIENTE_VENTA`; movimientos `DESPACHO_TRANSFERENCIA`, `RECEPCION_TRANSFERENCIA`; columnas nullable `dispatched_by`, `dispatched_at`, `received_by`, `received_at` en `corte_laminado_order_items`; e índice parcial `corte_laminado_items_transfer_queue_idx(status, updated_at DESC)`. `down` quita índice y columnas, pero deja enums. No se aplicó DDL.
- La discrepancia sustantiva de rutas es si Globo aplica a ROLLO_TELA; falta el listado de fichas aprobado. BANDA/CINTA sí se rechazan y su test espera un código de error anterior. Se conserva 97/100 sin ocultar discrepancias.
- QA tiene área/roles/cuenta de Globo (`SUPGLO`), pero no área, rol o cuenta propios de Lainer. No se asumió que Globo autoriza Lainer. Fichas Laminado 1–3 inactivas/borrador; ficha 4 activa pero test-only y sin materiales. Globo 1–2 inactivas/borrador y sin PTI de salida. No hay configuración elegible para PTI industrial.
- Se conservaron colas/preparaciones Extrusión, corridas Telares, ODC-038/rack y orden Corte #44. No se crearon solicitudes, corridas, lotes, transferencias, QR vinculados a PTI ni PTI en esta ejecución.

### Clasificación de cumplimiento V2.0 tras la ejecución

| Requisito | Estado actual | Evidencia concreta |
|---|---|---|
| Seis identidades QA aisladas | **Validado en sesión** | CDP 56001–56006, URL 5176, `/api/auth/me` HTTP 200 por usuario y capturas por área. |
| Gate QA y Master Data | **Validado** | 60/60, `readyForWrites=true`, huella vigente intacta. |
| División equitativa 500/N, residuo exacto a 0.001 kg | **Implementada y probada unitariamente** | `splitQuantityEqually.js` y prueba 500/3 conservan 500 exactos a precisión persistida. No se probó cada QR de contenedor en flujo industrial. El total del servicio aún usa `formula.batch_size_kg || 500`, por lo que requiere validar compatibilidad por fórmula antes de aprobar la regla general. |
| Solicitud/entrega persistente de QR vírgenes | **No implementada** | `InMemoryIdentityRepository`; no existe historial persistente request→entrega por QR/actores/fechas. Asignación histórica no prueba entrega física. |
| QR Extrusión por contenedor y rack | **Parcial** | Código crea QR/contenedores y rack; reparto unitario probado. Falta solicitud/entrega UI y nueva validación industrial. |
| Telares continuidad, metros/tramos/turno y KG por ficha | **Parcial** | Segmentos y fórmula existen; permiso API tiene solo cinco privilegios QR y no se ejecutó producción UI por rol. |
| QR por tela/banda terminada | **Parcial** | Flujo y pruebas existentes; no se ejercitó desde UI esta vez. |
| Libre vs venta / bloqueo transferencia interna | **No validado por UI** | No se hizo prueba negativa autenticada. |
| Corte compatible, rollos o metros | **Parcial/deficiente** | UI solo ofrece rollos y una ficha test-only; metros y catálogo compatible completo no están demostrados. |
| Recogida multi-rollo por escaneo | **Parcial** | Integración confirma un QR; no hay prueba UI de multi-QR atómico. |
| Laminado/Lainer 1:N, QR único por salida | **No implementado para V2** | `transformRoll()` modela una salida por llamada y reemplaza identidad en fila del rollo fuente; falta genealogía hija por salida y validación. |
| Lainer autorizado separadamente | **Bloqueado** | No hay área/rol/cuenta Lainer ni ficha elegible de PTI. `SUPGLO` no se reutilizó. |
| Globo separado de Lainer | **Pendiente de definición propia** | V2 requiere reglas Globo; no se heredó el flujo Lainer. |
| Escáner con genealogía completa | **Parcial** | Lookup/árbol existen, con límites de profundidad/ramificación documentados; no se validó cada tipo QR en Chrome. |
| Solicitudes→PTI→inventarios reconciliados | **No ejecutado** | No hay configuración productiva elegible y no se generó producción válida en esta reanudación. |

No se modificó código funcional ni expectativas; no se aplicó DDL ni se escribió en DEV, QA o Neon. Resultado **PARCIAL**: navegación E2E autenticada demostrada; E2E industrial permanece condicionado por RBAC, fichas maestras válidas y autorizaciones de esquema.

## Cambios de esquema potenciales — decisión posterior al diseño

Los candidatos y diseño preliminar están en [`QR_FIRST_SCHEMA_CHANGE_PROPOSAL.md`](QR_FIRST_SCHEMA_CHANGE_PROPOSAL.md). Se debe comprobar primero si los modelos existentes expresan el contrato requerido. No se afirma que todos requieran migración hasta cerrar el diseño relacional y verificar compatibilidad retrospectiva.

No hay migraciones aplicadas ni escrituras operativas durante esta reanudación. QA se verificó con `readyForWrites=true`, 60/60 protecciones y el hash indicado arriba. El backend preparado para la UI QA está ligado solo a `127.0.0.1:4001`; Vite QA opera en `127.0.0.1:5176` y su cliente servido apunta a ese backend. El estado de las ventanas de login quedó supersedido por la ejecución autenticada documentada arriba. El informe histórico 58/60 permanece sin reescribirse.

## Continuación autónoma — 2026-11-27

Esta sección supersede el estado “No implementada” para solicitud y entrega persistente de QR; el resto de las filas históricas conserva su validez. No se aplicó DDL ni se ejecutaron operaciones industriales.

| Requisito | Estado actualizado | Evidencia / límite |
|---|---|---|
| Solicitud persistente de QR por área | **Implementación preparada; DB pendiente** | `backend/src/modules/qrcodes/qrIdentityRequests.service.js` valida área efectiva y crea una solicitud persistente. La UI permite al usuario operativo indicar cantidad y notas. Requiere aplicar la migración en DB desechable y confirmar QA posterior. |
| Entrega individual por Almacén | **Implementación preparada; DB pendiente** | Almacén consulta solicitudes y códigos `UNASSIGNED` activos; entrega cantidad exacta con selección de QR. Se guardan `qr_area_assignments`, los ítems de solicitud, eventos de trazabilidad y responsable/fecha en una transacción. La UI no ofrece aprobar/rechazar ni fabricar QR. |
| Uso único, concurrencia y rollback QR | **Pruebas unitarias aprobadas; PostgreSQL pendiente** | Tests cubren repetición de IDs, cantidad inexacta, QR no disponible, evento/ítem/asignación y rollback simulado. Migración agrega unicidad por `qr_code_id`/asignación y bloqueos `FOR UPDATE`. Aún falta test real concurrente/rollback de PostgreSQL. |
| RBAC de solicitud/entrega | **Pruebas de servicio; HTTP autenticado pendiente** | Backend permite solicitar solo a usuario no global con área operativa propia; entregar/consultar QR vírgenes solo a rol de Almacén por área. UI la muestra a sesiones autenticadas y el backend decide acceso. No se añadieron permisos genéricos. Ejecutar pruebas HTTP por rol al iniciar QA. |
| UI solicitud/entrega QR | **Implementada y probada en componente** | `IdentityRequestsPage.tsx` usa API/TanStack Query; sustituye el repositorio en memoria, muestra operaciones por rol y elimina Aprobar/Rechazar. Frontend 67/67; pruebas de esta página 2/2. E2E de API persistente requiere migración aplicada en DB de prueba. |
| Impresión Brother DK-2205 | **PDF y lectura QR verificados; físico pendiente** | Perfiles 62×45/55/62, lotes 1/3/10/50/100/200 y decodificación ZXing pasaron en `thermal-label-pdf.test.js`; PDFs/PNGs de calibración en `docs/qa/thermal-printing/`. Se añadió guía de instalación Brother. Modelo de impresora y calibración física siguen pendientes. |
| Puertos DEV/QA | **Conflicto actual comprobado; QA visible en 5176** | Procesos observados: 5173 Vite DEV; 5174 Vite sin `--mode qa` ni `--strictPort` (no se usó); 5176 Vite `--mode qa --strictPort`. Backend 4000 es DEV (`nodemon`), backend 4001 fue lanzado con `APP_ENV=test`, `NODE_ENV=test`; PostgreSQL 5432. `npm run dev:qa` falla en 5174 por ocupado y no cambia de puerto. Playwright abrió el login QA en 5176; el dueño/carpeta de 5174 no está confirmado y no se detuvo. |
| Gate QA actual | **Revalidado en solo lectura** | `qa-readiness-check.js`: `sistema_enterprise_test`, rol `traceflow_app_test`, 60/60, 30 tablas, `readyForWrites=true`, sin super/createdb/createrole ni conectividad a DEV; fingerprint: 2,972 filas, 30 tablas, SHA-256 `aa80cc00d5f9faec21d0ddf476c3def4fe24926083cc71c4f4f87ecace9fcf83`. Sin DDL/DML. |

Checkpoint, captura y próxima acción exacta: [`AUTONOMOUS_EXECUTION_CHECKPOINT_2026-11-27.md`](AUTONOMOUS_EXECUTION_CHECKPOINT_2026-11-27.md) y `docs/qa/evidence/2026-11-27-autonomous-execution/qa-login-5176.png`. La migración QR requiere prueba `up`/`down` en PostgreSQL desechable; QA compartida permanece intacta.

## Corrección QR de almacén — 2026-11-27

La revisión independiente detectó y la intervención corrigió dos defectos del código preparado: faltaba el rol existente `SUPERVISOR_ALMACEN` en la capacidad de surtido, y el backend podía reasignar un QR de un lote destinado a otra área. El rol se añadió con validación obligatoria del área efectiva; la UI filtra por área y el servicio vuelve a validar, bajo transacción, el área asignada tanto al QR como al lote antes de surtir. Los códigos con destino fijo incompatible se rechazan sin crear asignación.

Regresión: backend RBAC/solicitud/entrega 9/9 y componente React de solicitudes 2/2; frontend completo 67/67; build aprobado. El backend completo fue 122/125 con tres desacuerdos preexistentes Telares→Globo, no modificados. Seguridad: 13,251 archivos, 0 hallazgos. No se ejecutó DDL ni se probaron transacciones concurrentes sobre PostgreSQL real. Docker Desktop no está disponible y no hay cliente `psql`/`pg_isready` en PATH; la migración permanece sin aplicar y QR request→delivery aún no tiene validación de base real ni E2E autenticada.

El lector general de genealogía también devuelve `lineage_completeness`. Si cualquiera de sus consultas acotadas alcanza su límite, marca `complete=false`, identifica la consulta y muestra una alerta; si ninguna llega al límite, `complete=null` (no se afirma que el grafo completo esté verificado). Pruebas focalizadas backend 14/14, suite frontend 67/67, build aprobado y security scan 13,251 archivos / 0 hallazgos. El lector aún no tiene E2E autenticado ni recorrido bidireccional de todas las entidades de Laminado/Lainer.

La última ejecución completa backend, tras este cambio, fue **123/126**; las mismas tres expectativas Telares→Globo permanecen pendientes de aclaración y no se tocaron.
