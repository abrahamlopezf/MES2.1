# Requisitos RBAC por área

Consúltese [`docs/requirements/RBAC_AND_QR_BUSINESS_RULES.md`](../../requirements/RBAC_AND_QR_BUSINESS_RULES.md) para la matriz basada en consulta local y los hallazgos separados.

## Alcance de esta iteración

- **Implementado:** crear lotes vírgenes QR se restringe a Superadmin, administración general y administración de Almacén.
- **Conservado:** lectura, escaneo, asignación, consulta de genealogía y acciones productivas que vinculan códigos.
- **No ejecutado:** sesión visual autenticada para confirmar la navegación por cada rol.
- **Fuera de alcance:** cambios persistentes de permisos, creación de cuentas, reasignación de administradores, administración de usuarios y control de datos financieros por endpoint.

La autorización efectiva de `/api/qr/batches` se aplica en backend antes del permiso histórico. El acceso frontend es una medida de presentación y navegación complementaria.
