# 02 — Protección de Base de Datos, Separación Local/QA y Roles PostgreSQL (Fases 1.5, 1.6 y 2)

> **Estado vigente 26-nov-2026:** las cifras y roles de las secciones 1–2 fueron actualizados. La clasificación, triggers y restauración de las secciones 3–5 documentan verificaciones históricas previas; el estado actual y los límites nuevos están en [16_LOCAL_PG_LEAST_PRIVILEGE_2026-11-26.md](./16_LOCAL_PG_LEAST_PRIVILEGE_2026-11-26.md).

## 1. Separación Efectiva de Bases de Datos Locales (Fase 1.5)

En el servidor local `PostgreSQL 18.7` (`127.0.0.1:5432`) se establecieron y verificaron dos bases de datos independientes:

| Base de Datos | Perfil `APP_ENV` | Propósito | Estado de Migraciones | Filas Maestras (30 Tablas) | Identidad en `system_settings` |
|---|---|---|---:|---:|---|
| **`sistema_enterprise`** | `local` | Desarrollo activo local. Conservada sin renombrar ni alterar registros existentes. | `163` migraciones registradas en `sequelize_meta` | `2,928` | Desarrollo Local |
| **`sistema_enterprise_test`** | `test` | Base de datos aislada para pruebas de integración, E2E y QA multicorrida. | `164` migraciones registradas en `sequelize_meta` | `2,928` | `ENVIRONMENT_IDENTITY = 'TEST_QA_LOCAL'` |

---

## 2. Roles PostgreSQL de Mínimo Privilegio (Fase 1.6)

En `127.0.0.1:5432` están activos cuatro roles separados por ambiente y responsabilidad. `PUBLIC` perdió `CONNECT` y `TEMPORARY` en ambas bases; cada runtime tiene acceso solo a su base. El script antiguo de restauración fue retirado y ya no puede recrear QA.

| Rol PostgreSQL | Superusuario / CREATEDB / CREATEROLE | Acceso DEV | Acceso QA | Propósito |
|---|---|---|---|---|---|
| `traceflow_app_local` | `false / false / false` | `CONNECT`, `USAGE`, DML de desarrollo; sin `CREATE`, `TEMP` ni DDL | Sin `CONNECT` | Runtime local DEV. |
| `traceflow_app_test` | `false / false / false` | Sin `CONNECT` | `CONNECT`, `USAGE`, `SELECT` en todas; DML solo sobre tablas operativas, sin escrituras en las 30 tablas de Master Data | Runtime QA. |
| `traceflow_dev_migrator` | `false / false / false` | `CONNECT`, `CREATE` en `public`, propiedad de objetos TraceFlow; sin `CREATEDB` | Sin `CONNECT` | Migraciones DEV, separadas del proceso de aplicación. |
| `traceflow_qa_migrator` | `false / false / false` | Sin `CONNECT` | `CONNECT`, `CREATE` en `public`, propiedad de objetos TraceFlow; sin `CREATEDB` | Migraciones QA, separadas del proceso de aplicación. |

El antiguo rol compartido `traceflow_migrator` quedó `NOLOGIN`; `postgres` conserva su atributo administrativo en el servidor, pero no es el usuario de runtime. La contraseña de administrador debe volver a guardarse por el responsable en `backend/.env.admin.local` antes de futuras tareas que requieran administrar roles; no se carga en el backend.

---

## 3. Clasificación Arquitectónica de las Tablas de Base de Datos (Fase 2.1)

El esquema público cuenta con **73 tablas base** activas en PostgreSQL (correspondientes a los modelos activos y tablas de unión de Sequelize), clasificadas por su función de negocio y relaciones:

1. **Datos Maestros del Cliente (`MASTER_DATA_CLIENT` — 27 tablas)**:
   - *Organización de Planta*: `areas` (6 filas), `subareas` (10 filas).
   - *Catálogo Maestro de Almacén*: `rankings` (3), `material_units` (14), `material_families` (16), `material_codes` (611), `material_types` (67), `material_brands` (153), `material_locations` (86), `suppliers` (2), `tags` (22), `materials` (1,219), `material_tags` (64), `tipos_baja` (6).
   - *Catálogo Técnico de Producción (Extrusión, Telares, Laminado, Globo)*: `formulas` (23), `formula_ingredients` (69), `pti_products` (33), `extruders` (8), `silos` (2), `looms` (21), `production_boms` (18), `production_bom_items` (16), `laminado_specifications` (1), `laminado_specification_materials` (2), `globo_specifications` (2), `globo_specification_materials` (4).
2. **Datos de Configuración y Seguridad (`CONFIGURATION` — 5 tablas)**:
   - `roles` (14), `permissions` (73), `role_permissions` (383), `system_settings`, `sequelize_meta` / `sequelize_data`.
3. **Datos Operativos Transaccionales (`OPERATIONAL` — 27 tablas)**:
   - *Almacén y Silos*: `inventories`, `lotes`, `silo_receipt_lots`, `consumption_orders`, `consumption_order_items`, `material_consumptions`, `material_consumption_items`, `waste_requests`, `wip_inventories`.
   - *Identidad y Trazabilidad En Vivo*: `qr_batches`, `qr_codes`, `qr_area_assignments`, `traceable_items`.
   - *Extrusión*: `process_formulas`, `process_formula_items`, `process_preparations`, `process_preparation_inputs`, `extruder_queues`, `pti_racks`, `extrusion_shift_sessions`, `extrusion_production_entries`.
   - *Telares, Laminado, Globo y Corte*: `loom_pti_wip`, `loom_runs`, `viajero_rolls`, `viajero_roll_operator_segments`, `corte_laminado_orders`, `corte_laminado_order_items`.
4. **Datos Históricos, Conciliaciones y Movimientos (`HISTORICAL` — 10 tablas)**:
   - `inventory_movements`, `traceability_events`, `traceability_movements`, `traceability_links`, `extrusion_transitions`, `extrusion_shift_closures`, `extrusion_shift_mixture_handoffs`, `extrusion_scrap_logs`, `extrusion_scrap_adjustments`, `extrusion_production_adjustments`, `loom_backflush_consumptions`, `viajero_routing_logs`, `telares_scrap_logs`, `area_process_scrap_logs`, `telares_scrap_observations`.
5. **Datos de Auditoría y Temporales (`AUDIT` / `TEMPORARY` — 4 tablas)**:
   - `audit_logs`, `notifications`, `password_resets`.

---

## 4. Protección Activa de Master Data en Base QA Mediante Triggers PostgreSQL (Fase 2.3)

Para impedir que cualquier prueba QA, script o seeder destructivo elimine o trunque registros maestros, se instaló en `sistema_enterprise_test` la función PL/pgSQL `public.tf_qa_protect_master_data()` asociada a **58 triggers** (`BEFORE DELETE` y `BEFORE TRUNCATE` sobre las 29 tablas maestras existentes en la BD):

- **Comportamiento verificado**:
  - Permite `UPDATE` sobre columnas operativas mutables (como `silos.current_stock_kg`, `looms.current_spools_count`, `looms.current_wip_kg`, `looms.status`, `extruders.status`) necesarias durante las corridas de producción.
  - **Bloquea inmediatamente con código SQLSTATE `42501` (`[QA_MASTER_DATA_GUARD]`)** cualquier intento de `DELETE` o `TRUNCATE` sobre cualquiera de las 29 tablas maestras a menos que la sesión declare explícitamente `SET LOCAL app.allow_master_data_mutation = 'on'`.
  - Validado automáticamente en el Test #10 de [`backend/test/characterization.contracts.test.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/test/characterization.contracts.test.js#L332-L363).

---

## 5. Procedimiento Reproducible de Respaldo y Verificación de Restauración (Fase 2.5)

El respaldo no solo fue generado sino **restaurado y comprobado** sobre `sistema_enterprise_test`:

1. **Generación de Respaldo Nativo (`pg_dump` PostgreSQL 18.7)**:
   - Archivo Custom (`-Fc`): `readiness_recovery_vault/db_backups/sistema_enterprise_phase0.dump` (**2,287,895 bytes**, SHA-256: `858e78f60cb1076348242f44c6d83a9c6d7474158272148a99679e0343d7d9cc`).
   - Archivo Esquema (`--schema-only`): `readiness_recovery_vault/db_backups/sistema_enterprise_phase0_schema.sql` (**1,236,107 bytes**, SHA-256: `649c3ca775aa504a5f93e3d5f524bbce78da6e028b5dd26f0852ca710bd39695`).
2. **Restauración Verificada (`pg_restore`)**:
   - Restaurado íntegramente sobre la base local aislada `sistema_enterprise_test` sin tocar `sistema_enterprise`.
3. **Comprobación de Paridad de Master Data Post-Restauración**:
   - Huella SHA-256 global en `sistema_enterprise`: `36db9b70c666b2753d70b9fa87522f5cbf1309b8d9162dac3889b9a4693ee241` (`2,928` filas).
   - Huella SHA-256 global en `sistema_enterprise_test` tras `pg_restore`: `36db9b70c666b2753d70b9fa87522f5cbf1309b8d9162dac3889b9a4693ee241` (`2,928` filas, **100 % idéntica**).
