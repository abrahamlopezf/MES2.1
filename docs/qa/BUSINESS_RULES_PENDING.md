# Reglas por confirmar antes de cerrar QA

1. **Ruta de Telares a Globo/Liner:** el código admite `TELARES → GLOBO → CORTE`, pero tres pruebas esperan bloquear Globo. Producción aclaró que la ruta solo aplica a ciertas fichas; falta la lista exacta de productos/fichas. Confirmar qué artículos se autorizan y que la ruta siempre concluye en Corte.
2. **Roles de operaciones productivas en Telares:** confirmar qué acciones puede ejecutar Operador frente a Supervisor/Admin. Las rutas de producción muestran middleware de autenticación/área, y las de catálogo agregan control explícito de rol.
3. **Laminado:** confirmar en runtime cómo se derivan los rollos compatibles y materiales unificados; no inspeccionado funcionalmente.
4. **Tres rollos de salida:** confirmar campos requeridos y límites físicos/unidades con el flujo del cliente antes de validar.
5. **Horario y turnos:** confirmar programa local vigente, días/turnos activos y políticas de transición para que fixtures no contradigan la configuración de prueba.

No se alteraron reglas ni catálogos durante esta fase.
