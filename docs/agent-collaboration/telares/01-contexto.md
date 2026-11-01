# 01 — Contexto Operativo y Arquitectónico del Módulo Telares

## 1. Propósito del Documento
Documentar el estado real verificado del módulo **Telares** dentro de **TraceFlow MES (INTERPLAS MÉXICO S.A. DE C.V.)**, su integración con **Extrusión** y procesos posteriores, y su correspondencia con los diagramas operativos del cliente y las especificaciones oficiales de planta.

## 2. Fuentes de Verdad Analizadas
1. **Diagrama 1 (`FLUJO_EXT_2.pdf` — `EXTRUSORA 2 -> TEJIDO DE TELA`)**:
   - **Entradas a Extrusión**: Polipropileno, Carbonato, Concentrado UV, MasterBatch, Polietileno → Preparación de mezclas.
   - **Salidas de Extrusión (PTI Cinta) → Aplicación (`TEJIDO DE TELA`) → Destino**:
     - Mezcla **BLANCA o NEGRA** → Cinta denier **1800 y 2000** (trama 5 mm) → Rollo de tela de **5.0, 6.5, 7.2 y 8.0 oz** → Destinos: **Corte, Laminado o Venta de rollo**.
     - Mezcla **VERDE ÓPTICO** → Cinta denier **2000 o 2200** (trama 5 mm) → Rollo de tela de **6.5, 7.2 oz** → Destinos: **Corte, Laminado o Lonas**.
     - Mezcla **BLANCA, VERDE ÓPTICO, AMARILLO ANTIESTÁTICO o NEGRO** → Cinta denier **1200** (3 mm, *trama y urdimbre; mismo material para todo el telar*) → Rollo de tela de **3.0 oz** → Destinos: **Corte, Laminado**.
     - Mezcla **ROJA o NEGRA LIQUITANK** → Cinta denier **2300** (3 mm) → Rollo de tela de **7.2 oz** → Destino: **Venta**.
     - Mezcla **BLANCA** → Cinta denier **2300** (3 mm) → Rollo de tela de **8.0 oz** → Destino: **Corte**.
2. **Diagrama 2 (`FLUJO_TEJIDO_DE_BANDA.pdf` — `EXTRUSORA 1 -> TEJIDO DE BANDA`)**:
   - **Entradas a Extrusión**: Polipropileno, Carbonato, Concentrado UV, MasterBatch, Polietileno → Preparación de mezclas.
   - **Salidas de Extrusión (PTI Cinta de rafia) → Aplicación (`TEJIDO DE BANDA`) → Destino**:
     - **Cinta de rafia denier 4600** (colores: blanco, verde, azul, rojo, amarillo huevo, naranja, negro y natural antiestático) y **Cinta de rafia denier 3000** (colores: blanco y azul):
       - **Rollos de banda de 2"** en todos los colores, **4500 lb** de resistencia, presentación por rollo de **80 mts**, embalaje en tarima con **100 rollos** → Destinos: **Corte de banda, Almacén, Venta**.
       - **Rollos de banda de 3"** en color blanco, **4500 lb** de resistencia, presentación por rollo de **80 mts**, embalaje en tarima con **100 rollos** → Destinos: **Corte de banda, Almacén, Venta**.
       - **Rollos de banda de 1 ½"** en color blanco, **1700 lb** de resistencia, presentación por rollo de **80 mts**, embalaje en tarima con **150 rollos** → Destinos: **Corte de banda, Almacén, Venta**.
       - (Desde Cinta de rafia denier 3000 blanco y azul): **Cintilla 13 mm** blanca o azul de **3000 lb**, presentación por **caja de aprox. 120 kg** → Destinos: **Corte de cinta, Almacén, Venta**.
3. **Documento Interno `docs/Tejido/ESPECIFICACIÓN DE TELA.pdf`**:
   - **Página 1 (Matriz Técnica de Telas)**:
     - `3.0 oz/yd²`: `TUBULAR`, Cinta ID: `N/A`, Trama `1200`, Urdimbre `1200`.
     - `5.0 oz/yd²`: `TUBULAR` (Cinta ID: `VERDE / MORADO`) / `PLANA` (`N/A`), Trama `1800 - 2000`, Urdimbre `1800 - 2000`.
     - `6.0 oz/yd²`: `TUBULAR` (Cinta ID: `ROJO`), Trama `1800 - 2000`, Urdimbre `1800 - 2000`.
     - `6.5 oz/yd²`: `TUBULAR` (Cinta ID: `ROJO`) / `PLANA` (`N/A`), Trama `2000`, Urdimbre `2000` / `2100`.
     - `7.2 oz/yd²`: `TUBULAR` (Cinta ID: `AZUL`) / `PLANA` (`N/A`), Trama `2000 - 2300`, Urdimbre `2100`.
     - `8.0 oz/yd²`: `TUBULAR` (Cinta ID: `AZUL`), Trama `2000 - 2300`, Urdimbre `2100`.
     - **Consideraciones Generales Estrictas**:
       - `CINTA DE IDENTIFICACIÓN DENIER 2300 (3mm)`.
       - `TODAS LAS TELAS PLANAS NO LLEVAN CINTA DE IDENTIFICACIÓN`.
       - `CONSIDERAR COMO RESTRICCIÓN PARA LAS TELAS TUBULARES O PLANAS DE 6.5 OZ A 8.0 OZ NO SE PUEDE EMPLEAR TRAMA NI URDIMBRE DENIER 1800`.
   - **Página 2 (Codificación Oficial de Rollos)**:
     - Formato: `[NÚMERO DE TELAR (1 al 21)]-[TURNO DE TRABAJO (1°, 2°, 3°)]-[NÚMERO DE ROLLO]-[NÚMERO DE NÓMINA]` (Ejemplo: `10-3-24-1200`).
4. **Documento Interno `docs/Extrusión/TIPOS DE CINTA DE EXTRUSION.pdf`**:
   - Define el catálogo oficial de cintas PTI por extrusora:
     - **Extrusora 1**: Rafia `4600`, `3000`, `5190` → destino fijo a **Telares Banda (`TB`, Telares 18–21)**.
     - **Extrusoras 2, 4 y 5**: Trama y Urdimbre (`1200`, `1800`, `2000`, `2100`, `2200`, `2300`) → destino fijo a **Telares Rollo (`TR`, Telares 1–17)**.

## 3. Arquitectura Actual del Módulo Telares en el Repositorio

### 3.1 Backend (`backend/src/modules/telares/`)
- **Rutas y Controlador**: `telares.routes.js`, `telares.controller.js`.
- **Servicio de Dominio**: `telares.service.js`.
- **Modelos Sequelize (`backend/src/modules/telares/models/`)**:
  - `Loom` (`looms`): 21 máquinas numeradas del 1 al 21 (`1–17` en subárea `Telares Rollo [TR]`, `18–21` en subárea `Telares Banda [TB]`), con `creel_capacity_spools` (1,800 bobinas), `current_spools_count`, `current_wip_kg`, `supported_pti_types`, `supported_bom_ids`.
  - `LoomPtiWip` (`loom_pti_wip_items`): inventario WIP cargado en la fileta/creel de cada telar, con trazabilidad a `source_rack_id`, `source_production_entry_id`, `source_qr_code`, `quantity_received_spools`, `quantity_remaining_spools`, `unit_weight_kg`, `unit_cost_per_kg`.
  - `ProductionBom` (`production_boms`) y `ProductionBomItem` (`production_bom_items`): fichas técnicas de salida (`ROLLO_TELA`, `BANDA`, `CINTA`) y su relación N:N con `PtiProduct` (`URDIMBRE`, `TRAMA`, `REFUERZO`, `AMBOS`).
  - `LoomRun` (`loom_runs`): corridas activas e históricas por telar y turno (`EN_PROCESO`, `FINALIZADA`).
  - `ViajeroRoll` (`viajero_rolls`), `ViajeroRollOperatorSegment` (`viajero_roll_operator_segments`), `ViajeroRoutingLog` (`viajero_routing_logs`): rollos/salidas producidas con código oficial `10-3-24-1200`, QR viajero, segmentos de operadores por turno y bitácora de enrutamiento.
  - `LoomBackflushConsumption` (`loom_backflush_consumptions`): deducciones FIFO de bobinas/kg desde `LoomPtiWip` por cada rollo terminado.
  - `SystemSetting` (`system_settings`): configuración de modo de transferencia `telares.pti_transfer_mode` (`RACK_PARTIAL` o `CART_FULL`).

### 3.2 Frontend (`frontend/src/modules/telares/`)
- **Páginas**:
  - `TelaresDashboard.tsx` (`/telares`): panel ejecutivo de estado de telares, KPIs, alertas de abasto PTI y accesos rápidos.
  - `TelaresTerminalPage.tsx` (`/telares/terminal`): estación operativa táctil para recepción de PTI en fileta, arranque de corrida, registro de rollo terminado y emisión de etiqueta QR Viajero.
  - `TelaresCatalogPage.tsx` (`/telares/catalogos`): administración de fichas técnicas (`ProductionBom`), máquinas (`Loom`), modo de custodia PTI y matriz de compatibilidad.
  - `TelaresOperatorsPage.tsx` (`/telares/operadores`): catálogo de operadores y supervisores con número de nómina para codificación de rollos.
  - `RoutingStationTerminalPage.tsx` (`/telares/estacion-ruteo`): terminal de validación de llegada de QR Viajero en estaciones posteriores.
  - `ViajeroTrackerPage.tsx` (`/telares/trazabilidad`): buscador y árbol genealógico completo (Rollo → Backflush → PTI Extrusión → Mezcla → Silo/Lote MP).
