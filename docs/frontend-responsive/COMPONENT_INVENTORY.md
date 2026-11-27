# Inventario de rutas, módulos y familias de componentes

Fuente de rutas: `frontend/src/app/router.jsx` (76 declaraciones `path`, con rutas padre/hijas, aliases y patrones dinámicos). Directorios: `frontend/src/modules` (27). Conteo `.tsx/.jsx`: 288 archivos. Los inventarios por nombre abajo son búsquedas heurísticas.

## Familias de módulos

| Área de código | Rutas/paths declarados en el router | Guard visible en router | Revisión integral |
|---|---|---|---|
| Auth/shell | `/login`, `/forgot-password`, `/health`, `/dashboard`, `/profile`, `/areas`, `/areas/:group` | públicas o `ProtectedRoute` + `AppLayout` | Pendiente salvo login responsive y shell/tema por lectura de código |
| Usuarios/roles | `/users`, `/roles`, `/admin`, `/usuarios`, `/gestor-usuarios` | `UsersManagementRoute`, `GlobalAdminRoute`, `SuperAdminRoute` | Pendiente |
| Master data | `/materials`, `/materials/list`, `/materials/families`, `/materials/codes`, `/materials/types`, `/materials/brands`, `/materials/units`, `/materials/locations`, `/materials/suppliers`, `/materials/tags` | `WarehouseRoute` y layout | Pendiente |
| Identidad/QR | `/identity/generate`, `/identity/requests`, `/identity/print`, `/identity/custody`, `/qrcodes`, `/traceability/genealogy` | permisos/manager QR según ruta; genealogía autenticada | Pendiente; no abrir cámara durante esta fase |
| Extrusión/producción | `/extrusion/shifts`, `/extrusion/reports`, `/extrusion/board`, `/extrusion/wip`, `/extrusion/scrap-control`, `/extrusion/rack-ingress`, `/extrusion/dashboard`, `/production/machines`, `/production/formulas`, `/production/stations`, `/production/mixing`, `/production/extrusion`, `/production/extrusion/rack/new`, `/production/andon` | `ExtrusionRoute` | Pendiente; cambios previos de Extrusión sin confirmar se preservan |
| Telares/ruteo | `/production/telares`, `/production/corte`, `/production/viajero-tracker`, `/telares/dashboard`, `/production/telares-dashboard`, `/telares/catalogos`, `/telares/odc`, `/telares/scrap-control`, `/telares/operadores`, `/telares/viajero` | `TelaresRoute` o redirect | Pendiente; cambios previos de Telares se preservan |
| Laminado/Globo/Corte | `/production/laminado`, `/production/globo`, `/laminado/catalogos`, `/laminado/wip`, `/globo/catalogos`, `/globo/wip`, `/corte/laminado-orders` | guards de área y redirects | Pendiente |
| Almacén | `/warehouse`, `/warehouse/receive`, `/warehouse/inventory`, `/warehouse/pti-extrusion-reception`, `/warehouse/materials/:materialId/lotes`, `/warehouse/lotes/:id`, `/warehouse/merma-scrap`, `/warehouse/traceability`, `/warehouse/orders`, `/warehouse/silos`, `/warehouse/reports` | `WarehouseRoute`; algunas rutas además `AdminAlmRoute` | Pendiente |

Los aliases que no aparecen en la agrupación anterior: `/`, `/production`, `/telares`, `/laminado`, `/globo`, `/viajero`; resuelven mediante redirect/outlet. Los 76 `path` son declaraciones de configuración, no recuento deduplicado de páginas.

## Archivos de vista `.tsx/.jsx` por directorio

| Módulo | Archivos | Módulo | Archivos | Módulo | Archivos |
|---|---:|---|---:|---|---:|
| areas | 2 | auth | 3 | calidad | 1 |
| catalog | 0 | catalogs | 2 | corte | 1 |
| dashboard | 7 | dev | 2 | extrusion | 16 |
| globo | 2 | health | 1 | identity | 10 |
| laminado | 2 | materials | 29 | notifications | 1 |
| permissions | 0 | preparacion-formulas | 1 | production | 17 |
| qrcodes | 13 | reception | 2 | reports | 1 |
| roles | 3 | scrap | 1 | telares | 8 |
| traceability | 1 | users | 5 | warehouse | 35 |

Los 288 archivos representan fuentes `.tsx/.jsx` bajo todo `frontend/src`, no la suma aislada de estos subdirectorios.

## Componentes comunes

- Shell: `AppLayout`, `Sidebar`, breadcrumbs globales, navegación inferior, scanner global, notificaciones, contenedor de página.
- Overlay/form: `dialog`, `alert-dialog`, `sheet`, `tf-ui/dialog`, `BottomSheet` y componentes por módulo. 46 coincidencias de nombres modal/dialog/sheet/drawer por búsqueda inicial.
- Tablas/listas: familias específicas por almacén, catálogo, identidad, producción y telares. 17 coincidencias por nombres table/list/inventory, sin contar componentes renombrados.
- Formularios, filtros, toast, gráficos, lector QR/cámara y tarjetas: requieren revisión individual ruta por ruta.

## Límites del inventario

No se calculó todavía el grafo real de renderizado/uso, imports dinámicos, permisos efectivos por usuario ni cobertura visual por componente. Los directorios `calidad`, `confección` u otros nombres que no existen no se infieren como procesos activos.
