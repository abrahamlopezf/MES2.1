# Cambios de implementación y hallazgos RBAC

## Implementado en esta intervención

| Cambio | Archivos |
|---|---|
| Allowlist backend para creación de lotes QR, delante de permisos existentes | `backend/src/modules/qrcodes/qrBatchAccess.js`, `backend/src/modules/qrcodes/qrcodes.routes.js` |
| Política unitaria del middleware | `backend/test/qrcodes-batch-access.test.js` |
| Helper y barrera de ruta frontend | `frontend/src/modules/qrcodes/access/qrBatchAccess.js`, `frontend/src/app/QrBatchManagerRoute.jsx`, `frontend/src/app/router.jsx` |
| Filtro explícito de navegación | `frontend/src/components/layout/Sidebar.jsx`, `frontend/src/modules/dashboard/pages/AreasPage.tsx`, `frontend/src/app/AdminDashboard.tsx` |

## Requiere autorización separada

1. Cambiar bypass de creación/consulta de usuarios para supervisores de Extrusión/Telares.
2. Migrar o retirar permisos persistidos `qr.create`/`qr.generate` antiguos de roles operativos.
3. Definir administradores de Telares, Laminado, Globo y Corte y sus cuentas; en la consulta local no aparecen cuentas activas para esos roles de administración.
4. Auditar endpoint por endpoint los datos financieros y el alcance de datos por área.
5. Probar API y UI autenticadas con perfiles de cada rol.

Las pruebas no autorizan aplicar otros cambios de permisos; no se modificó el esquema ni roles/usuarios en base de datos.
