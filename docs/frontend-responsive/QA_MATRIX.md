# Matriz ejecutable de QA responsive

## Cobertura del ciclo actual — 27 Nov 2026

La suite persistente está en `e2e/responsive/` y se ejecuta con `npm run test:responsive`. Usa Playwright 1.64.1 (paquete declarado) con Microsoft Edge headless; no inicia sesión ni invoca operaciones con side effects.

| Superficie / escenario | Denominador | Ejecutado | Estado | Límite |
|---|---:|---:|---|---|
| Declaraciones `path` del router | 76 | Inventariadas estáticamente | IN_PROGRESS | No equivalen a 76 pantallas independientes. |
| Módulos en `frontend/src/modules` | 27 | 1 módulo con pantalla pública renderizada (auth) | IN_PROGRESS | 0 módulos completos bajo criterios de certificación. |
| Archivos `.tsx/.jsx` | 288 | Login y runtime de rutas muestreados | NOT_STARTED | Sin revisión uno por uno. |
| Login, perfiles de viewport | 27 perfiles / 26 dimensiones únicas | 27 × Claro + 27 × Oscuro = 54 | VERIFIED para el render responsive probado | Emulación desktop Edge; un solo screen. |
| Login, tema Automático | 6 combinaciones (mobile/tablet/desktop × OS claro/oscuro) | 6 | VERIFIED para tema efectivo | No es recorrido de todos los componentes globales. |
| Login, validación / visibilidad contraseña | 2 interacciones | 2 | VERIFIED | No se enviaron credenciales ni se probó autenticación backend. |
| Guards protegidos sin sesión (muestra) | 12 rutas | 12 redirects a login | VERIFIED para guard sin sesión | No valida contenido, permisos por rol ni rutas no incluidas. |
| Pantallas protegidas autenticadas | Por inventario de pantallas reales | 0 | BLOCKED | Falta entorno/sesión QA autorizada y verificación de DB QA. |
| Evidencias PNG | 7 previstas | 7 generadas | VERIFIED | Login solamente; no hay evidencia por módulo protegido. |
| Pruebas frontend existentes | 65 | 65 | VERIFIED | Suite unitaria/integración frontend, distinta a cobertura visual. |

## Inventario de rutas — interpretación

- `frontend/src/app/router.jsx`: 76 declaraciones con propiedad `path`; 3 rutas de índice y 2 nodos de layout sin ruta dan 81 nodos de ruta en total.
- La lectura estática previa contabilizó 64 asociaciones hoja ruta/pantalla antes de esta ejecución; algunas pueden compartir componente. Redirects, wrappers/layouts y aliases no son pantallas adicionales. Debe verificarse contra árbol de rutas actualizado antes de usar este total como denominador de certificación.
- Rutas parametrizadas identificadas estáticamente: `/areas/:group`, `/warehouse/materials/:materialId/lotes`, `/warehouse/lotes/:id`.
- No se calculó aquí el número de componentes de página únicos ni se certificaron combinaciones de permisos.

## Resultados de comandos

| Comando | Resultado | Alcance |
|---|---|---|
| `npm run test:responsive` | 74/74 aprobadas | Login + tema + validación + toggle contraseña + 12 redirects sin sesión. |
| `npm run test:frontend` | 18 archivos, 65/65 aprobadas | Regresión frontend existente. |
| `npm --prefix frontend run build` | Aprobado | Bundle compila; persiste advertencia de chunks grandes. |
| `npm --prefix frontend run lint` | FALLIDO: 112 errores, 11 advertencias | Baseline reportada; no se atribuyen todos a esta intervención. Login focalizado pasa tras eliminar import no usado. |
| `npm run security:check` | Pendiente de resultado final en esta actualización | La primera ejecución coincidió con archivos temporales del runtime; repetir con procesos cerrados. |

## Seguridad y entorno de pruebas

- No se conectó a ninguna base de datos ni se consultaron o alteraron datos.
- `backend/.env` resuelve en `APP_ENV=local` a `127.0.0.1:5432/sistema_enterprise`; no se usó para autenticación.
- La resolución de configuración con `APP_ENV=test` selecciona `127.0.0.1:5432/sistema_enterprise_test` y el rol configurado `traceflow_app_test`, pero no se verificaron conexión, grants, triggers QA ni integridad de Master Data mediante PostgreSQL.
- No se encontraron credenciales QA verificadas para roles. Por ello no se reutilizaron cuentas ni se probaron rutas autenticadas.

## Estados pendientes

Pantallas autenticadas, contenido por rol, estados vacíos/error/carga/datos extensos, ambos temas en módulos protegidos, teclado virtual físico, cámara, orientación, tablets/dispositivos físicos, navegadores móviles y modales siguen NOT_TESTED o BLOCKED. Una ruta no se marca VERIFIED solo por inspección estática o por redirect de guard.
