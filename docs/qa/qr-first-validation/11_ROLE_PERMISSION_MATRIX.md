# Matriz de roles y permisos

La matriz con cuentas activas agregadas por rol está en [`docs/requirements/RBAC_AND_QR_BUSINESS_RULES.md`](../../requirements/RBAC_AND_QR_BUSINESS_RULES.md).

## Matriz individual exigida

`Requerido` expresa la decisión del Product Owner; `Actual estático` se limita al código/roles/permisos consultados y no sustituye prueba autenticada.

| Perfil | Responsables activos localmente | Ámbito requerido | Usuarios (requerido) | Ficha/precios (requerido) | Generar lotes (requerido/actual) | Nota sobre actual estático |
|---|---:|---|---|---|---|---|
| Superadmin | 1 global | Todas las áreas/funciones | Global | Global | Sí / Sí | Bypass global en middleware de permisos. |
| Admin General (`ADMIN_GENERAL`, `ADMIN_GRAL`, `ADMIN`) | `ADMIN`: 1; aliases explícitos: 0 | Todas las áreas/funciones; no se asigna como responsable de área | Global | Global | Sí / Sí | Middleware reconoce aliases globales; cuentas detalladas en documento maestro. |
| Admin Almacén (`ADMIN_ALM`, alias `ADMIN_ALMACEN`) | `ADMIN_ALM`: 1 | Almacén; gestión operativa propia | Operativos de Almacén | Materiales/precios de su ámbito | Sí; QR para cualquier área / Sí para rol `ADMIN_ALM` | En generación, service reconoce ambas variantes como coordinador multiárea. |
| Supervisor Almacén (`SUPERVISOR`) | 1 | Solo operación Almacén | No | No | No / Denegado por nueva política | Tiene permisos QR históricos; API de lote y UI ahora los sobreponen. |
| Admin Extrusión (`ADMIN_EXT`, `ADMIN_EXTRUSION`) | `ADMIN_EXT`: 1 | Extrusión | Operativos Extrusión | PTI/insumos Extrusión | No / Denegado | `ADMIN_EXTRUSION` existe como alias de servicio; otros permisos requieren API/E2E. |
| Supervisor Extrusión | 2 | Operación Extrusión | No | No | No / Denegado | Bypass QR y bypass de usuarios observados históricamente; lote QR quedó restringido. |
| Admin Telares (`ADMIN_TELARES`, `ADMIN_TEL`) | 0 | Telares | Operativos Telares | PTI/insumos Telares | No / Denegado | No hay cuenta activa local con este perfil; prueba real bloqueada por cobertura. |
| Supervisor Telares | 1 | Operación Telares | No | No | No / Denegado | Bypass de administración de usuarios detectado en API; no corregido aquí. |
| Admin Laminado | 0 | Laminado | Operativos Laminado | PTI/insumos Laminado | No / Denegado | Sin administrador activo local. |
| Supervisor Laminado | 1 | Operación Laminado | No | No | No / Denegado | Operación/finanzas requiere verificación API y visual. |
| Admin Globo/Liner | 0 | Globo/Liner | Operativos Globo/Liner | PTI/insumos Globo/Liner | No / Denegado | Sin administrador activo local. |
| Supervisor Globo/Liner | 1 | Operación Globo/Liner | No | No | No / Denegado | Operación/finanzas requiere verificación API y visual. |
| Roles de Corte (admin/supervisor/operador) | 0 / 0 / 0 | Pendiente de cobertura confirmada | Según rol operativo futuro | Según decisión de Corte | No / Denegado | Roles existentes sin usuarios activos; no se incluyó en mínimo inicial. |

## Estado por acción adicional

| Acción | Requisito | Evidencia actual | Resultado |
|---|---|---|---|
| Producción y operación dentro del área | Supervisor/Admin permitido | Rutas y políticas estáticas; sin prueba autenticada | NO VERIFICABLE transversalmente |
| Producción cruzada a otra área | Rechazada | Existe lógica de área en varios módulos, sin prueba API `area_id` transversal | NO VERIFICABLE |
| Editar ficha propia/ajena | Admin del área solo propia; supervisor ninguna | Laminado requiere `ADMIN_LAMINADO`; Globo `areaAdmin`; Extrusión permisos de fórmula; falta probar alcance por recurso | PARCIAL / NO VERIFICABLE |
| Consultar costos | Global completo; Admin de área solo PTI/insumos; supervisor ninguno | Regla común permite admins de área y exclusión de supervisores; falta comprobar relaciones productivas y respuestas de todos endpoints | PENDIENTE de validación por endpoint; no declarar fallo global sin sesión |
| Administración de usuario | Admin propia área; supervisor ninguno | Excepción explícita permite supervisores Ext/Telares consultar/crear/editar; vulnera RN-RBAC-006/007 | FALLIDO |
| Último responsable | Mantener al menos uno de cada clase por área, aun ante concurrencia | No se encontró ni ejecutó protección transaccional específica | NO VERIFICABLE / implementación pendiente |
| Imprimir/reimprimir | No crear identidad nueva; conservar la original | No se hizo prueba runtime de lote/reimpresión | NO VERIFICABLE |
| Asignar QR virgen | Admin/Supervisor pueden en su operación y área destino | Permiso `qr.assign`; asociaciones QR en módulos, sin prueba multisesión | PARCIAL |
| Consulta de genealogía | Lectura industrial transversal sin facultad de mutar ni datos financieros indebidos | Servicios/modelos existentes; no sesión visual ni API por rol | PARCIAL |
| Exportación/reportes/configuración/roles | Según ámbito y perfil | Matriz de endpoints aún no completa | NO VERIFICABLE |

No se alteraron permisos persistidos ni se crearon cuentas. La ausencia de un administrador de área activa en Telares, Laminado y Globo incumple la cobertura mínima confirmada, aunque un rol global pueda entrar a estas áreas.
