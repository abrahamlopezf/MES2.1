# Mapa de Dominios Oficiales del MES (Interplas)

## Directiva Arquitectónica No. 002
Ningún módulo, carpeta, modelo o endpoint puede existir fuera de un dominio oficial definido en este documento. Todo nuevo desarrollo deberá pertenecer explícitamente a uno de estos dominios o justificar la creación de un nuevo dominio mediante revisión arquitectónica. El crecimiento del MES debe ser por evolución de dominios existentes, no por proliferación de módulos paralelos.

---

## Core
- Authentication
- Users
- Roles
- Permissions
- Audit

## Master Data
- Materials
- Units
- Families
- Codes
- Brands
- Types
- Categories

## Warehouse (Almacén de Materia Prima y PTI)
*Nota: Inventario físico, no únicamente materia prima.*
- StockUnit
- WarehouseInventory
- WarehouseMovements
- WarehouseReception
- WarehouseDispatch

## Production (Producción en Proceso / WIP)
*Nota: Producción en Proceso. No confundir con Warehouse.*
- Extrusion
- Looms (Telares)
- Cutting (Corte)
- Printing (Impresión)
- Confection (Confección)
- Intermediate (WIP - Productos semi-terminados / Rollos / Cintas)

## Traceability (Trazabilidad)
- QR
- Labels
- Scan
- History

## Quality (Calidad)

## Scrap (Mermas y Desperdicios)

## Dashboard (Operativo)
