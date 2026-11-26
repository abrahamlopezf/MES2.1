# Hallazgos, vacíos y riesgos QR-First

No se cambió código ni reglas. Los hallazgos previos conservan su clasificación original y se enlazan en vez de duplicarse.

| ID | Área | Tipo | Evidencia / observación | Impacto | Estado / prueba necesaria |
|---|---|---|---|---|---|
| QRF-001 | Global QR | Compatibilidad de estados | `qr.constants.js` y `qrDomain.service.js` usan vocabularios que incluyen `GENERATED`, mientras servicios traceability comparan `DISPONIBLE`, `GENERADO`, `FINALIZADO`; modelo QR usa string | Rechazos falsos o acciones incorrectas al cambiar de flujo | Riesgo estático, no defecto confirmado. Mapear estados reales y probar transiciones en QA. |
| QRF-002 | Global QR | Concurrencia | Hay transacciones/locks en algunos servicios, y unicidad `TraceableItem.qr_code_id`; cobertura concurrente no fue ejecutada para cada endpoint de producción | QR duplicado o rollback parcial si una ruta omite bloqueo | No validado. E2E-07/11 en DB desechable. |
| QRF-003 | Genealogía | Cobertura truncada potencial | Recursión en profundidad 8; límite 100 por nodo; relaciones iniciales 10 por sentido (`traceability.service.js:597-651`) | Historia extensa puede mostrarse incompleta | Riesgo de diseño observado; medir volúmenes/contrato y probar. |
| QRF-004 | Extrusión→Telares | Compleción de vínculos | Árbol busca preparación, insumos, producción y racks; no se verificó que cada movimiento/output cree enlaces completos | Pérdida de origen o cantidades parciales no reflejadas en QR final | Sin validación E2E. |
| QRF-005 | Telares | Participación histórica | Segmentos por rango de metros existen y se validan; no se ejecutó lectura del QR final para comprobar el historial y límites en múltiples turnos | Atribución laboral incorrecta o incompleta | Implementado sin validación. Acordar regla de segmentos y ejecutar E2E-08. |
| QRF-006 | Telares→Globo | Regla industrial ambigua | Código permite ruta Globo→Corte para todo `ROLLO_TELA`; cliente dijo “solo ciertos rollos”, pero falta lista | Enrutamiento no autorizado | Bloqueado por regla; mantener `QA-TEL-ROUTE-001`. |
| QRF-007 | Laminado/Globo | QR de producto transformado | Laminado crea salida QR e hijos por materiales y rollo en una transacción (`laminado.service.js:705-840`); Globo no fue recorrido | Puede diferir asignación, genealogía o consumo entre áreas | Laminado estático; Globo sin validar. |
| QRF-008 | Scan general | Contexto de ejecución | `scanQrCode` calcula allowed actions según usuario y asignación, pero entrada no incluye área/contexto operativo explícito | UI puede sugerir acción genérica; backend debe revalidar destino/permiso en mutación | Riesgo por validar visual/API; no afirmar bypass. |
| QRF-009 | Almacén | FIFO/empaque | Hallazgo previo `QA-ODC-PACK-001` conciliado en `DEFECT_REGISTER.md`; caso equivalente sin presentación no respetó empaque prometido | Saldo/costo/WIP incorrecto | Abierto en reporte previo; excluido de cambios para preservar flujo aprobado. |
| QRF-010 | Corte↔Laminado | Estado PICKED | `QA-CORTE-LAM-001` y decisión documentada indican que integración pasa un caso pero una prueba espera que PICKED desaparezca de lista | Contrato visual/consulta pendiente | Decisión de Producto pendiente; no resuelta. |
| QRF-011 | Mobile | UI | No se efectuó auditoría autenticada en esta intervención | Scanner/acciones pueden no ser operables a pie de máquina | Pendiente de visual autenticada en dispositivo/tamaño real. |
| QRF-012 | Seguridad QA / Master Data | Cobertura de fingerprint posiblemente omitida | El script lista `extruder_formulas` (`master-data-fingerprint.js:43`); migraciones crean/actualizan `extrusoras_formulas` (`20261023000000-create-silos-and-extruders.js:40-43`, `20261104110000-configure-extruder-output-ownership.js:41-42`) | La huella reportada podría no cubrir compatibilidad fórmula-extrusora | Riesgo confirmado estáticamente; ejecución DB read-only y corrección de herramienta requieren auditoría de blindaje separada. No probar escrituras en DEV/QA compartida hasta verificarlo. |

## Faltantes sin atribuir como defectos

- Reglas confirmadas para división/combinar productos, reuso parcial, sobrantes y reversas.
- Versionado o snapshot de ficha técnica/BOM en la historia; el servicio o tree que carga catálogo actual no demuestra inmutabilidad histórica.
- Contrato de reimpresión, daño/cancelación y reemplazo físico de etiqueta.
- Confirmación de cómo se identifican envases, racks/carritos y productos PTI, que son identidades distintas.
- Cobertura forward desde lote de materia prima a todos los outputs derivados.
- Respuesta consistente de genealogía por permisos y privacidad entre áreas.

## Riesgo y prioridad

Antes de una aprobación operativa QR-first, priorizar prueba real de atomicidad/unicidad, cadena extrusión-telares, segmentos por tramo, genealogía de productos transformados y acciones permitidas. No corregir defectos ni actualizar tests en esta intervención.
