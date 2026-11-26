# Protección de información financiera — estado de auditoría

## Evidencia revisada

- `backend/src/middlewares/financialAccess.middleware.js` limita el endpoint financiero que lo utiliza a `SUPERADMIN`, `ADMIN_GRAL`, `ADMIN_GENERAL`, `ADMIN`.
- `backend/src/shared/security/accessRules.js` concede `canViewCosts` a administradores de área además de roles globales; excluye supervisores.
- Extrusión, Globo y servicios de Almacén consultan esa regla para algunos campos de costo.

## Dictamen

La protección del dashboard financiero no demuestra por sí sola que todos los endpoints operativos aíslen correctamente costos y valuaciones. **Pendiente de comprobación por endpoint:** respuestas anidadas, detalles, exportaciones, reportes y rutas de escritura de cada módulo. No se cambió esa regla durante esta intervención porque la solicitud funcional autorizada aquí se limita a generación QR.

Prueba necesaria: sesiones QA de cada rol, inspección de JSON por ruta, validación de UI y prueba de acceso directo; comprobar que los roles de área reciben únicamente los campos financieros que la política de negocio autorice. No guardar tokens ni datos personales en evidencia.
