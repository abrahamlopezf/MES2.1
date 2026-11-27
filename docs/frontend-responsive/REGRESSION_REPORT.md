# Informe de regresión — Fase II

## Corrida posterior a los cambios de Login/runtime

| Verificación | Resultado |
|---|---|
| Suite responsive Playwright | 74/74 aprobadas; Edge headless. |
| Pruebas frontend Vitest | 18 archivos / 65 pruebas aprobadas. |
| Build frontend | Aprobada; advertencia de chunks grandes persiste. |
| ESLint global | 112 errores + 11 warnings; no aprobado. |
| ESLint LoginPage.jsx focalizado | Aprobado. |
| Security check | 13,223 archivos / 0 hallazgos. |

## Cambios cubiertos

- Login: heading semántico, asociación labels/inputs y nombre accesible del toggle de contraseña. Las pruebas E2E verifican render, errores vacíos, visibilidad y conservación del valor.
- Runtime: import del icono de carga en `ThermalQrPrintDialog` corregido a export disponible `Loader2`; build y rutas públicas ya pueden cargar.
- Redirect guard: doce rutas representativas siguen redirigiendo a Login sin sesión.

## Alcance excluido

No se probaron formularios autenticados, operaciones industriales, backend/DB, permisos con sesión, cámara real, teclado móvil ni rutas con datos. El scan de seguridad no certifica esos comportamientos. No se modificó backend, reglas de negocio o datos maestros en esta actualización.
