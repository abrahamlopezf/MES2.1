# Cambios de esta fase

## 26 Nov 2026

- Añadida preferencia de apariencia Automática/Clara/Oscura con persistencia compatible con el valor previo `theme`, tema efectivo claro/oscuro para gráficos y notificaciones, y respuesta a cambios de preferencia del sistema.
- Agregado selector nativo asociado a etiqueta en Perfil, con opciones descritas en español.
- Aplicación temprana de tema desde almacenamiento en `index.html` para evitar el destello inicial al hidratar el estado guardado.
- Corregido `lang="es"` en documento HTML.
- Retirada transformación global de `body` que podía interferir con overlays fijos.
- Conservadas acciones sticky de formularios al abrir teclado; navegación móvil inferior continúa oculta durante edición.
- Agregadas 3 pruebas unitarias del store del tema y guía responsive frontend en `AGENTS.md`.

No se agregaron/eliminaron dependencias ni se cambiaron endpoints, base de datos o reglas de operación. Los cambios previos sin confirmar de Extrusión, Telares y defect register se preservaron.

## 27 Nov 2026 — continuación Fase II

- Añadida suite Playwright responsive reutilizable (`npm run test:responsive`): 74 escenarios de Login, temas, interacciones básicas y redirects protegidos sin sesión; Edge headless.
- Generadas siete capturas de evidencia de Login en `evidence/`.
- Corregido el import de `LoaderCircle` inexistente por `Loader2` en el diálogo QR térmico, causa de pantalla en blanco detectada en runtime.
- Mejorada la semántica de encabezado y labels/nombres accesibles del formulario Login; lint focalizado aprobado.
- Actualizados QA_MATRIX, FINAL_REPORT, HANDOFF, AUDIT y reportes de accesibilidad/regresión/dispositivos con resultados reales y límites de cobertura.
- Regresión: Playwright 74/74, frontend 65/65, build aprobada, security scan 13,223 archivos/0 hallazgos; ESLint global permanece en 112 errores/11 warnings.
- Rutas autenticadas siguen sin probarse: no hay sesión QA verificada y no se conectó a DB.
