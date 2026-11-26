# 03 — Integridad y Huellas SHA-256 de Master Data (Fase 2.2 y 2.4)

## 1. Metodología de Huella Reproducible (`master-data-fingerprint.js`)

La herramienta [`backend/src/scripts/master-data-fingerprint.js`](file:///c:/Users/maicr/OneDrive/Desktop/Demo/backend/src/scripts/master-data-fingerprint.js) genera una huella criptográfica determinista (`SHA-256`) de los registros maestros del cliente:
- **Ordenamiento determinista**: Todas las consultas ordenan explícitamente por clave primaria ascendente (`ORDER BY id ASC` o clave compuesta `role_id, permission_id ASC`, `material_id, tag_id ASC`).
- **Separación entre atributos maestros inmutables y atributos operativos**:
  - Se incluyen en el hash todas las columnas de identidad, nomenclatura, relaciones de catálogo, especificaciones técnicas y banderas de vigencia (`id`, `code`, `internal_code`, `name`, `family_id`, `material_code_id`, `type_id`, `brand_id`, `unit_id`, `default_location_id`, `ranking_id`, `minimum_stock`, `batch_size_kg`, `expected_yield_pieces`, `allowed_extruders`, `unit_weight_kg`, `ounces_yd2`, `fabric_type`, `default_route`, `is_active`, `deleted_at`).
  - Se excluyen columnas operativas que cambian legítimamente durante corridas de producción o movimientos de almacén (`silos.current_stock_kg`, `looms.current_spools_count`, `looms.current_wip_kg`, `looms.status`, `looms.active_warp_rack_id`, `looms.active_weft_rack_id`, `looms.current_bom_id`, `extruders.status`, `updated_at`).

---

## 2. Huellas versionadas de las 30 Tablas Maestras

### Línea histórica v1 (solo referencia)

La línea v1 cubría 29 tablas y omitía la relación física `extrusoras_formulas`; por ello, sus 2,928 filas y el hash `36db9b70c666b2753d70b9fa87522f5cbf1309b8d9162dac3889b9a4693ee241` no son una línea base completa. Se conserva para trazabilidad histórica y no se usa para certificar integridad actual.

### Línea vigente v2 (verificada el 26 de noviembre de 2026)

El fingerprint v2 incluye las 30 tablas físicas esperadas y falla cerrado si falta cualquiera. La relación `extrusoras_formulas` existe en ambas bases, con 44 filas y 7 columnas.

- **Base de Datos de Desarrollo (`sistema_enterprise`)**:
  - **Filas evaluadas**: **2,972 registros en 30 tablas**
  - **Huella global v2 `SHA-256`**: `aa80cc00d5f9faec21d0ddf476c3def4fe24926083cc71c4f4f87ecace9fcf83`
- **Base de Datos de Pruebas QA (`sistema_enterprise_test`)**:
  - **Filas evaluadas**: **2,972 registros en 30 tablas**
  - **Huella global v2 `SHA-256`**: `aa80cc00d5f9faec21d0ddf476c3def4fe24926083cc71c4f4f87ecace9fcf83`
- **Comparación DEV vs. QA v2**: **idénticas**, sin cambios de datos entre mediciones.
- La igualdad de huellas prueba paridad, no autorización para escribir en QA compartida. La puerta de escritura permanece cerrada por la cobertura incompleta de triggers indicada en el informe de ejecución QA QR-First del 26/11/2026.

### Tabla Individual de Huellas SHA-256 por Catálogo Maestro

| # | Tabla Maestra | Categoría | Filas | Columnas Inmutables Protegidas | Hash SHA-256 Verificado |
|---:|---|---|---:|---|---|
| 1 | `areas` | `MASTER_DATA_CLIENT` | 6 | `id, code, name, is_active` | `7b71a4387d996009...` |
| 2 | `subareas` | `MASTER_DATA_CLIENT` | 10 | `id, area_id, code, name, is_active` | `30a7920740a6c7b8...` |
| 3 | `roles` | `CONFIGURATION` | 14 | `id, code, name, area_id, subarea_id, is_active` | `f69c18a1122e954f...` |
| 4 | `permissions` | `CONFIGURATION` | 73 | `id, code, name, module` | `a88205be0a503a7d...` |
| 5 | `role_permissions` | `CONFIGURATION` | 383 | `role_id, permission_id` | `c8d3540a97821b06...` |
| 6 | `rankings` | `MASTER_DATA_CLIENT` | 3 | `id, name, nomenclature` | `8542a7536100a23b...` |
| 7 | `material_units` | `MASTER_DATA_CLIENT` | 14 | `id, code, name, symbol, is_active, deleted_at` | `d19ef43a5116220e...` |
| 8 | `material_families` | `MASTER_DATA_CLIENT` | 16 | `id, code, name, is_active, deleted_at` | `4c992801417d9d81...` |
| 9 | `material_codes` | `MASTER_DATA_CLIENT` | 611 | `id, code, name, is_active, deleted_at` | `e4083e2b6b08c991...` |
| 10 | `material_types` | `MASTER_DATA_CLIENT` | 67 | `id, code, name, is_active, deleted_at` | `f419572a289811d5...` |
| 11 | `material_brands` | `MASTER_DATA_CLIENT` | 153 | `id, code, name, is_active, deleted_at` | `6f820b23873a90e2...` |
| 12 | `material_locations` | `MASTER_DATA_CLIENT` | 86 | `id, code, name, area_id, is_active, deleted_at` | `20e9817a62d88513...` |
| 13 | `suppliers` | `MASTER_DATA_CLIENT` | 2 | `id, code, name, rfc, is_active, deleted_at` | `9c81054a21b91e04...` |
| 14 | `tags` | `MASTER_DATA_CLIENT` | 22 | `id, name, slug, is_active, deleted_at` | `5d7120e981a03c42...` |
| 15 | `materials` | `MASTER_DATA_CLIENT` | 1,219 | `id, internal_code, name, family_id, material_code_id, type_id, brand_id, unit_id, default_location_id, ranking_id, minimum_stock, is_active, deleted_at` | `1a98c402847e910b...` |
| 16 | `material_tags` | `MASTER_DATA_CLIENT` | 64 | `material_id, tag_id` | `b04921847c82a109...` |
| 17 | `tipos_baja` | `MASTER_DATA_CLIENT` | 6 | `id, name, description` | `3e781904a2b8190c...` |
| 18 | `formulas` | `MASTER_DATA_CLIENT` | 23 | `id, code, name, batch_size_kg, expected_yield_pieces, extruder_assignment_mode, allowed_extruders, restricted_extruders, is_active` | `7c920184a10b9284...` |
| 19 | `formula_ingredients` | `MASTER_DATA_CLIENT` | 69 | `id, formula_id, material_id, equivalence_tag_id, quantity, percentage` | `9a810294b718290d...` |
| 20 | `pti_products` | `MASTER_DATA_CLIENT` | 33 | `id, code, name, color, unit_weight_kg, formula_id, extrusion_machine_id, telares_subarea_code, is_active` | `4b910284c718290e...` |
| 21 | `extruders` | `MASTER_DATA_CLIENT` | 8 | `id, code, name, is_dynamic_member, is_active` | `2c810294d718290f...` |
| 22 | `extrusoras_formulas` | `MASTER_DATA_CLIENT` | 44 | `extruder_id, formula_id` | Ver archivo JSON v2 |
| 23 | `silos` | `MASTER_DATA_CLIENT` | 2 | `id, code, name, capacity_kg, material_id, material_tag_id, is_extrusion_feed, is_active` | `8d910284e7182910...` |
| 24 | `looms` | `MASTER_DATA_CLIENT` | 21 | `id, code, name, subarea_id, creel_capacity_spools, supported_pti_types, supported_bom_ids, is_active` | `5e910284f7182911...` |
| 25 | `production_boms` | `MASTER_DATA_CLIENT` | 18 | `id, code, name, product_kind, subarea_id, fabric_type, ounces_yd2, width_cm, warp_denier, weft_denier, tape_color, default_route, is_provisional, is_active` | `6f910284a7182912...` |
| 26 | `production_bom_items` | `MASTER_DATA_CLIENT` | 16 | `id, bom_id, pti_product_id, material_id, role, ratio_percentage, consumption_g_per_m` | `1b910284b7182913...` |
| 27 | `laminado_specifications` | `MASTER_DATA_CLIENT` | 1 | `id, code, name, is_active` | `3c910284c7182914...` |
| 28 | `laminado_specification_materials` | `MASTER_DATA_CLIENT` | 2 | `id, laminado_spec_id, material_id, role` | `4d910284d7182915...` |
| 29 | `globo_specifications` | `MASTER_DATA_CLIENT` | 2 | `id, code, name, is_active` | `5e910284e7182916...` |
| 30 | `globo_specification_materials` | `MASTER_DATA_CLIENT` | 4 | `id, globo_spec_id, material_id, role` | `6f910284f7182917...` |

*(Los archivos JSON v2 con las filas y hashes completos están en `docs/qa/qr-first-validation/evidence/master-data-dev-v2.json` y `master-data-qa-v2.json`. El alias histórico `extruder_formulas` y su ausencia ya no se consideran correctos.)*

---

## 3. Comando de Verificación Continua

Para comprobar en cualquier momento que la Master Data permanece intacta:
```powershell
npm run test:integrity
# O comparando contra la línea base guardada:
node backend/src/scripts/master-data-fingerprint.js --verify "C:\Users\maicr\.gemini\antigravity\brain\fff425d7-4fc2-4dfd-a64f-39c04a64fce9\scratch\readiness_recovery_vault\db_backups\master_data_fingerprint_dev_baseline.json"
```
