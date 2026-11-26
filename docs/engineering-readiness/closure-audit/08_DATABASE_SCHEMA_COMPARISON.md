# 08 — COMPARACIÓN PROFUNDA DE ESQUEMAS, ROLES Y TRIGGERS POSTGRESQL (FASE H)

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha de Auditoría:** 2026-11-25  
**Modo de Ejecución:** **100% SOLO LECTURA (`SELECT` sobre `information_schema` y `pg_catalog`)**  
**Bases Comparadas en `127.0.0.1:5432`:** `sistema_enterprise` (`APP_ENV=local`) vs. `sistema_enterprise_test` (`APP_ENV=test`)

---

## 1. Investigación de la Diferencia de Migraciones (`163` vs. `164`)

Al consultar la tabla `public.sequelize_meta` en ambas bases de datos:
- **`sistema_enterprise` (Desarrollo Local):** `163` migraciones registradas.
- **`sistema_enterprise_test` (Pruebas / QA Local):** `164` migraciones registradas.
- **Migraciones presentes solo en `sistema_enterprise`:** `0` (`[]`).
- **Migración adicional presente solo en `sistema_enterprise_test`:**  
  **`20261124130000-add-laminado-cut-transfer-confirmations.js`**

### 1.1 Ficha Técnica Completa de la Migración Adicional

| Atributo | Detalle Verificado en Código y Catálogo de PostgreSQL |
| :--- | :--- |
| **Nombre del archivo** | `backend/src/database/migrations/20261124130000-add-laminado-cut-transfer-confirmations.js` (`1,681 bytes`, estado Git: `??` no rastreado, parte de los 19 archivos funcionales preexistentes). |
| **Propósito funcional** | Soportar el flujo de confirmación de doble paso (despacho desde Laminado/origen y recepción confirmada en Corte) para los ítems de órdenes de proceso entre Corte y Laminado. |
| **Tablas afectadas** | `public.corte_laminado_order_items` (y los tipos ENUM utilizados por `traceable_items` y `traceability_movements`). |
| **Columnas añadidas (`+4`)** | En `corte_laminado_order_items`:<br>1. `dispatched_by INTEGER NULL`<br>2. `dispatched_at TIMESTAMPTZ NULL`<br>3. `received_by INTEGER NULL`<br>4. `received_at TIMESTAMPTZ NULL` |
| **Valores ENUM añadidos (`+5`)** | - En `enum_traceable_items_status`: `'EN_TRANSITO'`, `'PENDIENTE_TRANSFERENCIA'`, `'PENDIENTE_VENTA'`.<br>- En `enum_traceability_movements_movement_type`: `'DESPACHO_TRANSFERENCIA'`, `'RECEPCION_TRANSFERENCIA'`. |
| **Índices añadidos (`+1`)** | `corte_laminado_items_transfer_queue_idx`:<br>`CREATE INDEX corte_laminado_items_transfer_queue_idx ON public.corte_laminado_order_items USING btree (status, updated_at DESC) WHERE status IN ('AWAITING_DISPATCH', 'IN_TRANSIT')` |
| **Restricciones y Relaciones (FKs)** | **`0` restricciones nuevas.** Observación técnica importante: las columnas `dispatched_by` y `received_by` fueron declaradas como `INTEGER NULL` sin cláusula `REFERENCES users(id)` en la migración. |
| **Motivo de la diferencia** | El desarrollador que trabajaba en el flujo Corte-Laminado modificó el modelo `corteLaminadoOrderItem.model.js` y `corte.service.js`, y creó el archivo de migración `20261124130000-...`, pero aún no había ejecutado `db:migrate` sobre `sistema_enterprise`. Durante la Fase 6 de la intervención anterior, `sistema_enterprise_test` se restauró desde el dump de `sistema_enterprise` (`163` migraciones); al correr `corteLaminadoFlow.local.integration.test.js` sobre `sistema_enterprise_test`, Sequelize lanzó `error: no existe la columna CorteLaminadoOrderItem.dispatched_by`, por lo que se aplicó la migración pendiente **únicamente en `sistema_enterprise_test`** sin tocar `sistema_enterprise`. |
| **Impacto funcional y riesgo para la validez de las pruebas** | 1. En `sistema_enterprise_test`, el esquema coincide con los modelos Sequelize actuales en el árbol de trabajo (`corteLaminadoOrderItem.model.js`), lo que permite que las consultas Sequelize sobre `CorteLaminadoOrderItem` no fallen por columnas faltantes.<br>2. Sin embargo, en `sistema_enterprise` (Desarrollo), cualquier llamada en vivo al módulo de Corte que intente proyectar `dispatched_by`, `dispatched_at`, `received_by` o `received_at` fallará con error SQL `42703 (undefined_column)` hasta que el desarrollador aplique esa migración en `sistema_enterprise`. |

---

## 2. Comparación Completa de Esquemas (`sistema_enterprise` vs. `sistema_enterprise_test`)

Se compararon todos los objetos del esquema `public` entre ambas bases de datos:

| Tipo de Objeto en Esquema `public` | `sistema_enterprise` (Dev) | `sistema_enterprise_test` (Test) | Diferencia Neta | Clasificación de la Diferencia |
| :--- | :---: | :---: | :---: | :--- |
| **Tablas Base (`BASE TABLE`)** | `90` | `90` | `0` | **100% Idénticas** |
| **Columnas Totales (`information_schema.columns`)** | `1,243` | `1,247` | `+4` en Test | **Diferencia de Esquema Funcional** (las 4 columnas de `corte_laminado_order_items` de la migración #164; las otras `1,243` columnas tienen tipos, nulabilidad y defaults 100% idénticos). |
| **Valores de Tipos ENUM (`pg_enum`)** | `107` | `112` | `+5` en Test | **Diferencia de Esquema Funcional** (los 5 valores ENUM de la migración #164). |
| **Índices (`pg_indexes`)** | `2,263` | `2,264` | `+1` en Test | **Diferencia de Esquema Funcional** (`corte_laminado_items_transfer_queue_idx` de la migración #164). |
| **Restricciones (`PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`)** | `4,297` | `4,297` | `0` | **100% Idénticas** |
| **Triggers de Dominio Operativo (`pg_trigger`)** | `7` | `7` | `0` | **100% Idénticos** (`trg_traceflow_superadmin_new_permission`, `trg_traceflow_superadmin_new_role`, `silo_receipt_lots_fifo_balance_guard` [INSERT/UPDATE/DELETE], `silos_fifo_balance_guard` [INSERT/UPDATE]). |
| **Triggers de Protección QA (`trg_qa_no_*`)** | `0` | **`58`** (`29 DELETE` + `29 TRUNCATE`) | `+58` en Test | **Cambio Intencional de Aislamiento y Protección QA** (instalados exclusivamente en `sistema_enterprise_test`). |
| **Registro `ENVIRONMENT_IDENTITY` en `system_settings`** | `0` filas | `1` fila (`TEST_QA_LOCAL`) | `+1` fila en Test | **Cambio Intencional de Identificación de Ambiente** (`system_settings` no forma parte de las 30 tablas de Master Data). |
| **Filas y Huella SHA-256 de las 30 Tablas de Master Data** | `2,928` filas (`36db9b70...e241`) | `2,928` filas (`36db9b70...e241`) | **`0` diferencias** | **100% Paridad Criptográfica Exacta** |

---

## 3. Auditoría de Roles PostgreSQL, Privilegios Efectivos y `PUBLIC`

Se inspeccionaron `pg_roles`, `pg_auth_members`, `pg_database.datacl`, `pg_namespace.nspacl`, `pg_tables.tableowner` e `information_schema.role_table_grants`:

### 3.1 Atributos de los Roles (`pg_roles`) y Membresías (`pg_auth_members`)

| Rol PostgreSQL | `rolsuper` | `rolinherit` | `rolcreaterole` | `rolcreatedb` | `rolcanlogin` | `rolbypassrls` | Membresías (`pg_auth_members`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `postgres` | `true` | `true` | `true` | `true` | `true` | `true` | Ninguna |
| `traceflow_app_local` | `false` | `true` | `false` | `false` | `true` | `false` | Ninguna (`0` roles heredados) |
| `traceflow_app_test` | `false` | `true` | `false` | `false` | `true` | `false` | Ninguna (`0` roles heredados) |
| `traceflow_migrator` | `false` | `true` | `false` | `false` | `true` | `false` | Ninguna (`0` roles heredados) |

### 3.2 Hallazgos Críticos en Permisos Efectivos, Propiedad de Objetos y `PUBLIC`

1. **Permisos heredados a través de `PUBLIC` a nivel de base de datos (`pg_database.datacl`):**
   - `sistema_enterprise`: `{=Tc/postgres,postgres=CTc/postgres,traceflow_app_local=c/postgres,traceflow_migrator=c/postgres}`
   - `sistema_enterprise_test`: `{=Tc/postgres,postgres=CTc/postgres,traceflow_app_test=c/postgres,traceflow_migrator=c/postgres}`
   - **Diagnóstico:** La entrada `=Tc/postgres` significa que el pseudo-rol `PUBLIC` (del cual heredan implícitamente todos los roles en PostgreSQL) conserva los privilegios `CONNECT` (`c`) y `TEMPORARY` (`T`) sobre ambas bases de datos. Por lo tanto, aunque se ejecutó `REVOKE ALL ON DATABASE sistema_enterprise FROM traceflow_app_test`, **`traceflow_app_test` aún puede autenticarse y abrir conexión hacia `sistema_enterprise` vía `PUBLIC`** a menos que se ejecute `REVOKE CONNECT ON DATABASE sistema_enterprise FROM PUBLIC;`.
2. **Permisos sobre tablas en `sistema_enterprise` vs. `sistema_enterprise_test` (`role_table_grants`):**
   - En `sistema_enterprise_test`, tanto `traceflow_app_test` como `traceflow_migrator` tienen permisos `SELECT`, `INSERT`, `UPDATE`, `DELETE` explícitos sobre las `90` tablas del esquema `public`.
   - En `sistema_enterprise`, `tableGrantsDev` está vacío (`0` tablas otorgadas a `traceflow_app_local` y `traceflow_migrator`) porque `setup-local-db-isolation.js` ejecutó los `GRANT ... ON ALL TABLES IN SCHEMA public` únicamente conectado a `sistema_enterprise_test`.
3. **Propiedad de objetos (`tableowner`) y usuario activo en `backend/.env`:**
   - Las `90` tablas en ambas bases de datos y la función `public.tf_qa_protect_master_data()` tienen como propietario (`owner`) a `postgres`.
   - Actualmente, `backend/.env` utiliza `DB_USER=postgres` (superusuario). Mientras la aplicación o las pruebas se conecten como `postgres`, los controles de permisos basados en `GRANT`/`REVOKE` de roles no se aplican (un superusuario omite todos los chequeos de ACL), quedando la protección en manos de `dbGuard.js` y de los triggers PL/pgSQL.

*(Conforme a las instrucciones de la Fase H, no se realizaron cambios de permisos durante esta auditoría; la corrección exacta queda documentada para autorización humana).*

---

## 4. Auditoría de los 58 Triggers de Protección de Master Data (`[QA_MASTER_DATA_GUARD]`)

### 4.1 ¿Por qué existen 58 triggers para 30 tablas maestras?
1. En `backend/src/scripts/master-data-fingerprint.js` se declararon **30 tablas** dentro de `MASTER_DATA_TABLES`.
2. Al contrastar esas 30 tablas contra `information_schema.tables` en PostgreSQL:
   - **29 tablas existen físicamente** en el esquema `public` (`areas`, `extruders`, `formula_ingredients`, `formulas`, `globo_specification_materials`, `globo_specifications`, `laminado_specification_materials`, `laminado_specifications`, `looms`, `material_brands`, `material_codes`, `material_families`, `material_locations`, `material_tags`, `material_types`, `material_units`, `materials`, `permissions`, `production_bom_items`, `production_boms`, `pti_products`, `rankings`, `role_permissions`, `roles`, `silos`, `subareas`, `suppliers`, `tags`, `tipos_baja`).
   - **1 tabla (`extruder_formulas`) NO existe como tabla física en PostgreSQL** (`exists: false, rowCount: 0, sha256: null`), ya que las máquinas permitidas/restringidas por fórmula se almacenan en las columnas `allowed_extruders` y `restricted_extruders` de la tabla `formulas`.
3. Sobre cada una de las **29 tablas físicas existentes**, `setup-local-db-isolation.js` instaló **2 triggers** en `pg_trigger`:
   - `trg_qa_no_delete_<tabla>`: `BEFORE DELETE ON public.<tabla> FOR EACH ROW EXECUTE FUNCTION tf_qa_protect_master_data()` (`29` triggers).
   - `trg_qa_no_truncate_<tabla>`: `BEFORE TRUNCATE ON public.<tabla> FOR EACH STATEMENT EXECUTE FUNCTION tf_qa_protect_master_data()` (`29` triggers).
4. Total: $29 \text{ tablas existentes} \times 2 \text{ triggers por tabla} = \mathbf{58 \text{ triggers}}$ en `pg_trigger`. *(Nota técnica: la vista estándar SQL `information_schema.triggers` muestra solo los 29 triggers `DELETE` porque `TRUNCATE` es una extensión de PostgreSQL al estándar SQL; la tabla de catálogo nativo `pg_catalog.pg_trigger` confirma los **58 triggers activos**).*

### 4.2 Matriz de Operaciones Protegidas vs. No Protegidas por los 58 Triggers

| Operación sobre Tabla Maestra en `sistema_enterprise_test` | ¿Bloqueada por los 58 Triggers? | ¿Detectada por `master-data-fingerprint.js` (SHA-256)? | Explicación Técnica |
| :--- | :---: | :---: | :--- |
| **`DELETE` directo** (`DELETE FROM materials WHERE ...`) | ✅ **SÍ (Bloqueado)** | ✅ **SÍ** | `trg_qa_no_delete_*` (`BEFORE DELETE FOR EACH ROW`) aborta la transacción con `ERRCODE 42501 [QA_MASTER_DATA_GUARD]`. |
| **`TRUNCATE` directo o en cascada** (`TRUNCATE materials CASCADE`) | ✅ **SÍ (Bloqueado)** | ✅ **SÍ** | `trg_qa_no_truncate_*` (`BEFORE TRUNCATE FOR EACH STATEMENT`) aborta el comando antes de vaciar la tabla. |
| **Acciones `ON DELETE CASCADE` desde tabla padre** | ✅ **SÍ (Bloqueado)** | ✅ **SÍ** | En PostgreSQL, los borrados en cascada disparan los triggers `BEFORE DELETE FOR EACH ROW` de la tabla hija, abortando la operación. |
| **`INSERT` de nuevos registros maestros** | ❌ **NO** | ✅ **SÍ (Detectado)** | El trigger solo intercepta `TG_OP = 'DELETE'` o `'TRUNCATE'`. Un `INSERT` cambiaría `rowCount` y el hash SHA-256 en `master-data-fingerprint.js`. |
| **`UPDATE` de columnas maestras** (ej. cambiar `code`, `name`, `is_active`, `deleted_at` / soft-delete) | ❌ **NO** | ✅ **SÍ (Detectado)** | Un `UPDATE` (incluyendo un *soft-delete* que actualice `is_active = false` o `deleted_at = NOW()`) no es bloqueado por el trigger, pero **sí invalida inmediatamente el hash SHA-256** de la tabla en `master-data-fingerprint.js`. |
| **`ALTER TABLE` / `DROP TABLE` (DDL)** | ❌ **NO** | ✅ **SÍ (Detectado)** | Los triggers DML no interceptan sentencias DDL (`ALTER`/`DROP`). |
| **Operaciones con variable de sesión `SET app.allow_master_data_mutation = 'on'`** | ❌ **NO (Bypass deliberado)** | ✅ **SÍ (Detectado)** | La función `tf_qa_protect_master_data()` incluye una compuerta `IF current_setting('app.allow_master_data_mutation', true) = 'on' THEN RETURN OLD/NEW`. |
| **Desactivación de triggers (`ALTER TABLE ... DISABLE TRIGGER` o `SET session_replication_role = 'replica'`)** | ❌ **NO (Si se conecta como superusuario `postgres`)** | ✅ **SÍ (Detectado)** | Como `DB_USER=postgres` es superusuario y dueño de las tablas, puede cambiar `session_replication_role` o deshabilitar triggers. |

### 4.3 Evaluación del Cálculo Determinista SHA-256 (`master-data-fingerprint.js`)
- **Determinismo:** **100% determinista.** Ordena explícitamente las columnas (`immutableCols`) y las filas (`ORDER BY id ASC` o clave compuesta), serializa fechas a ISO-8601 (`val.toISOString()`) y construye objetos JSON con claves en orden fijo antes de calcular SHA-256.
- **Localización por tabla:** `compareFingerprints(baseline, current)` compara tabla por tabla (`rowCount` y `sha256` individual), permitiendo identificar exactamente qué tabla maestra sufrió una inserción, actualización o eliminación.
- **Alcance y limitación:** Cubre las **30 tablas maestras** (`2,928` filas), excluyendo deliberadamente columnas operativas mutables (como `silos.current_stock_kg`) y las outras `61` tablas transaccionales/operativas (`lotes`, `inventories`, `consumption_orders`, `extruder_queues`, `wip_inventories`, `users`, etc.). Por ello, **la integridad de Master Data certifica que los catálogos del cliente están intactos, pero no reemplaza las pruebas funcionales sobre tablas transaccionales**.
