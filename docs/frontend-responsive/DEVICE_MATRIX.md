# Matriz de dispositivos y navegadores

La única inspección visual de página en esta fase fue `/login`, servida desde Vite local. Viewport simulado desde el navegador Edge conectado a la sesión de QA. Ningún viewport equivale a certificación de hardware.

| Clase | Viewport CSS | Ruta | Tema | Resultado | Tipo de evidencia |
|---|---:|---|---|---|---|
| Móvil compacto | 320×720 | `/login` | Oscuro predeterminado | Sin overflow horizontal | Inspección visual + medición DOM |
| Móvil estándar | 375×812 | `/login` | Oscuro predeterminado | Sin overflow horizontal | Medición DOM |
| Tablet | 768×1024 | `/login` | Oscuro predeterminado | Sin overflow horizontal | Medición DOM |
| Desktop compacto | 1024×768 | `/login` | Oscuro predeterminado | Sin overflow horizontal | Medición DOM |
| Desktop amplio | 1440×900 | `/login` | Oscuro predeterminado | Sin overflow horizontal | Medición DOM |

## Pendiente

- 320×568, 360×800, 390×844, 430×932.
- Galaxy Tab A11 físico: vertical y horizontal; distintas escalas del sistema.
- Windows/macOS desktop con zoom del navegador 100%, 125%, 150% y escala de texto.
- iOS Safari, Android Chrome, Edge/Chrome de escritorio, Firefox y navegadores móviles integrados.
- Orientación, teclado virtual físico, safe areas, scroll de modales y cámara trasera.
- Validación clara/oscura/automática en rutas autenticadas.

Resultados de emulación no se describen como dispositivos físicos probados.
