# Resultados de pruebas RBAC / QR

Fecha de ejecución: 2026-11-26.

## Continuación: correcciones RBAC y validación (2026-11-26)

### Cambios implementados en código local

| Hallazgo confirmado | Corrección | Evidencia y límite |
|---|---|---|
| Supervisores podían llegar a la administración de usuarios por rutas o jerarquías heredadas | Se deniega a todos los supervisores en rutas y servicios; administradores de área quedan limitados a roles operativos de su área. | Pruebas unitarias puras de autorización; HTTP autenticado por rol pendiente. |
| La jerarquía numérica impedía a Admin de Extrusión gestionar Supervisor de Extrusión | La política de gestión usa código/área/rol permitido explícito y no depende del nivel legado para ese caso. | Cubierto por `backend/test/user-management-rbac.test.js`. |
| Desactivar/cambiar de rol podía retirar al último administrador o supervisor | Se agregó lock transaccional por área y tipo de responsable antes del conteo y la mutación. | Implementado; requiere QA desechable para comprobar concurrencia y persistencia. |
| Supervisores podían editar fichas de Globo, Telares y Extrusión | Las mutaciones de especificaciones/fichas se restringieron a Admin de área y perfiles globales. | Política probada en `backend/test/area-catalog-rbac.test.js`; requests autenticadas aún no ejecutadas. |
| Cualquier `ADMIN_*` y `FINANCE` podían superar la regla general de visualización de costos | La política ahora permite perfiles globales y administradores de área reconocidos; excluye supervisores y roles administrativos/financieros no enumerados. | Pruebas puras en `backend/test/rbac-financial-visibility.test.js` y `frontend/src/utils/authHelpers.test.ts`; revisión endpoint por endpoint pendiente. |
| Menú y ruta de usuarios mostraban permisos heredados a supervisores | Helpers frontend usan allowlist explícita de administradores; la ruta excluye supervisores. | Suite frontend aprobada; no se autenticaron sesiones de QA en navegador. |

Archivos funcionales modificados por esta continuación: `backend/src/shared/security/authorization.service.js`, `backend/src/shared/security/accessRules.js`, `backend/src/shared/security/areaRolePolicy.js`, `backend/src/modules/users/users.routes.js`, `backend/src/modules/users/users.service.js`, `backend/src/modules/extrusion/extrusion.routes.js`, `backend/src/modules/telares/telares.routes.js`, `backend/src/modules/globo/globo.routes.js`, `frontend/src/utils/authHelpers.ts`, `frontend/src/app/SuperAdminRoute.tsx`, `frontend/src/components/layout/Sidebar.jsx`. Pruebas añadidas: `backend/test/user-management-rbac.test.js`, `backend/test/area-catalog-rbac.test.js`, `backend/test/rbac-financial-visibility.test.js`, `frontend/src/utils/authHelpers.test.ts`.

### Pruebas de esta continuación

| Ejecución | Resultado | Interpretación |
|---|---:|---|
| Suite backend `npm run test:unit`, con acceso local autorizado a sockets | 92/96 | PASS 92; FAIL 4. Las 4 caracterizaciones HTTP que habían fallado con `EACCES` pasaron al permitir sockets. |
| Backend RBAC/QR/fingerprint/políticas de catálogo y finanzas dirigidas | 14/14 | PASS unitario de políticas; no equivale a API por rol ni a persistencia. |
| Frontend Vitest | 53/53 en 13 archivos | PASS. Incluye política de menú/ruta, lote QR y visibilidad financiera en helper. |
| Build Vite | PASS, 1,865 módulos | Advertencia conocida: chunk JS ~3.71 MB minificado. |
| `security:check` | 0 hallazgos / 1,271 archivos | PASS en el último escaneo de esta intervención. |
| `dev:check` | BLOQUEADO por revisión automática | La ejecución escalada fue rechazada; la revisión indicó riesgo de `CREATE TABLE` en bases existentes. No se intentó evitar el rechazo ni se modificaron bases. |

### Cuatro fallos backend pendientes

1. QA conserva 58 triggers de protección en 29/30 tablas; falta cubrir `extrusoras_formulas`. No se instalaron triggers porque no hay una instancia QA desechable ni acceso administrativo local verificado.
2. Tres tests reflejan que las expectativas Telares→Globo no coinciden con la regla confirmada de “solo ciertas fichas”, cuya lista todavía no existe. No se cambió la regla ni se alteraron esos tests.

El error `EACCES` era una restricción de ejecución del sandbox para sockets loopback, no una falla funcional: al ejecutar con autorización local los cuatro HTTP tests pasaron. El test de base QA se conectó y detectó el déficit real 58/60.

### Límites no certificados

- No se modificaron roles/permisos persistidos, usuarios, Master Data, triggers, migraciones, mezclas, turnos, colas ni inventario.
- No se ejecutaron API autenticadas, auditoría visual, genealogía persistida, pruebas concurrentes, E2E industrial ni multicorridas: 0 corridas industriales completadas en esta continuación.
- La barrera de último responsable está implementada en transacción, pero concurrency/persistencia sigue pendiente.
- La protección financiera fue ajustada en la política compartida, pero falta recorrer cada endpoint, exportación, respuesta QR y genealogía con sesiones sintéticas para demostrar el alcance por área.
- No se revalidó con un restore real de backup ni se habilitó escritura QA.

### Requisito técnico exacto para desbloquear QA

Se necesita un PostgreSQL desechable independiente (puerto y volumen propios), con credenciales administrativas locales separadas de runtime, capacidad de restaurar y verificar el snapshot antes de habilitar la escritura y un usuario migrador QA separado. No hay Docker/Podman ni perfil admin local disponible en esta sesión. Sin eso, trigger QA, migración DEV, E2E de escritura y certificación visual permanecen bloqueados.

| Prueba | Resultado | Evidencia y límite |
|---|---|---|
| Política de roles permitidos para lotes | APROBADO (4 casos unitarios backend + 18 frontend) | `backend/test/qrcodes-batch-access.test.js` y `frontend/src/modules/qrcodes/access/qrBatchAccess.test.js`: allowlist, rechazo y visibilidad derivada de rol. |
| Orden de middleware en creación de lotes | APROBADO por inspección | `/batches` pasa por `requireQrBatchManager` antes del permiso y validador existentes. No se envió POST real. |
| Build Vite | APROBADO | 1,865 módulos transformados; bundle JS 3,708.78 kB y advertencia preexistente de chunk >500 kB. |
| `git diff --check` | APROBADO | Sin errores de whitespace en archivos versionados modificados consultados. |
| Guardas de generación y emisión/reimpresión | APROBADO por inspección de rutas + política unitaria | `POST /batches`, impresión de lote, impresión múltiple y código individual incluyen `requireQrBatchManager`; no se envió solicitud autenticada. |
| API autenticada para roles permitidos/no permitidos | NO EJECUTADO | No se usaron cuentas ni se generó lote. |
| UI por rol escritorio/móvil | NO EJECUTADO | Sin sesión QA visual verificada en esta intervención. |
| Suite frontend completa | APROBADO: 12 archivos, 49 pruebas | `npm test -- --run`. |
| Suite total de backend | NO EJECUTADO | Se corrieron 8 pruebas específicas de política/acceso QR y árbol QR; no se afirma suite completa. |
| Datos PostgreSQL | SIN ESCRITURAS | Consulta previa de solo lectura para conteos agregados; no se modificó RBAC ni Master Data. |

**Estado:** cambio QR local probado a nivel de política; requiere prueba de integración autenticada antes de despliegue. No se hizo commit ni despliegue.

## Trazabilidad con los casos obligatorios

| Casos | Estado | Motivo/evidencia |
|---|---|---|
| RBAC-01 a RBAC-20 | NO EJECUTADOS en UI/API | Requieren perfiles autenticados y base QA desechable. La revisión estática detectó el bypass de usuarios en supervisores Ext/Telares (RBAC-09), pero ningún otro caso se marca aprobado por código solamente. |
| RESP-01 a RESP-09 | BLOQUEADOS / NO VERIFICABLES | No se encontró evidencia suficiente de la protección transaccional de último responsable ni de control concurrente. No se intentaron bajas ni se modificaron usuarios. |
| QR-01 a QR-04 | PARCIAL | `qrcodes.service.js` permite a Admin Almacén seleccionar área activa; no se ejecutó generación ni se comprobó persistencia/meta del lote. |
| QR-05 a QR-15 | APROBADOS a nivel de política, API no ejecutada | Allowlist unitaria permite los 6 códigos autorizados y rechaza los roles operativos/administradores de producción enumerados. El middleware de servicio y rutas protege los endpoints; no se autenticó por rol. |
| QR-16 a QR-21 | NO EJECUTADOS | No se probó asignación por área, doble asociación, reuso, consulta general ni acceso desde proceso incompatible. |
| QR-22 | APROBADO a nivel de middleware | Prueba unitaria comprueba 403 anterior al middleware histórico para Supervisor de Extrusión con permisos QR antiguos. Solicitud HTTP real no enviada. |
| QR-23 | NO EJECUTADO | No se reimprimió ninguna etiqueta; preservar identidad es regla aún por probar. |
| Visual (desktop/móvil) | BLOQUEADO / NO EJECUTADO | No se utilizó sesión autenticada verificada en esta intervención. |
| Financiero por rol/endpoint | NO VERIFICABLE | No se inspeccionaron todas las respuestas autenticadas, includes, exportaciones y genealogías. |
