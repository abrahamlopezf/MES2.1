# Decisiones industriales pendientes de Producto

Preguntas recuperadas de fuentes existentes se referencian, no se repiten. El alcance que sigue se limita a decisiones QR-first aún no resueltas en la documentación disponible.

## PO-QR-01 — Granularidad de participación por tramo

- **Contexto:** Telares guarda segmentos con `meters_start` y `meters_end`; el requisito pide saber qué usuario participó de qué metro a qué metro.
- **Motivo:** No está confirmado cómo tratar dos usuarios simultáneos ni los cambios de operador dentro de un tramo.
- **Ejemplo:** En un rollo de 500 m, operario A atiende 0–240 m, B 240–500 m; un supervisor apoya 100–180 m.
- **Alternativas:** (A) intervalos de metros sin solapamiento; (B) permitir solapamiento y marcar rol/participación; (C) registrar intervalos de tiempo y asociar metros estimados.
- **Impacto:** Auditoría laboral, reportes por usuario y confiabilidad de metraje atribuible.

## PO-QR-02 — Momento de asignación de QR y fallo de registro

- **Contexto:** Se quiere asignar QR virgen al confirmar una mezcla o al terminar una salida PTI según operación. El historial previo reportó que un escaneo antes de confirmar mezcla pareció alterar QR; no se reprodujo aquí.
- **Motivo:** Definir frontera entre validar/leer etiqueta y consumir/asociar identidad.
- **Ejemplo:** Escanean un QR virgen, el pesaje falla y cancelan; luego intentan usar la misma etiqueta.
- **Alternativas:** (A) reservar temporalmente con expiración y liberar al cancelar; (B) no cambiar estado hasta confirmar; (C) guardar un intento auditado sin asociación.
- **Impacto:** Evita QRs perdidos, doble asignación y mezcla incompleta; cualquier alternativa requiere confirmar implementación y regla de cancelación.

## PO-QR-03 — Identidad en división o combinación de rollo

- **Contexto:** Laminado puede producir varias salidas; una entrada puede generar 1–3 productos. Un mismo QR no debería representar varios objetos si son físicos independientes.
- **Motivo:** Determinar si cada salida recibe QR nuevo y cómo se conserva balance/consumo del QR fuente.
- **Ejemplo:** 800 m de tela se transforman en dos rollos de 300 m y uno de 180 m, con 20 m reportados como merma.
- **Alternativas:** (A) un QR nuevo por salida y relación de cantidades; (B) conservar identidad del original solo si es una transformación sin dividir producto; (C) regla distinta por proceso.
- **Impacto:** Custodia, inventario, costos y genealogía. Laminado actual genera un output por `transformRoll`; su modelo de una salida limita lo demostrado.

## PO-QR-04 — Retrabajo y remanente que conserva identidad

- **Contexto:** Una transformación parcial o retrabajo puede dejar material utilizable.
- **Motivo:** No se encontró regla consolidada para identidad del remanente, su QR/custodia y vínculo a nueva corrida.
- **Ejemplo:** Se procesa 60% de un rollo, el resto vuelve al WIP para otra orden.
- **Alternativas:** (A) conservar QR fuente con balance y crear QR hijo solo para resultado; (B) emitir QR para cada remanente físico; (C) mantener estados específicos por proceso.
- **Impacto:** Evita duplicar peso o desaparecer material entre WIP.

## PO-QR-05 — Reimpresión, reemplazo y anulaciones

- **Contexto:** Generación y endpoints de impresión existen; reimpresión no debe crear una nueva identidad.
- **Motivo:** Definir quién autoriza reimpresión, qué evento queda y cómo invalidar una etiqueta extraviada/dañada.
- **Ejemplo:** Etiqueta de rollo ilegible mientras producto sigue en custodia.
- **Alternativas:** Reimprimir mismo UUID con evento; anular etiqueta y emitir reemplazo enlazado; flujo con supervisor/admin.
- **Impacto:** Riesgo de identidades duplicadas o QR viejo todavía válido.

## PO-QR-06 — Snapshot histórico de ficha

- **Contexto:** ViajeroRoll conserva BOM asociado y catálogo puede cambiar; no se demostró un versionado/snapshot íntegro.
- **Motivo:** Asegurar que escaneo futuro muestre la ficha usada al fabricar, no una interpretación mutable.
- **Ejemplo:** Se corrige ancho o consumo estándar después de producir el rollo.
- **Alternativas:** (A) versionar BOM; (B) almacenar snapshot inmutable por corrida; (C) conservar ambos: referencia versionada y valores capturados.
- **Impacto:** Reproducibilidad de genealogía y auditoría; revisar primero el esquema existente.

## No volver a preguntar

- **Telares→Globo:** ya está confirmado que solo ciertas fichas; falta identificar códigos/lista. Es el pendiente `QA-TEL-ROUTE-001`, documentado en [decisiones pre-MVC](../../engineering-readiness/pre-mvc-final/09_PRODUCT_OWNER_DECISIONS.md).
- **PICKED en Corte→Laminado:** ya existe pregunta de visibilidad entre picking y retorno a Corte en el mismo documento pre-MVC.
- Diferencia industrial Globo/Liner está pendiente de detalle; no asumir que son el mismo proceso aunque la denominación comercial los relacione.
