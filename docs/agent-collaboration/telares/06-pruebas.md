# Pruebas y validación — Telares

## Ejecutadas

Comando backend:

```powershell
node --test backend/test/telares.rules.test.js backend/test/telares.production-rules.test.js backend/src/modules/extrusion/services/shiftBalance.test.js backend/src/modules/extrusion/services/formulaColorRules.test.js backend/src/modules/extrusion/services/queueBatchRules.test.js backend/test/formulaMachinePolicy.test.js backend/test/siloConsumptionAllocator.test.js
```

Resultado observado: **35 tests, 35 aprobados, 0 fallidos**. Incluye reglas de ruta, bloqueo de BOM provisional, metros y peso obligatorios por salida, consumo/silo de Extrusión y balance de turno. Son pruebas unitarias y con mocks; no equivalen a E2E en base de datos.

Compilación frontend:

```powershell
npm run build
```

Resultado observado: **Vite compiló con éxito** (3589 módulos). Queda advertencia de bundle JavaScript grande: 3.20 MB sin comprimir, 830 KB gzip.

## No ejecutadas

- **Migraciones**: no se ejecutó `db:migrate` ni se escribió en una BD. La conexión local al PostgreSQL está bloqueada en este entorno (`connect EACCES 127.0.0.1:5432`).
- **E2E con navegador / multiusuario**: NOT RUN; no hay una base de pruebas aislada confirmada.
- **Validación real de backflush, transferencia y QR contra WIP**: NOT RUN; los tests con mocks no prueban concurrencia ni persistencia.
- **Neon / Render / Vercel**: sin cambios; no se desplegó.

La migración `20261031010000-seed-telares-banda-specs-and-routes.js` y `20261031120000-add-telares-roll-idempotency.js` deben revisarse y ejecutarse primero en una BD aislada por el equipo. No ejecutar directamente en producción antes de verificar el inventario de migraciones y el respaldo.
