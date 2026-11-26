# Matriz QA

Fecha de ejecución: 25 de noviembre de 2026 (CDMX). Esta matriz separa pruebas automatizadas y acciones de interfaz; no presenta el resultado parcial como aprobación del sistema completo.

| Área / nivel | Ejecutado | Pasa | Falla / hallazgo | Pendiente |
|---|---:|---:|---|---|
| Backend: reglas puras Extrusión, turnos, balances, FIFO silo e inventario | 38 | 38 | 0 | Integración y flujos persistidos |
| Backend: reglas Telares, conversión, rutas y QR | 36 | 33 | 3 discrepancias de pruebas/ruta `GLOBO → CORTE` | Confirmar contrato funcional y repetir |
| Frontend Vitest | 31 | 31 | 0 | Cobertura de los flujos completos |
| Frontend build | 1 | 1 | Advertencia de chunk ~3.7 MB | Rendimiento real/móvil |
| Frontend lint | 1 comando | 0 limpio | 127 problemas: 116 errores, 11 warnings | Clasificar y resolver |
| UI E2E Almacén recepción | 1 flujo | Parcial | Se pudo recibir, pero luego la ODC eligió lote equivalente sin empaque | Corregir y repetir |
| UI E2E ODC Globo a WIP | 1 flujo | Parcial | Surtido exitoso, pero difiere de la reserva de presentación y deja un movimiento real auditable de 1 kg | Corregir `QA-ODC-PACK-001` y repetir en escenario controlado |
| UI navegación Almacén / Recepción | 2 intentos | Falla reproducible | Acción abre escáner QR sin cambiar ruta | Revisar navegación |
| UI catálogo/WIP Laminado y Globo | 4 pantallas | Consulta completada | Conteos cargaron tras estado inicial de carga; ningún cambio | Probar flujos productivos luego de resolver datos/turno |
| UI catálogo/terminal/scrap Telares | 3 pantallas | Lectura completada | Catálogo 18 fichas/21 telares; terminal mostró telar #1 con 1 bobina, opciones compatibles; formulario de merma ofrece 21 telares y 3 turnos | Completar corrida y revisar la fecha/ruta del QR viajero |
| UI historial QR viajero | 1 pantalla | Parcial | Salidas visibles, pero la fecha aparece como `—` y algunas rutas históricas difieren de la ficha listada | Verificar genealogía persistida y contrato de snapshot |
| UI/DB conciliación de datos maestros | 30 tablas | 30 sin cambio | 0 cambios | Mantener en próximas pruebas |
| Extrusión productiva / turno / mezcla / rack / cierre | 0 | — | Bloqueado por turno preexistente vencido con mezclas activas | Decisión explícita para continuar |
| Extrusión: marcar listo para relevo | 1 | Acción persistida | Turno quedó esperando recepción; saldos activos preservados | Continuar aceptación cuando la regla de QR se alinee |
| Extrusión: recepción e inicio por SUPREL | 1 intento | Bloqueado correctamente por validación actual | Requiere QR para las dos mezclas, aunque el acuerdo previo solicita traspaso por saldo digital sin QR | Corregir/confirmar regla y repetir |
| Telares: corrida, QR, participantes, rutas y scrap | 0 | — | Sin flujo de Extrusión limpio para abastecer | Ejecutar tras resolver bloqueo |
| Laminado, Liner/Globo productivo, concurrencia | 0 | — | No ejecutado | Pendiente |

## Resultado agregado

- Suite de reglas de Extrusión: 38/38.
- Suite de reglas de Telares: 33/36; tres fallos ligados a expectativas de ruta que requieren aclaración.
- Vitest: 31/31.
- Build: pasa; advierte bundle grande.
- Lint: falla con 127 problemas.
- E2E: un flujo parcial Almacén → ODC → WIP Globo, con un defecto P1 encontrado. No hubo fabricación de Globo ni corrida Almacén → Extrusión → Telares.

La cobertura total y el porcentaje de confiabilidad **no son calculables** con el inventario de acciones aún incompleto y sin ejecutar las áreas críticas. No afirmar “100% funcional” con estos resultados.
