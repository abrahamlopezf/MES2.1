# 07 — PLAN DE ALINEACIÓN DE ESQUEMAS DEV Y QA (`20261124130000`) (FASE G)

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha:** 2026-11-26  
**Modo:** **Análisis en Modo Lectura y Procedimiento Preparado (NO ejecutado sobre DEV)**  
**Referencia Previa:** [`../closure-audit/08_DATABASE_SCHEMA_COMPARISON.md`](../closure-audit/08_DATABASE_SCHEMA_COMPARISON.md)

---

## 1. Análisis Técnico Completo de la Migración `20261124130000-add-laminado-cut-transfer-confirmations.js`

| Dimensión Evaluada (Fase G) | Diagnóstico Verificado en Código y Base de Datos |
| :--- | :--- |
| **1. Confirmación de cambios entre DEV (`163`) y QA (`164`)** | Confirmado al 100%: la única migración presente en `sistema_enterprise_test.sequelize_meta` y ausente en `sistema_enterprise.sequelize_meta` es `20261124130000-add-laminado-cut-transfer-confirmations.js`. |
| **2. Compatibilidad con los modelos Sequelize actuales** | En `backend/src/modules/corte/models/corteLaminadoOrderItem.model.js` (modificado `M` en el árbol de trabajo), las 4 columnas (`dispatched_by`, `dispatched_at`, `received_by`, `received_at`) **ya están declaradas en el modelo Sequelize**. Por ello, el modelo actual es **100% compatible con QA (`164` migraciones)** e **incompatible con DEV (`163` migraciones)**. |
| **3. Compatibilidad con consultas Sequelize y servicios Corte/Laminado** | En `backend/src/modules/corte/corte.service.js`, `laminado.service.js` y `globo.service.js`, cada vez que Sequelize ejecuta `CorteLaminadoOrderItem.findAll()` o `CorteLaminadoOrder.findAll({ include: ['items'] })` sin restringir `attributes`, Sequelize genera `SELECT ..., "items"."dispatched_by", "items"."dispatched_at", "items"."received_by", "items"."received_at" FROM "corte_laminado_order_items"`.<br>**Hallazgo crítico:** En `sistema_enterprise` (DEV), donde aún no se ha aplicado la migración #164, **cualquier consulta a órdenes de proceso Corte-Laminado desde la aplicación falla actualmente con `SequelizeDatabaseError: no existe la columna items.dispatched_by`**. |
| **4. Impacto sobre registros existentes** | **Impacto nulo sobre datos existentes:** Las 4 columnas se agregan como `NULL` (`ADD COLUMN IF NOT EXISTS ... NULL`) sin valores por defecto costosos ni reescritura de tabla (`table rewrite`). Los registros existentes en `corte_laminado_order_items` conservan sus valores actuales intactos con `NULL` en los 4 campos nuevos. |
| **5. Impacto sobre estados ENUM** | Ejecuta `ALTER TYPE ... ADD VALUE IF NOT EXISTS` para agregar:<br>- `'EN_TRANSITO'`, `'PENDIENTE_TRANSFERENCIA'`, `'PENDIENTE_VENTA'` a `enum_traceable_items_status`.<br>- `'DESPACHO_TRANSFERENCIA'`, `'RECEPCION_TRANSFERENCIA'` a `enum_traceability_movements_movement_type`.<br>En PostgreSQL 18, `ADD VALUE IF NOT EXISTS` es idempotente y no invalida ningún registro existente. |
| **6. Riesgo de bloqueo (Table Locking)** | **Muy Bajo (< 50 ms):** `ALTER TABLE ... ADD COLUMN ... NULL` sin default volátil solo adquiere un `ACCESS EXCLUSIVE` lock instantáneo en catálogo; y `CREATE INDEX IF NOT EXISTS corte_laminado_items_transfer_queue_idx` es un índice parcial sobre una tabla pequeña. |
| **7. Compatibilidad con futuras migraciones** | **Alta:** Su prefijo cronológico (`20261124130000`) es el último de la carpeta `backend/src/database/migrations/` (posterior a `20261124120000-single-laminado-master-catalog.js`, que ya está aplicada en DEV y QA). |
| **8. Capacidad de reversión (`down`) y limitación de PostgreSQL** | El método `down(queryInterface)` elimina el índice `corte_laminado_items_transfer_queue_idx` y elimina las 4 columnas (`DROP COLUMN IF EXISTS received_at, received_by, dispatched_at, dispatched_by`).<br>**Nota técnica sobre ENUMs:** En PostgreSQL no existe `ALTER TYPE ... DROP VALUE`; por lo tanto, `down()` revierte al 100% la tabla `corte_laminado_order_items` y el registro en `sequelize_meta`, mientras que las 5 etiquetas adicionales permanecen de forma inocua en los tipos ENUM. |
| **9. Requisitos de respaldo previo** | Existencia verificada del respaldo reciente `backend/tmp/db-role-baseline-20261126/sistema_enterprise.dump` (`2,288,723 B`) y verificación previa/posterior con `npm --prefix backend run db:verify:local`. |

---

## 2. Procedimiento Específico para Aplicar Posteriormente la Migración #164 en DEV (NO Ejecutado)

Cuando el responsable técnico autorice igualar `sistema_enterprise` (DEV) a `164` migraciones para que coincida con los modelos actuales del árbol de trabajo y con `sistema_enterprise_test` (QA), deberá ejecutarse exactamente la siguiente secuencia:

```powershell
# 1. Verificar estado inicial y huella SHA-256 de Master Data (debe ser 36db9b70...e241)
node backend/src/scripts/dev-check.js

# 2. Generar respaldo fresco de DEV antes de migrar
npm --prefix backend run db:backup:local

# 3. Cargar credenciales del rol propietario de esquema DEV (traceflow_dev_migrator)
#    y ejecutar exclusivamente la migración pendiente sobre sistema_enterprise
node -e "
const fs = require('fs');
const { execFileSync } = require('child_process');
const dotenv = require('./backend/node_modules/dotenv');
const mig = dotenv.parse(fs.readFileSync('backend/.env.migrator.local'));
const childEnv = {
  ...process.env,
  APP_ENV: 'local',
  NODE_ENV: 'development',
  DB_HOST: '127.0.0.1',
  DB_PORT: '5432',
  DB_NAME: 'sistema_enterprise',
  DB_USER: mig.TRACEFLOW_DEV_MIGRATOR_USER,
  DB_PASSWORD: mig.TRACEFLOW_DEV_MIGRATOR_PASSWORD
};
execFileSync('npx.cmd', ['sequelize-cli', 'db:migrate', '--env', 'development'], {
  cwd: 'backend',
  env: childEnv,
  stdio: 'inherit'
});
"

# 4. Verificar que dev-check reporte 164 migraciones en DEV == 164 en QA y SHA-256 intacto
node backend/src/scripts/dev-check.js
```

### 2.1 Procedimiento de Reversión en DEV (Si se requiriera deshacer la migración #164)

```powershell
node -e "
const fs = require('fs');
const { execFileSync } = require('child_process');
const dotenv = require('./backend/node_modules/dotenv');
const mig = dotenv.parse(fs.readFileSync('backend/.env.migrator.local'));
const childEnv = {
  ...process.env,
  APP_ENV: 'local',
  NODE_ENV: 'development',
  DB_HOST: '127.0.0.1',
  DB_PORT: '5432',
  DB_NAME: 'sistema_enterprise',
  DB_USER: mig.TRACEFLOW_DEV_MIGRATOR_USER,
  DB_PASSWORD: mig.TRACEFLOW_DEV_MIGRATOR_PASSWORD
};
execFileSync('npx.cmd', [
  'sequelize-cli',
  'db:migrate:undo',
  '--name',
  '20261124130000-add-laminado-cut-transfer-confirmations.js',
  '--env',
  'development'
], {
  cwd: 'backend',
  env: childEnv,
  stdio: 'inherit'
});
"
```
