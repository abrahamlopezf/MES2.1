# 06 — MATRIZ DE PROTECCIÓN Y CLASIFICACIÓN DE MASTER DATA (`extruder_formulas` vs. `extrusoras_formulas`) (FASE F)

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha:** 2026-11-26  
**Modo:** **Investigación en Modo Lectura (Sin crear tablas, sin modificar modelos y sin alterar triggers activos)**  
**Referencia Previa:** [`../03_MASTER_DATA_INTEGRITY.md`](../03_MASTER_DATA_INTEGRITY.md) y [`../closure-audit/08_DATABASE_SCHEMA_COMPARISON.md`](../closure-audit/08_DATABASE_SCHEMA_COMPARISON.md)

---

## 1. Diagnóstico Forense de `extruder_formulas` (`30` Declaradas vs. `29` Encontradas vs. `58` Triggers)

En la Fase F se solicitó determinar si la tabla declarada `extruder_formulas` corresponde a un modelo virtual, nombre obsoleto, tabla pendiente, tabla renombrada, vista o error de clasificación.

### 1.1 Hallazgo Definitivo Demostrado por Código y Catálogo PostgreSQL
Al inspeccionar `backend/src/modules/extrusion/models/extruderFormula.model.js` (líneas 1–41), `backend/src/database/models/index.js` y `information_schema.tables` en PostgreSQL:

```javascript
// backend/src/modules/extrusion/models/extruderFormula.model.js (líneas 2 y 36–40)
const ExtruderFormula = sequelize.define(
  'ExtruderFormula',
  { id, extruder_id, formula_id, is_allowed, notes },
  {
    tableName: 'extrusoras_formulas', // <-- Nombre físico real en español en PostgreSQL
    timestamps: true,
    underscored: true,
  }
);
```

- **Clasificación exacta:** **`Error de clasificación / traducción del nombre físico de tabla en MASTER_DATA_TABLES` (`backend/src/scripts/master-data-fingerprint.js`, línea 43).**
- **Explicación técnica:**
  1. El modelo Sequelize se llama `ExtruderFormula` (en inglés), pero su propiedad `tableName` apunta a la tabla física **`public.extrusoras_formulas`** (en español), la cual **sí existe físicamente** dentro de las `90` tablas del esquema `public` tanto en `sistema_enterprise` como en `sistema_enterprise_test`.
  2. Al construir `MASTER_DATA_TABLES` en `master-data-fingerprint.js`, se registró erróneamente `table: 'extruder_formulas'` en lugar de `table: 'extrusoras_formulas'`.
  3. Como consecuencia directa de ese nombre en inglés:
     - `master-data-fingerprint.js` reportó `extruder_formulas` con `exists: false, rowCount: 0, sha256: null` (`29` tablas físicas evaluadas de las `30` declaradas).
     - `setup-local-db-isolation.js` instaló los triggers `trg_qa_no_delete_*` y `trg_qa_no_truncate_*` únicamente sobre las `29` tablas cuyo nombre coincidió (`29 × 2 = 58` triggers), dejando a `public.extrusoras_formulas` sin los 2 triggers `[QA_MASTER_DATA_GUARD]`.
     - `provision-local-db-roles.js` (que leyó `MASTER_DATA_TABLES` desde `master-data-fingerprint.js`) excluyó a `29` tablas de los permisos `INSERT, UPDATE, DELETE` en QA, pero dejó a `public.extrusoras_formulas` dentro del grupo de las `61` tablas con permiso de escritura para `traceflow_app_test`.
- **Corrección documentada (lista para aplicar bajo autorización en `05_POSTGRESQL_PERMISSION_MATRIX.md`):**
  - Cambiar `'extruder_formulas'` por `'extrusoras_formulas'` en `master-data-fingerprint.js`, revocar `INSERT, UPDATE, DELETE` sobre `public.extrusoras_formulas` a `traceflow_app_test` e instalar sus 2 triggers `trg_qa_no_delete_extrusoras_formulas` y `trg_qa_no_truncate_extrusoras_formulas` (alcanzando **30 tablas físicas y 60 triggers**).

---

## 2. Matriz Completa de Protección por Tabla y Operación (Protección Preventiva vs. Detección SHA-256)

La siguiente matriz diferencia entre:
- **Protección Preventiva (Motor PostgreSQL):** Bloquea la operación *antes* de que modifique el dato (mediante permisos ACL de rol `REVOKE` o mediante triggers `BEFORE DELETE / TRUNCATE`).
- **Detección Posterior (Huella Criptográfica SHA-256):** Detecta cualquier alteración consumada al ejecutar `master-data-fingerprint.js` (`npm --prefix backend run db:verify:local`).

### 2.1 Estado en `sistema_enterprise_test` (Ambiente QA — Rol `traceflow_app_test`)

| Operación | 29 Tablas Maestras con Nombre Coincidente (`materials`, `formulas`, `looms`, `silos`, `roles`, etc.) | Tabla #30 `extrusoras_formulas` *(Declarada como `extruder_formulas`)* | Mecanismo Preventivo Activo en QA | ¿Detectado Posteriormente por SHA-256? |
| :--- | :--- | :--- | :--- | :---: |
| **`SELECT`** | ✅ **Permitido** | ✅ **Permitido** | `GRANT SELECT` a `traceflow_app_test`. | N/A (Lectura) |
| **`INSERT`** | 🛡️ **BLOQUEADO PREVENTIVAMENTE** (`42501 permission denied`) | ⚠️ **No bloqueado en QA actual** (`GRANT INSERT` activo) | Revocación ACL (`REVOKE INSERT`) en las 29 tablas. | ✅ **Sí** (en las 29 tablas) / ❌ No en `extrusoras_formulas` hasta corregir nombre |
| **`UPDATE`** | 🛡️ **BLOQUEADO PREVENTIVAMENTE** (`42501 permission denied`) | ⚠️ **No bloqueado en QA actual** (`GRANT UPDATE` activo) | Revocación ACL (`REVOKE UPDATE`) en las 29 tablas. | ✅ **Sí** (si modifica columna de `immutableCols`) |
| **`Soft-Delete` (`UPDATE is_active=false / deleted_at=NOW()`)** | 🛡️ **BLOQUEADO PREVENTIVAMENTE** (`42501 permission denied`) | ⚠️ **No bloqueado en QA actual** | Todo *soft-delete* es un `UPDATE`, rechazado por falta de privilegio `UPDATE` en `traceflow_app_test`. | ✅ **Sí** (`is_active` y `deleted_at` están incluidos en `immutableCols`) |
| **`DELETE`** | 🛡️ **DOBLE BLOQUEO PREVENTIVO** (ACL `42501` + Trigger `trg_qa_no_delete_*`) | ⚠️ **No bloqueado en QA actual** | 1. Falta de privilegio `DELETE` en `traceflow_app_test`.<br>2. Trigger `BEFORE DELETE FOR EACH ROW` (incluso si lo ejecuta el propietario `traceflow_qa_migrator`). | ✅ **Sí** |
| **`TRUNCATE`** | 🛡️ **DOBLE BLOQUEO PREVENTIVO** (ACL + Trigger `trg_qa_no_truncate_*`) | 🛡️ **Bloqueado por ACL** (`traceflow_app_test` no tiene privilegio `TRUNCATE`) | 1. `provision-local-db-roles.js` nunca otorgó `TRUNCATE` a `traceflow_app_test`.<br>2. Trigger `BEFORE TRUNCATE` en las 29 tablas. | ✅ **Sí** |
| **`ALTER TABLE` / `DROP TABLE`** | 🛡️ **BLOQUEADO PREVENTIVAMENTE** (`must be owner of table`) | 🛡️ **BLOQUEADO PREVENTIVAMENTE** (`must be owner of table`) | El propietario de las 90 tablas en QA es `traceflow_qa_migrator`, no `traceflow_app_test`. | ✅ **Sí** |
| **Acciones en Cascada (`ON DELETE CASCADE` / `ON UPDATE CASCADE`)** | 🛡️ **BLOQUEADO PREVENTIVAMENTE** | ⚠️ Pendiente de trigger en `extrusoras_formulas` | Ninguna tabla operativa padre tiene `ON DELETE CASCADE` que elimine registros de las 29 tablas maestras, y si se disparara un borrado en cascada, el trigger `BEFORE DELETE FOR EACH ROW` aborta la transacción. | ✅ **Sí** |

---

### 2.2 Estado en `sistema_enterprise` (Ambiente DEV — Rol `traceflow_app_local`)

| Operación | 24 Tablas Maestras de Entidad (`materials`, `formulas`, `looms`, `silos`, `roles`, etc.) | 6 Tablas Maestras Puente M:N (`role_permissions`, `material_tags`, `formula_ingredients`, `production_bom_items`, `laminado_spec_materials`, `globo_spec_materials`) | Estado Actual en DEV (`traceflow_app_local`) | Estado Propuesto en Plan SQL (`05_POSTGRESQL_PERMISSION_MATRIX.md`) |
| :--- | :--- | :--- | :--- | :--- |
| **`SELECT` / `INSERT` / `UPDATE` (y `Soft-Delete`)** | ✅ Permitido (para administración legítima de catálogos desde UI MES) | ✅ Permitido | Permitido en las 30 tablas; cualquier cambio se detecta con `db:verify:local` (SHA-256). | Conservar permitido para operación normal del MES en DEV. |
| **`DELETE` físico** | ⚠️ **Actualmente permitido en DEV** (`GRANT DELETE` sobre las 90 tablas) | ✅ Requerido por servicios cuando el usuario edita los ingredientes de una fórmula o BOM | `traceflow_app_local` puede ejecutar `DELETE` en DEV (no hay triggers `trg_qa_no_delete_*` en DEV). | **Revocar `DELETE` en las 24 tablas maestras de entidad** en DEV (forzando *soft-delete*) y conservar `DELETE` solo en las 6 tablas puente. |
| **`TRUNCATE`** | 🛡️ **BLOQUEADO PREVENTIVAMENTE** | 🛡️ **BLOQUEADO PREVENTIVAMENTE** | `traceflow_app_local` **NO** tiene privilegio `TRUNCATE` en `sistema_enterprise`. | Mantener bloqueado. |
| **`ALTER` / `DROP`** | 🛡️ **BLOQUEADO PREVENTIVAMENTE** | 🛡️ **BLOQUEADO PREVENTIVAMENTE** | El propietario en DEV es `traceflow_dev_migrator`, por lo que `traceflow_app_local` no puede alterar ni borrar tablas. | Mantener bloqueado. |

---

## 3. Análisis de Mecanismos de Evasión (`app.allow_master_data_mutation` y `session_replication_role`)

| Mecanismo de Evasión Analizado | ¿Cómo Funciona? | ¿Qué Roles Pueden Utilizado Hoy? | Estrategia de Cierre Definitivo |
| :--- | :--- | :--- | :--- |
| **1. `SET app.allow_master_data_mutation = 'on'`** | En PostgreSQL, cualquier parámetro de configuración con prefijo personalizado (`app.*`) puede ser establecido dentro de una sesión por **cualquier rol sin privilegios especiales** (`SET LOCAL app.allow_master_data_mutation = 'on'`).<br>En la función `public.tf_qa_protect_master_data()`, las primeras líneas evalúan:<br>`IF current_setting('app.allow_master_data_mutation', true) = 'on' THEN RETURN OLD/NEW; END IF;` | - **Para `traceflow_app_test` en las 29 tablas maestras:** Aunque `traceflow_app_test` ejecute `SET app.allow_master_data_mutation = 'on'`, **NO puede evadir la protección** porque PostgreSQL verifica los permisos ACL (`GRANT DELETE`) **antes** de disparar los triggers `BEFORE DELETE`, rechazando la consulta con `ERROR: permiso denegado a la tabla <tabla> (42501)`.<br>- **Para `traceflow_qa_migrator` o `postgres`:** Sí pueden usar `SET app.allow_master_data_mutation = 'on'` para saltarse el trigger. | Restringir la cláusula de bypass dentro de `tf_qa_protect_master_data()` para que exija simultáneamente que el usuario de sesión sea el rol migrador (`AND session_user IN ('traceflow_qa_migrator', 'traceflow_dev_migrator', 'postgres')`), de modo que ningún rol de aplicación pueda activar jamás esa bandera aunque tenga permiso DML. |
| **2. `SET session_replication_role = 'replica'`** | Desactiva el disparo de todos los triggers no-réplica (incluyendo `trg_qa_no_delete_*` y las llaves foráneas `FOREIGN KEY`) durante la sesión. | **Exclusivamente superusuarios (`postgres`).** Ni `traceflow_app_local`, ni `traceflow_app_test`, ni `traceflow_dev_migrator`, ni `traceflow_qa_migrator` pueden ejecutarlo (comprobado en vivo en `05_POSTGRESQL_PERMISSION_MATRIX.md`: `ERROR: se ha denegado el permiso para cambiar la opción «session_replication_role»`). | Mantener todos los roles de aplicación y de migración con `NOSUPERUSER` (`rolsuper = false`). |
| **3. `ALTER TABLE <tabla> DISABLE TRIGGER ALL`** | Desactiva los triggers instalados en la tabla. | **Exclusivamente el propietario de la tabla (`traceflow_dev_migrator` en DEV, `traceflow_qa_migrator` en QA) y `postgres`.** Los roles de aplicación (`traceflow_app_local`, `traceflow_app_test`) reciben `ERROR: debe ser dueño de la tabla`. | Mantener la propiedad de todas las tablas en manos del rol `*_migrator` y nunca usar el rol `*_migrator` en `backend/.env` de runtime o pruebas. |
| **4. Lectura de `.env.migrator.local` por un script o agente** | Si un script carga `backend/.env.migrator.local`, obtiene las credenciales de `traceflow_dev_migrator` / `traceflow_qa_migrator` que sí son dueños de las tablas. | Cualquier proceso local con acceso de lectura al archivo `backend/.env.migrator.local`. | 1. En QA (`sistema_enterprise_test`), los 58 triggers `BEFORE DELETE / TRUNCATE` se disparan **también contra el propietario `traceflow_qa_migrator`**.<br>2. Mantener la verificación obligatoria de `master-data-fingerprint.js` (`SHA-256: 36db9b70...e241`) en `dev:check` antes y después de cualquier tarea. |

---

## 4. Estrategia Integral: Administración Legítima de Catálogos en el MES vs. Bloqueo de Agentes y Pruebas

Para permitir que el sistema TraceFlow MES administre legítimamente sus catálogos cuando un usuario humano autorizado opera la aplicación, pero impedir que las pruebas automatizadas o los agentes alteren la Master Data del cliente:

1. **Separación Estricta de Credenciales por `APP_ENV` (`dbGuard.js`):**
   - Toda prueba automatizada (`node --test`, `npm test`, `npm run test:unit`, `npm run test:integration`) se ejecuta con `APP_ENV=test` $\rightarrow$ conecta forzosamente a `sistema_enterprise_test` con el rol `traceflow_app_test`.
   - En `sistema_enterprise_test`, las **30 tablas de Master Data tienen permiso `SELECT` únicamente** para `traceflow_app_test` (0 permisos `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`) más los 60 triggers `BEFORE DELETE / TRUNCATE`. Así, **es técnicamente imposible que una prueba altere un catálogo en QA**.
2. **Protección de Master Data en Desarrollo (`sistema_enterprise` — `APP_ENV=local`):**
   - El rol `traceflow_app_local` conserva `SELECT, INSERT, UPDATE` (y *soft-delete*) para que la interfaz web del MES funcione al 100%, pero se le revoca `DELETE` y `TRUNCATE` sobre las 24 tablas maestras de entidad.
   - Antes y después de cada unidad de trabajo de un agente, el comando `node backend/src/scripts/dev-check.js` compara el hash SHA-256 de las 30 tablas en `sistema_enterprise` contra la línea base inmutable (`36db9b70c666b2753d70b9fa87522f5cbf1309b8d9162dac3889b9a4693ee241`). Si un agente insertó o modificó un solo campo maestro en `sistema_enterprise`, `dev-check.js` falla inmediatamente e identifica la tabla exacta.
