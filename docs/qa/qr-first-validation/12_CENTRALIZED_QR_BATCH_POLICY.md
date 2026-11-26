# Política de generación centralizada de lotes QR

## Política aplicada

`POST /api/qr/batches` permite únicamente estos códigos de rol: `SUPERADMIN`, `ADMIN`, `ADMIN_GRAL`, `ADMIN_GENERAL`, `ADMIN_ALM`, `ADMIN_ALMACEN`. Después del filtro, se ejecuta el middleware de permisos existente (`qr.generate` o `qr.create`). El rechazo es HTTP 403 con el código `QR_BATCH_MANAGEMENT_FORBIDDEN`.

En frontend, las rutas `/identity/generate` y `/identity/print` requieren el rol permitido y el permiso existente. Sidebar y “Áreas” ocultan el acceso a otros roles, incluso cuando una excepción heredada concede permisos generales a supervisores. El dashboard administrativo filtra los enlaces de generación e impresión según el mismo helper. Las rutas de impresión de lotes, múltiple y código individual también están restringidas en backend para impedir la emisión/reimpresión física fuera de Almacén.

## Rutas fuera del filtro

`/qr/lookup`, `/qr/scan`, `/qr/validate`, `/qr/assign`, lectura de lotes, eventos, cancelación y genealogía no reciben este nuevo bloqueo. No se debe reutilizar el filtro para impedir la operación QR normal de las áreas.

## Evidencia

- `backend/src/modules/qrcodes/qrBatchAccess.js`
- `backend/src/modules/qrcodes/qrcodes.routes.js`
- `backend/test/qrcodes-batch-access.test.js`
- `frontend/src/modules/qrcodes/access/qrBatchAccess.js`
- Copias originales y hashes previos al cambio: `evidence/pre-rbac-qr/` y `evidence/pre-rbac-qr/SHA256SUMS.txt`.

## Reversión

Revertir exclusivamente el middleware `requireQrBatchManager`, su import y el helper/test backend; retirar `QrBatchManagerRoute`, helper frontend y filtros `restrictToRoles`/`allowedRoles` agregados para `identity_gen`. Restaurar archivos frontend/backend desde `evidence/pre-rbac-qr/` solo si se confirma que no contienen modificaciones concurrentes posteriores, comparando antes sus hashes. No hay rollback de base de datos porque no se ejecutaron escrituras ni migraciones.
