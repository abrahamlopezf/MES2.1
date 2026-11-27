# Auditoría responsive TraceFlow — línea de trabajo

Fecha de revisión: 26 Nov 2026. Alcance: frontend activo identificado en `frontend/src/app/router.jsx` y revisión transversal del shell, tema, viewport del teclado y acceso público.

## Continuación ejecutada — 27 Nov 2026

- Se abrió `/login` en Microsoft Edge headless mediante Playwright, después de reproducir y corregir un error de runtime que dejaba en blanco las rutas.
- Suite `e2e/responsive/`: 74/74 aprobadas; Login 27 perfiles × 2 temas = 54 renders, 6 casos Automáticos, validación, toggle de contraseña y redirects sin sesión de 12 rutas protegidas.
- Evidencia PNG generada en `docs/frontend-responsive/evidence/` (7 archivos, Login únicamente).
- Se corrigieron el import inválido `LoaderCircle` en el diálogo QR térmico y semántica/labels de login.
- Regresión: frontend 65/65, build OK, lint 112 errores + 11 warnings, seguridad 13,223 archivos y 0 hallazgos.
- No se auditó contenido autenticado. La base efectiva de `.env` es local; el destino test se inspeccionó por configuración únicamente. No se conectó a DB y no se validaron grants, triggers ni Master Data. Sin credenciales QA confirmadas, perfiles/roles siguen bloqueados.
- La suite cubre un solo screen renderizado; los redirects no equivalen a inspección de pantalla ni permisos.

## Inventario y cobertura

- 27 directorios de módulos identificados en `frontend/src/modules`.
- 76 declaraciones `path` en el router; incluyen rutas raíz, hijas, aliases y rutas protegidas. No equivalen a 76 pantallas independientes.
- 288 archivos `.tsx/.jsx` encontrados (páginas, componentes y vistas; no todos son componentes renderizados).
- 46 coincidencias de nombre relacionadas con modal/dialog/sheet/drawer; 17 relacionadas con table/list/inventory. Son indicadores de búsqueda, no conteos semánticos.
- 242 coincidencias de patrones CSS potencialmente relevantes (viewport, ancho mínimo, overflow/nowrap); cada una requiere lectura contextual y no se clasificó automáticamente como defecto.
- Revisión de pantalla completa: 0/27 módulos terminados; 0/76 declaraciones de ruta inspeccionadas de punta a punta. La pantalla de acceso es la única vista con comprobación visual responsive en esta etapa.

## Hallazgos

| ID | Severidad | Área | Hallazgo y causa | Corrección | Estado/evidencia |
|---|---|---|---|---|---|
| RESP-0001 | P1 | Shell / modales | `transform: translateZ(0)` en `body` podía crear un containing block/stacking context que altera elementos `position: fixed`. | Eliminada la transformación global; sin cambiar operaciones. | FIXED. Build aprobada; falta revisión visual de modales en rutas autenticadas. |
| RESP-0002 | P1 | Formularios con teclado | CSS ocultaba cualquier `.sticky.bottom-0` dentro de paneles marcados cuando aparecía el teclado, incluyendo acciones de guardado/confirmación. | Eliminada la regla global que las ocultaba; la navegación móvil sí se mantiene oculta mientras está el teclado. | FIXED. Build aprobada; interacción con teclado virtual físico pendiente. |
| RESP-0003 | P2 | Tema global | Preferencia solo Claro/Oscuro; no seguía cambios del sistema operativo. | Persistencia de preferencia Automática/Claro/Oscuro, tema efectivo para mantener compatibilidad de gráficos/toasts y selección accesible en Perfil. | VERIFIED a nivel unitario: 3 pruebas de tema pasan. La paridad visual completa sigue pendiente. |
| RESP-0004 | P3 | Documento / accesibilidad | `lang="en"` mientras la interfaz se presenta en español. | Cambiado a `lang="es"`. | VERIFIED en DOM del navegador local. |

## Cobertura de rutas, roles y estados

El router identifica acceso autenticado general y guards `SuperAdminRoute`, `GlobalAdminRoute`, `UsersManagementRoute`, `ExtrusionRoute`, `TelaresRoute`, `WarehouseRoute`, `GloboRoute`, `LaminadoRoute`, `CorteRoute`, `AdminAlmRoute`, `PermissionRoute` y `QrBatchManagerRoute`. Esta lectura estática no demuestra que cada combinación rol/ruta/estado funcione. No se completaron inicios de sesión por rol ni acciones que escriban datos.

Módulos encontrados: areas, auth, calidad, catalog, catalogs, corte, dashboard, dev, extrusion, globo, health, identity, laminado, materials, notifications, permissions, preparacion-formulas, production, qrcodes, reception, reports, roles, scrap, telares, traceability, users, warehouse.

## Validación ejecutada

- Vitest frontend: 18 archivos, 65 pruebas aprobadas, 0 fallidas.
- Build de producción: aprobada, 1,870 módulos transformados.
- ESLint: 112 errores y 11 advertencias. El registro previo a esta intervención ya reportaba 112 errores/11 advertencias; la regla actual cubre `.js/.jsx`, no todos los `.ts/.tsx`.
- `npm run security:check`: aprobado, 1,373 archivos inspeccionados, 0 hallazgos.
- Navegador Microsoft Edge con viewport simulado: login en 320×720, 375×812, 768×1024, 1024×768 y 1440×900; sin overflow horizontal en los cinco tamaños. Captura visual comprobada para 320×720.
- Esta emulación no demuestra compatibilidad en dispositivos físicos. La extensión del navegador no pudo cargar el host local en la navegación automatizada; los datos de rutas protegidas requerían una sesión de QA por rol, por lo que no se utilizó el navegador productivo.

## Limitaciones de esta entrega

La auditoría sistémica empieza con problemas globales y línea base; no queda declarada como aprobación integral. Falta ejecutar la matriz de rutas/componentes, los dos temas visuales en cada módulo, roles autorizados, estados de modales/errores, lector QR/cámara, teclado real, orientación, navegadores móviles y pruebas visuales guardadas. No se ejecutaron pruebas backend ni se conectó a bases de datos.
