# 05 — MATRIZ DEFINITIVA DE PRIVILEGIOS POSTGRESQL Y PLAN SQL DE CORRECCIÓN (FASE E)

**Proyecto:** TraceFlow MES — INTERPLAS México  
**Fecha de Auditoría:** 2026-11-26  
**Modo:** **100% SOLO LECTURA (Plan SQL documentado y NO ejecutado)**  
**Referencia Previa:** [`../closure-audit/08_DATABASE_SCHEMA_COMPARISON.md`](../closure-audit/08_DATABASE_SCHEMA_COMPARISON.md) y `backend/src/scripts/provision-local-db-roles.js`

---

## 1. Estado Actual Verificado de Roles, Membresías y Propiedad (`pg_roles`, `pg_database`, `pg_namespace`)

Tras la ejecución por Codex de `provision-local-db-roles.js --apply` (`06:12Z`), se auditó en vivo el catálogo de PostgreSQL (`127.0.0.1:5432`):

### 1.1 Roles Existentes y Atributos

| Rol PostgreSQL | `rolsuper` | `rolcanlogin` | `rolcreatedb` | `rolcreaterole` | `rolbypassrls` | Membresías (`pg_auth_members`) | Propósito Actual |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `postgres` | `true` | `true` | `true` | `true` | `true` | Ninguna | Superusuario administrativo del clúster local (`owner` de las bases de datos). |
| `traceflow_app_local` | `false` | `true` | `false` | `false` | `false` | Ninguna | Rol de runtime para la aplicación en `sistema_enterprise` (`APP_ENV=local`). |
| `traceflow_dev_migrator` | `false` | `true` | `false` | `false` | `false` | Ninguna | Propietario (`owner`) de las `90` tablas, secuencias, tipos y funciones en `sistema_enterprise`. |
| `traceflow_app_test` | `false` | `true` | `false` | `false` | `false` | Ninguna | Rol de runtime/pruebas para `sistema_enterprise_test` (`APP_ENV=test`). |
| `traceflow_qa_migrator` | `false` | `true` | `false` | `false` | `false` | Ninguna | Propietario (`owner`) de las `90` tablas, secuencias, tipos y funciones en `sistema_enterprise_test`. |
| `traceflow_migrator` | `false` | **`false` (`NOLOGIN`)** | `false` | `false` | `false` | Ninguna | Rol genérico anterior deshabilitado (`NOLOGIN`) para evitar compartir credenciales entre DEV y QA. |

---

## 2. Matriz Comparativa: Privilegios Actuales vs. Privilegios Mínimos Requeridos

| Ámbito / Recurso | Rol / Sujeto | Privilegios Actuales en `sistema_enterprise` (DEV) | Privilegios Actuales en `sistema_enterprise_test` (QA) | Privilegio Mínimo Requerido | Brecha o Riesgo Residual Detectado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Nivel Base de Datos (`pg_database.datacl`)** | `PUBLIC` | **`NINGUNO`** *(Revocado `CONNECT` y `TEMPORARY`)* | **`NINGUNO`** *(Revocado `CONNECT` y `TEMPORARY`)* | Ninguno | ✅ **Cerrado.** |
| | `traceflow_app_local` | `CONNECT` (`c`) | `NINGUNO` *(Bloqueado)* | `CONNECT` solo en DEV | ✅ **Cerrado** (Prueba negativa verificada: `permiso denegado a la base de datos sistema_enterprise_test`). |
| | `traceflow_app_test` | `NINGUNO` *(Bloqueado)* | `CONNECT` (`c`) | `CONNECT` solo en QA | ✅ **Cerrado** (Prueba negativa verificada: `permiso denegado a la base de datos sistema_enterprise`). |
| | `traceflow_dev_migrator` | `CONNECT, TEMPORARY` (`Tc`) | `NINGUNO` | `CONNECT, TEMPORARY` solo en DEV | ✅ **Cerrado.** |
| | `traceflow_qa_migrator` | `NINGUNO` | `CONNECT, TEMPORARY` (`Tc`) | `CONNECT, TEMPORARY` solo en QA | ✅ **Cerrado.** |
| **Esquema `public` (`pg_namespace.nspacl`)** | `PUBLIC` | **`NINGUNO`** *(Revocado `USAGE` y `CREATE`)* | **`NINGUNO`** *(Revocado `USAGE` y `CREATE`)* | Ninguno | ✅ **Cerrado.** |
| | `traceflow_app_local` / `_test` | `USAGE` (`U`) en su base respectiva | `USAGE` (`U`) en su base respectiva | `USAGE` (sin `CREATE`) | ✅ **Cerrado** (Ningún rol de aplicación puede crear tablas en `public`). |
| | `traceflow_migrator` (legacy) | Ninguno | **`USAGE` (`U`) residual** | Ninguno (rol retirado) | ⚠️ **Brecha Menor 1:** Revocar el `USAGE` residual de `traceflow_migrator` en `sistema_enterprise_test` y eliminar el rol si ya no posee objetos. |
| **Propiedad de Objetos (`tableowner`) y Capacidad de Modificar Triggers** | `traceflow_dev_migrator` / `traceflow_qa_migrator` | Dueño de las `90` tablas en DEV | Dueño de las `90` tablas en QA | Solo el migrador del ambiente posee tablas y funciones | ✅ **Cerrado** (Prueba negativa verificada: `traceflow_app_test` no puede ejecutar `ALTER TABLE ... DISABLE TRIGGER` ni `DROP TRIGGER`). |
| **Tablas de Master Data (`29` tablas + `extrusoras_formulas`)** | `traceflow_app_local` (DEV) | `SELECT, INSERT, UPDATE, DELETE` en las `90` tablas (sin `TRUNCATE`) | N/A | `SELECT, INSERT, UPDATE` en catálogos administrables desde UI MES; **sin `DELETE` físico** (el MES usa *soft-delete* `is_active = false` / `deleted_at`) | ⚠️ **Brecha 2:** En DEV, `traceflow_app_local` tiene `DELETE` sobre las 30 tablas de Master Data (salvo tablas puente que requieran reemplazo como `role_permissions`, `material_tags`, `formula_ingredients`, `production_bom_items`, `laminado_specification_materials`, `globo_specification_materials`). |
| | `traceflow_app_test` (QA) | N/A | **`SELECT` únicamente en `29` tablas maestras** (`0` permisos `INSERT/UPDATE/DELETE`), **PERO tiene `SELECT, INSERT, UPDATE, DELETE` en `extrusoras_formulas`** | `SELECT` únicamente en las **30** tablas maestras reales (incluyendo `extrusoras_formulas`) | ⚠️ **Brecha 3:** Por la discrepancia de nombre `extruder_formulas` vs `extrusoras_formulas` en `MASTER_DATA_TABLES` (ver `06_MASTER_DATA_PROTECTION_MATRIX.md`), la tabla física `extrusoras_formulas` quedó en el grupo de `61` tablas con `INSERT, UPDATE, DELETE` para `traceflow_app_test` en QA. |
| **Tablas Operativas / Transaccionales (`60` tablas)** | `traceflow_app_local` / `traceflow_app_test` | `SELECT, INSERT, UPDATE, DELETE` (sin `TRUNCATE`) | `SELECT, INSERT, UPDATE, DELETE` (sin `TRUNCATE`) | `SELECT, INSERT, UPDATE` y `DELETE` solo en tablas de detalle/cola que el código borra legítimamente | ⚠️ **Brecha 4:** Tablas de auditoría inmutable (`audit_logs`, `traceability_events`, `traceability_movements`, `inventory_movements`, `sequelize_meta`) tienen `DELETE` y `UPDATE` otorgados al rol de aplicación en DEV y QA. |
| **Secuencias (`83` secuencias en `public`)** | `traceflow_app_local` / `traceflow_app_test` | `USAGE, SELECT, UPDATE` en las `83` secuencias | `USAGE, SELECT, UPDATE` en las `83` secuencias | `USAGE, SELECT` en DEV; en QA solo sobre secuencias de tablas operativas (o `USAGE, SELECT` general, ya que sin `INSERT` en la tabla maestra no puede insertar filas) | ✅ Aceptable (`nextval` sin `INSERT` en la tabla maestra no altera datos maestros). |
| **Privilegios Predeterminados (`pg_default_acl`)** | `traceflow_dev_migrator` / `traceflow_qa_migrator` | `arwd` (`SELECT, INSERT, UPDATE, DELETE`) en tablas nuevas para `traceflow_app_local`; `rU` en secuencias | `r` (`SELECT`) en tablas nuevas para `traceflow_app_test`; `rU` en secuencias; `X` en funciones | Coherente con perfil DEV (lectura/escritura) y QA (solo lectura por defecto en tablas nuevas hasta clasificarlas) | ✅ **Cerrado.** |

---

## 3. Plan SQL Documentado de Corrección Fina (NO Ejecutado — Requiere Autorización)

### 3.1 Precondiciones
1. Confirmar que ningún servidor Express ni suite de pruebas esté ejecutándose.
2. Verificar la existencia del respaldo previo en `backend/tmp/db-role-baseline-20261126/` y verificar `npm --prefix backend run db:verify:local` (`SHA-256: 36db9b70...e241`).
3. Conectarse con el rol propietario de cada base (`traceflow_dev_migrator` en DEV y `traceflow_qa_migrator` en QA) o `postgres`.

### 3.2 Comandos SQL Propuestos (Para Ejecución Posterior Autorizada)

```sql
-- ============================================================================
-- BLOQUE 1: Ejecutar en sistema_enterprise_test (QA)
-- Objetivo:
--   1. Proteger la tabla física real "extrusoras_formulas" revocando escrituras
--      a traceflow_app_test e instalando sus 2 triggers [QA_MASTER_DATA_GUARD].
--   2. Revocar DELETE y UPDATE sobre sequelize_meta y audit_logs para traceflow_app_test.
--   3. Limpiar el permiso USAGE residual del rol deshabilitado traceflow_migrator.
-- ============================================================================
BEGIN;

-- 1.1 Revocar INSERT, UPDATE, DELETE sobre extrusoras_formulas en QA
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public."extrusoras_formulas" FROM traceflow_app_test;

-- 1.2 Instalar los 2 triggers de protección QA sobre extrusoras_formulas (completando 60 triggers en las 30 tablas)
DROP TRIGGER IF EXISTS trg_qa_no_delete_extrusoras_formulas ON public."extrusoras_formulas";
CREATE TRIGGER trg_qa_no_delete_extrusoras_formulas
  BEFORE DELETE ON public."extrusoras_formulas"
  FOR EACH ROW EXECUTE FUNCTION public.tf_qa_protect_master_data();

DROP TRIGGER IF EXISTS trg_qa_no_truncate_extrusoras_formulas ON public."extrusoras_formulas";
CREATE TRIGGER trg_qa_no_truncate_extrusoras_formulas
  BEFORE TRUNCATE ON public."extrusoras_formulas"
  FOR EACH STATEMENT EXECUTE FUNCTION public.tf_qa_protect_master_data();

-- 1.3 Proteger tabla de control de migraciones y bitácora de auditoría contra borrado por el rol de app
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public."sequelize_meta" FROM traceflow_app_test;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public."audit_logs" FROM traceflow_app_test;

-- 1.4 Revocar USAGE residual del rol legacy deshabilitado traceflow_migrator
REVOKE ALL PRIVILEGES ON SCHEMA public FROM traceflow_migrator;

COMMIT;

-- ============================================================================
-- BLOQUE 2: Ejecutar en sistema_enterprise (DEV)
-- Objetivo:
--   1. Revocar DELETE físico sobre las 24 tablas maestras principales que usan
--      soft-delete (conservando DELETE únicamente en las 6 tablas puente M:N
--      que los servicios de catálogos reemplazan transaccionalmente:
--      role_permissions, material_tags, formula_ingredients,
--      production_bom_items, laminado_specification_materials,
--      globo_specification_materials).
--   2. Revocar escrituras directas sobre sequelize_meta para traceflow_app_local
--      (solo traceflow_dev_migrator debe escribir en sequelize_meta).
-- ============================================================================
BEGIN;

REVOKE DELETE, TRUNCATE ON TABLE
  public."areas",
  public."subareas",
  public."roles",
  public."permissions",
  public."rankings",
  public."material_units",
  public."material_families",
  public."material_codes",
  public."material_types",
  public."material_brands",
  public."material_locations",
  public."suppliers",
  public."tags",
  public."materials",
  public."tipos_baja",
  public."formulas",
  public."pti_products",
  public."extruders",
  public."extrusoras_formulas",
  public."silos",
  public."looms",
  public."production_boms",
  public."laminado_specifications",
  public."globo_specifications"
FROM traceflow_app_local;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public."sequelize_meta" FROM traceflow_app_local;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public."audit_logs" FROM traceflow_app_local;

COMMIT;
```

### 3.3 Impacto, Riesgos y Validación del Usuario Legítimo del MES
- **Impacto sobre el usuario legítimo del MES en DEV:**
  - En `sistema_enterprise`, los servicios de administración de catálogos (`BaseCatalogService.js`, `materials.service.js`, `formulas.service.js`, `telares.service.js`, `laminado.service.js`, `globo.service.js`) utilizan **`SELECT`, `INSERT` y `UPDATE` (incluyendo *soft-delete* `is_active = false` / `deleted_at = NOW()`)** sobre las 24 entidades maestras principales, y utilizan `DELETE` + `INSERT` únicamente sobre las 6 tablas puente (`role_permissions`, `material_tags`, `formula_ingredients`, `production_bom_items`, `laminado_specification_materials`, `globo_specification_materials`).
  - Por lo tanto, conservar `SELECT, INSERT, UPDATE` en las 24 tablas maestras principales y `SELECT, INSERT, UPDATE, DELETE` en las 6 tablas puente permite que el usuario legítimo del MES administre todos sus catálogos y fórmulas desde la interfaz web, mientras **impide a nivel de motor PostgreSQL que cualquier bug, agente o script haga `DELETE` o `TRUNCATE` de materiales, usuarios, roles, máquinas, silos, telares o fórmulas**.
- **Pruebas Positivas (Post-aplicación):**
  1. Conectar como `traceflow_app_local` a `sistema_enterprise` y ejecutar `SELECT`, `INSERT` y `UPDATE` (en transacción con `ROLLBACK`) sobre `materials` y `DELETE` + `INSERT` sobre `formula_ingredients` $\rightarrow$ **Debe tener éxito**.
  2. Conectar como `traceflow_dev_migrator` a `sistema_enterprise` y consultar `sequelize_meta` $\rightarrow$ **Debe tener éxito**.
- **Pruebas Negativas (Post-aplicación):**
  1. Conectar como `traceflow_app_local` a `sistema_enterprise` y ejecutar `DELETE FROM materials WHERE id = -1` $\rightarrow$ **Debe fallar con `ERROR: permiso denegado a la tabla materials (42501)`**.
  2. Conectar como `traceflow_app_test` a `sistema_enterprise_test` y ejecutar `INSERT INTO extrusoras_formulas ...` o `DELETE FROM extrusoras_formulas` $\rightarrow$ **Debe fallar con `ERROR: permiso denegado a la tabla extrusoras_formulas (42501)`**.
- **Procedimiento de Rollback:**
  ```sql
  -- En sistema_enterprise_test (como traceflow_qa_migrator):
  DROP TRIGGER IF EXISTS trg_qa_no_delete_extrusoras_formulas ON public."extrusoras_formulas";
  DROP TRIGGER IF EXISTS trg_qa_no_truncate_extrusoras_formulas ON public."extrusoras_formulas";
  GRANT INSERT, UPDATE, DELETE ON TABLE public."extrusoras_formulas" TO traceflow_app_test;

  -- En sistema_enterprise (como traceflow_dev_migrator):
  GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO traceflow_app_local;
  ```
