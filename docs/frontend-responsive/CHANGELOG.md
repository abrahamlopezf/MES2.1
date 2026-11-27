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
