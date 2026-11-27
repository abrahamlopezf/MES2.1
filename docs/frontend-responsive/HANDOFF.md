# Handoff — auditoría responsive Fase II

## Estado para retomar

- Se creó una suite Playwright persistente: `e2e/responsive/`; comando `npm run test:responsive`.
- Última corrida: 74/74 aprobadas. Cubre login público, tamaños emulados, temas, validación/visibilidad de contraseña y redirects sin sesión de 12 rutas de muestra.
- Siete capturas reproducibles de Login están en `docs/frontend-responsive/evidence/`.
- Corregidos import de icono inválido del diálogo QR térmico y tres detalles de accesibilidad de Login. Preservar el resto de cambios concurrentes QR/impresión.
- Regresión: 65/65 pruebas frontend, build aprobada, security scan 13,223 archivos/0 hallazgos. ESLint aún falla con 112 errores y 11 warnings.
- No hay certificación total: cero módulos completos; 1 pantalla pública probada, 0 contenidos autenticados.

## Bloqueo real

No ejecutar pruebas autenticadas: backend `.env` apunta a `APP_ENV=local` / `sistema_enterprise`. El guard en modo `test` resuelve a `sistema_enterprise_test` en loopback, pero todavía no se verificaron la conexión efectiva, los permisos PostgreSQL, los triggers QA ni el hash Master Data. Tampoco hay credenciales QA por rol confirmadas. No usar sesiones productivas, cuentas reales ni datos de operador.

## Próxima actividad

1. Obtener/confirmar un entorno QA y cuentas QA autorizadas; verificar `dbGuard`, rol/grants, triggers y Master Data antes de cualquier prueba que consulte DB.
2. Iniciar la pantalla protegida `/dashboard` sin acciones que muten datos; recorrer rol autorizado, estados y ambos temas.
3. Continuar componente transversal y módulos en el orden de `AUDIT.md`, capturando antes/después y actualizando `QA_MATRIX.md` por escenario real.
4. Resolver lint en lotes pequeños con clasificación y pruebas focalizadas, evitando cambios de reglas industriales.
5. Validar en Edge/Chromium automatizado primero; luego navegadores móviles/dispositivos físicos cuando estén disponibles. No declarar cámara, teclado o Galaxy Tab A11 validados sin hardware real.

## Comandos de referencia

- `npm run test:responsive`
- `npm run test:frontend`
- `npm --prefix frontend run build`
- `npm --prefix frontend run lint`
- `npm run security:check`
