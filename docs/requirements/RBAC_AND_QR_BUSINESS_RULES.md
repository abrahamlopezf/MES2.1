# Requisitos de RBAC y administración de lotes QR

**Estado:** requisitos documentados; restricción de generación de lotes implementada localmente.  
**Fecha:** 2026-11-26.

**Fuente de confirmación:** Product Owner, directiva “TRACEFLOW MES — DIRECTIVA DEFINITIVA DE RBAC, ADMINISTRACIÓN POR ÁREAS Y CENTRALIZACIÓN DE LOTES QR”.

## Reglas confirmadas para este cambio

1. Solo `SUPERADMIN`, `ADMIN`, `ADMIN_GRAL`, `ADMIN_GENERAL`, `ADMIN_ALM` y `ADMIN_ALMACEN` pueden generar lotes de QR vírgenes.
2. La autorización se valida en el backend por rol y luego conserva la validación de permisos existente. El frontend oculta el acceso y protege la ruta, pero no es el control de seguridad principal.
3. Este cambio no altera la lectura, escaneo, asignación, consulta de genealogía ni las acciones de producción que asignan un QR ya generado.
4. No modifica roles, permisos persistidos, usuarios, esquema ni datos. La generación centralizada no habilita por sí misma una impresión física ni modifica la custodia.

## Reglas de negocio confirmadas

| ID | Regla confirmada | Control técnico derivado |
|---|---|---|
| RN-RBAC-001 | Almacén, Extrusión, Telares, Laminado y Globo/Liner deben contar cada uno con al menos un Admin de área y un Supervisor activos. Las áreas adicionales habilitadas deben identificarse. Los perfiles globales no sustituyen responsables del área. No hay límite máximo. | Verificación transaccional de cobertura organizativa y reporte de áreas que incumplen. No crear usuarios ficticios en DEV. |
| RN-RBAC-002 | No se desactiva el último Admin ni Supervisor activo del área. Debe existir reemplazo activo antes de la baja. | Backend debe cubrir también cambio de rol/área, desvinculación, baja lógica y operaciones masivas, con serialización/concurrencia que evite dos bajas simultáneas del último par. Aplica incluso a globales. |
| RN-RBAC-003 | Superadmin tiene acceso global a operaciones, usuarios, roles/permisos, configuración, fichas, precios, costos, reportes, QR y trazabilidad. | Alcance global no omite invariantes, validaciones industriales ni atomicidad. |
| RN-RBAC-004 | Admin General tiene acceso a todas las funciones de todas las áreas; permanece como perfil distinto de Superadmin. | Verificar que ningún filtro de área lo limite accidentalmente, sin fusionar perfiles. |
| RN-RBAC-005 | Admin de área opera como supervisor del área y además edita fichas PTI del área, consulta precios autorizados, y administra usuarios operativos de su área (crear, consultar, editar, activar/desactivar). | Backend debe limitar área, productos, materiales de insumo y roles asignables con relaciones verificables; no por coincidencia textual. |
| RN-RBAC-006 | Admin de área no puede borrar físicamente usuarios, crear globales/u otros Admin de área, cambiar usuarios de área, alterar permisos globales ni elevarse. El supervisor no puede administrar usuarios. | Políticas de servicio y API deben aplicar alcance; ocultar menú no basta. Si no se puede identificar qué roles son operativos, dejarlo pendiente. |
| RN-RBAC-007 | Supervisor solo ejecuta funciones operativas de su proceso/ámbito: producción, consumo, transferencias, turnos, QR operativo, trazabilidad, scrap/merma e información física necesaria. No edita fichas, consulta precios/costos restringidos ni administra usuarios/roles/permisos/configuración global ni genera lotes. | Respuestas HTTP no deben filtrar costos; proteger también accesos directos/API y mantener cantidades físicas. |
| RN-QR-001 | Solo Superadmin, Admin General y Admin Almacén generan lotes QR. | Denegar en backend para cualquier otro rol, incluido Supervisor de Almacén y cualquier rol futuro no autorizado. |
| RN-QR-002 | Admin Almacén puede generar lotes para cualquier área MES; conservar generador, área destinataria, cantidad, lote, fecha, estados e historial. | No confundir área generadora con destinataria. Mantener QR virgen y sin vínculo productivo inicial. |
| RN-QR-003 | Producción solicita físicamente sus lotes a Almacén. | No crear workflow o aprobación digital sin decisión futura. |
| RN-QR-004 | Desactivar lógicamente/reversiblemente el generador para Admin/Supervisor de áreas productivas y otros roles no autorizados, sin borrar módulo ni bloquear QR operativo. | Aplicar servidor, ruta, navegación y URL directa; preservar escaneo, consulta, asignación, genealogía y acciones productivas. |
| RN-QR-005 | Cada área usa QR destinados a esa área; Admin Almacén los puede generar para cualquier área. | Validar destinatario/compatibilidad al asociar, no el rol del generador. |
| RN-QR-006 | Asociación única, QR virgen/disponible, área compatible, permiso, registro, atomicidad y concurrencia; reimpresión conserva identidad. | No reasignar QR vinculado como disponible; asegurar idempotencia cuando aplique. |
| RN-QR-007 | Almacén conserva su flujo de recepción/identificación/movimientos aprobado. | No imponer al almacén reglas de producción propias de otras áreas. |
| RN-FIN-001 | Admin área ve precios de PTI del área y materiales usados como insumos de esa área, no precios generales del MES. | Determinar ámbito con fichas, fórmulas, catálogos y relaciones productivas confiables, no coincidencia textual. |
| RN-FIN-002 | Supervisores no reciben precios/costos ni derivados monetarios, pero sí datos físicos y operativos. | Sanitizar JSON, includes, búsquedas, QR/genealogía, dashboards, reportes y archivos desde servidor. |
| RN-FIN-003 | Superadmin y Admin General consultan información financiera global. | Mantener acceso global diferenciado de Admin área. |
| RN-TRACE-001 | La consulta de genealogía debe mostrar antecedentes industriales autorizados sin entregar permisos para mutar otras áreas o revelar finanzas restringidas. | Separar lectura transversal de permisos operativos/administrativos/financieros. |
| RN-QR-RES-001 | Resolución QR considera identidad, tipo, estado, destinatario, origen, custodia, área/operación, usuario, permisos, ficha y destinos. | QR incompatible se rechaza para movimientos; escaneo general da lectura/genealogía, no cambios automáticos. |

## Criterios de aceptación

La regla solo se marca aprobada con evidencia real por backend y UI. Debe comprobarse cobertura de responsables; imposibilidad de dejar el último responsable; aislamiento de cada Admin de área; administración de usuarios operativos limitada; ausencia de acceso de supervisores al módulo de usuarios y datos financieros; acceso global de ambos roles globales; lotes QR centralizados y destinados correctamente; QR operativos disponibles al área; falta de escalamiento por `area_id`; genealogía transversal; y ausencia de regresión en Almacén. Los criterios no probados quedan como parcial, bloqueado o no verificable.

## Historial de decisión y versiones sustituidas

Esta decisión sustituye concesiones anteriores que permitían al Supervisor de Almacén, Supervisor de Extrusión u otros supervisores generar QR, así como interpretaciones que permitían generación a administradores productivos. También sustituye la excepción previa de administración de usuarios por supervisores de Extrusión/Telares. Los permisos históricos en DB no se consideran política vigente y deben retirarse mediante autorización y migración separadas; el control servidor nuevo ya deniega la generación a esos roles.

## Matriz resumida de roles

La siguiente matriz combina la política de producto con conteos de roles activos consultados en la base local de desarrollo. Los conteos no identifican usuarios. `0` significa que el rol existe/no se encontró una cuenta activa con ese rol en la consulta local; no establece si el rol debe habilitarse en una instalación futura.

| Rol | Área | Cuentas activas locales | Generar lote QR | Lectura/escaneo operativo |
|---|---|---:|---|---|
| SUPERADMIN | Global | 1 | Sí | Sí, según permisos globales |
| ADMIN / ADMIN_GENERAL / ADMIN_GRAL | Global | ADMIN: 1; otros alias: 0 | Sí | Sí, según permisos globales |
| ADMIN_ALM / ADMIN_ALMACEN | Almacén | ADMIN_ALM: 1 | Sí, requiere permiso QR existente | Sí, según permisos |
| SUPERVISOR / WAREHOUSEMAN | Almacén | 1 / 3 | No | Sí, solo permisos operativos |
| ADMIN_EXT | Extrusión | 1 | No | Sí, según permisos operativos |
| SUPERVISOR_EXTRUSION | Extrusión | 2 | No | Sí, lectura/escaneo operativo |
| ADMIN_TELARES | Telares | 0 | No | Sí, según permisos operativos |
| SUPERVISOR_TELARES / OPERADOR_TELARES | Telares | 1 / 4 | No | Sí, lectura/escaneo operativo |
| ADMIN_LAMINADO / SUPERVISOR_LAMINADO | Laminado | 0 / 1 | No | Sí, según permisos del área |
| ADMIN_GLOBO / SUPERVISOR_GLOBO | Globo | 0 / 1 | No | Sí, según permisos del área |
| ADMIN_CORTE / SUPERVISOR_CORTE / OPERADOR_CORTE | Corte | 0 / 0 / 0 | No | N/A hasta cuentas activas |

La consulta fue de solo lectura contra PostgreSQL en `127.0.0.1:5432`, base `sistema_enterprise`, usuario limitado `traceflow_app_local`. No se consultaron nombres/correos ni se ejecutaron escrituras.

## Hallazgos RBAC que requieren decisión/implementación separada

- Las rutas `/api/users` tienen un bypass explícito para `SUPERVISOR_EXTRUSION` y `SUPERVISOR_TELARES`; `users.service.js` además permite a esos supervisores crear usuarios de su área. Esto contradice la regla directiva de reservar administración de usuarios a roles Admin. **No se cambió** en esta intervención.
- En la consulta local no hay cuentas activas `ADMIN_TELARES`, `ADMIN_LAMINADO` ni `ADMIN_GLOBO`; tampoco hay cuentas de Corte. La asignación de administradores y el alcance exacto de Corte necesitan confirmación operativa.
- `canViewCosts` permite costos a administradores de área en la política compartida. El middleware del dashboard financiero global sí restringe a roles globales, pero no se certificó la sanitización de cada respuesta de área. Hace falta auditoría por endpoint, sin inferir que el dashboard global protege todos los módulos.
- Existen permisos históricos `qr.create`/`qr.generate` para roles operativos. La API ahora los deniega para crear lotes aunque sigan presentes. Su limpieza persistente requeriría una migración/autorización independiente y no forma parte de este cambio.
- El frontend mantiene excepciones heredadas para supervisores de Extrusión/Telares en ciertos grupos de navegación. La entrada “Generar Lote” ahora aplica una lista explícita de roles que prevalece sobre esa excepción; las otras excepciones no fueron cambiadas.

## Referencias de instrucciones del repositorio

Revisar `AGENTS.md` y `.agents/AGENTS.md` antes de cambios futuros de autorización. Ambos archivos aparecían como modificaciones preexistentes y se dejaron intactos; esta intervención no altera instrucciones de agentes ni las reglas generales de aplicación.
