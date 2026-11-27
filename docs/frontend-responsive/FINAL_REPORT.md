# Informe de avance — Fase II de auditoría responsive

**Estado: INCOMPLETO / EN PROGRESO.** Esta actualización amplía la validación de la pantalla pública de acceso y deja una suite reproducible. No es certificación integral: no se auditaron pantallas autenticadas por falta de un entorno/sesión QA verificados.

## Cobertura comprobada

- Inventario estático: 27 directorios de módulos, 76 declaraciones `path`, 288 archivos `.tsx/.jsx`. Las declaraciones incluyen aliases, guards, redirects y rutas parametrizadas; no son 76 pantallas únicas.
- Navegación automatizada: `/login` renderizada y verificada en Edge headless en 27 perfiles de viewport y dos temas explícitos (54 casos), más 6 combinaciones de tema Automático.
- Interacciones públicas: validación de formulario vacío y mostrar/ocultar contraseña; conserva el valor.
- Muestra de guards: 12 rutas protegidas redirigen a login sin sesión; su contenido y permisos autenticados no quedan verificados.
- Evidencia: 7 PNG reales de `/login` en `docs/frontend-responsive/evidence/`.
- Pantallas con validación de render responsive completada en esta fase: 1. Módulos completamente auditados conforme al criterio integral: 0.

## Hallazgos y correcciones

1. **Runtime general — import inválido en diálogo térmico QR.** El navegador quedaba en blanco al cargar la app porque `ThermalQrPrintDialog.tsx` importaba `LoaderCircle`, que no existe en la compatibilidad de iconos activa. Se sustituyó solo por el export existente `Loader2`, preservando el trabajo concurrente del diálogo.
2. **Accesibilidad de login.** Se añadió semántica de encabezado H1 al título, nombre accesible dinámico al botón de visibilidad de contraseña y asociación real de etiquetas a los inputs mediante `FormControl`.
3. Se eliminó un import `CardFooter` sin uso detectado por lint focalizado.

## Validación

| Verificación | Resultado |
|---|---|
| `npm run test:responsive` | 74 aprobadas / 0 fallidas. Playwright 1.64.1, Edge headless. |
| `npm run test:frontend` | 18 archivos, 65 pruebas aprobadas / 0 fallidas. |
| `npm --prefix frontend run build` | Aprobada; el bundle conserva advertencia de chunks grandes (JS principal ~3.72 MB, ~974 KB gzip). |
| ESLint global | FALLIDO: 112 errores y 11 advertencias. No se deshabilitaron reglas ni se corrigió el baseline general. `LoginPage.jsx` pasa lint focalizado. |
| `npm run security:check` | Aprobado: 13,223 archivos escaneados, 0 hallazgos. |
| Backend/DB/Master Data | Sin conexión ni modificación. Integridad DB no consultada. |

## Restricciones de QA

La configuración real del backend apunta a `APP_ENV=local`, base `sistema_enterprise` en loopback. La resolución en modo `test` apunta a `sistema_enterprise_test`, también loopback, pero no se comprobó el servidor PostgreSQL, grants del rol, triggers de protección QA ni hash Master Data mediante conexión. No había credenciales QA por rol verificadas. No se abrió sesión con usuarios reales ni se probaron operaciones con side effects; el uso autenticado queda bloqueado hasta disponer de un setup de QA autorizado.

## Cobertura no certificada

Los otros 26 módulos, contenido de rutas protegidas, permisos/roles, formularios y modales autenticados, ambas apariencias en módulos privados, errores de red, cámara física, teclado virtual, orientación, navegadores móviles, dispositivo Samsung Galaxy Tab A11 y pruebas físicas no se probaron. La matriz distingue estos pendientes y no declara módulos completos.

## Siguiente paso

Preparar un entorno QA aislado con conexión y triggers verificados y cuentas QA autorizadas de solo lectura/roles pertinentes. Después iniciar con la primera pantalla protegida real, `/dashboard`, sin ejecutar acciones que alteren datos industriales; avanzar por lotes registrando captura, interacciones y regresión antes de marcar cada escenario VERIFIED.
