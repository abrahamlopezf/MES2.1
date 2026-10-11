# Manual de Usuario - Sistema MES / Industrial ERP

Este manual detalla paso a paso las operaciones principales dentro del sistema, abarcando desde la gestión de catálogos y códigos QR, hasta las entradas, bajas y órdenes de consumo en almacén.

---

## 1. Gestión de Usuarios
**Objetivo:** Administrar los accesos al sistema, roles y permisos de los operadores y administradores.

### Dar de alta un usuario
1. Dirígete a la sección de **Configuración** o **Usuarios** en el menú principal.
2. Haz clic en el botón **"Nuevo Usuario"** (botón azul con icono de "+").
3. Llena el formulario con los siguientes datos:
   - **Nombre completo:** Nombre del empleado.
   - **Correo electrónico:** Será el usuario para iniciar sesión.
   - **Rol:** Selecciona el rol correspondiente (ej. SUPERADMIN, ADMIN_ALM, OPERADOR). *El rol define qué puede hacer y ver en el sistema.*
   - **Área / Subárea:** Asigna el área de trabajo a la que pertenece.
4. Haz clic en **"Guardar"**. El sistema generará el usuario y se le podrá asignar una contraseña.
   *[📸 INSERTAR CAPTURA: Formulario de Nuevo Usuario]*

### Eliminar o desactivar un usuario
1. En la lista de usuarios, busca al usuario que deseas modificar.
2. Haz clic en el menú de **tres puntos verticales (⋮)** al final de la fila del usuario.
3. Selecciona **"Editar"** para cambiar su información, o **"Desactivar" / "Eliminar"** (marcado en rojo).
4. El sistema pedirá una confirmación. Al aceptar, el usuario ya no podrá ingresar al sistema.
   *[📸 INSERTAR CAPTURA: Menú de acciones en la fila del usuario]*

---

## 2. Generación y Uso de Lotes de QR
**Objetivo:** Los códigos QR son la base de la trazabilidad del sistema. Representan "etiquetas vacías" que se imprimen en lote y posteriormente se pegan en la mercancía física para asignarle un material y registrar su ingreso al almacén.

### ¿Para qué sirven?
El operador no necesita teclear códigos de barras largos ni números de serie. Simplemente toma un rollo de etiquetas QR previamente impresas, pega una etiqueta en un nuevo material que llegó, y escanea el QR con su dispositivo para decirle al sistema: *"Este QR ahora contiene 50 litros del Material X"*.

### Cómo crear un lote de QR
1. En el menú principal, navega a **Trazabilidad > Generación de QR**.
2. Haz clic en **"Nuevo Lote de QR"**.
3. Ingresa la cantidad de etiquetas que deseas generar (ej. 100, 500).
4. Opcionalmente, asigna un área si estos QR son de uso exclusivo para un departamento.
5. Haz clic en **"Generar"**. 
6. El sistema creará el lote y habilitará un botón de **"Imprimir Lote"** para descargar el PDF con todos los códigos listos para mandarse a la impresora térmica.
   *[📸 INSERTAR CAPTURA: Pantalla de Generación de Lote QR y vista de impresión]*

---

## 3. Creación de un Material Nuevo (Maestro de Materiales)
**Objetivo:** Registrar en la base de datos la existencia de un nuevo tipo de insumo, herramienta o materia prima, asegurando que cuente con su proveedor y todas las clasificaciones necesarias.

### Paso 3.1: Registrar un Proveedor
1. Ve a **Catálogos > Proveedores**.
2. Haz clic en **"Nuevo Proveedor"**.
3. Llena los datos comerciales: Nombre, RFC, Contacto, Teléfono, Email y Dirección.
4. Haz clic en **"Guardar"**.
   *[📸 INSERTAR CAPTURA: Formulario de nuevo proveedor]*

### Paso 3.2: Registrar el Material
1. Ve a **Catálogos > Materiales**.
2. Haz clic en **"Nuevo Material"**.
3. **Pestaña de Información General:**
   - **Familia y Artículo:** Selecciona la familia (ej. Plásticos) y el sub-artículo.
   - **Nombre:** Nombre comercial o interno del material.
   - **Descripción:** Detalles opcionales.
   - **Tipo y Marca:** Selecciona de los menús desplegables.
4. **Pestaña de Inventario y Almacenaje:**
   - **Localidad por defecto:** ¿En qué pasillo/estante se guarda normalmente? (Ej. A1-05).
   - **Unidad de Medida:** Ej. Litros, Piezas, Kg.
   - **Stock Mínimo / Máximo:** (Muy importante para generar alertas de compra).
   - **Proveedor:** Selecciona el proveedor creado en el Paso 3.1.
5. Haz clic en **"Guardar Material"**.
   *[📸 INSERTAR CAPTURA: Formulario de nuevo material (Pestaña 1 y Pestaña 2)]*

---

## 4. Edición o Eliminación en los Catálogos
**Objetivo:** Mantener actualizado el "Master Data" (Familias, Artículos, Tipos, Marcas, Unidades, Localidades).

1. Navega a cualquiera de los catálogos desde el menú lateral (ej. **Catálogos > Marcas**).
2. Verás una tabla o lista de tarjetas con todos los registros.
3. Para editar, haz clic en los **tres puntos verticales (⋮)** a la derecha del registro y selecciona **"Editar"**.
4. Para eliminar/desactivar, selecciona **"Eliminar"**.
   - *Nota de integridad:* El sistema nunca borra físicamente un registro si ya ha sido usado en el almacén (para evitar dañar el historial). En su lugar, lo marca como "Inactivo" para que ya no aparezca en los nuevos ingresos.
   *[📸 INSERTAR CAPTURA: Lista de catálogo y menú desplegable de acciones]*

---

## 5. Ingreso de Material (Recepción)
**Objetivo:** Dar entrada al inventario de los materiales físicos que llegan al almacén.

### Ingreso con Código QR (Recomendado)
1. Pega un código QR impreso (previamente generado) en el empaque o tambo del material que llegó.
2. Abre la pantalla de **Recepción / Escáner** (o usa un dispositivo móvil).
3. **Escanea el código QR**. 
4. El sistema detectará que el QR está vacío (estado: CREADO) y abrirá el formulario de asignación.
5. Busca el material en el menú desplegable.
6. Ingresa la **cantidad recibida** y, si aplica, el número de factura o lote del proveedor.
7. Haz clic en **"Registrar Ingreso"**. El QR ahora pasa al estado `ACTIVO` y el stock se suma al inventario.
   *[📸 INSERTAR CAPTURA: Pantalla de Escaneo y Formulario de Ingreso]*

### Ingreso Manual (Sin QR)
1. Ve a **Inventario > Entradas (Ingreso Manual)**.
2. Selecciona el material directamente del catálogo. (El sistema mostrará el nombre, la localidad predeterminada, etc.).
3. Ingresa la cantidad.
4. El sistema asignará automáticamente un código interno corto (ej. `286`) que podrás usar para futuras referencias o bajas si no se cuenta con lector QR.
   *[📸 INSERTAR CAPTURA: Pantalla de Ingreso Manual]*

---

## 6. Baja de Material / Lotes
**Objetivo:** Retirar stock del inventario por motivos ajenos a la producción normal (ej. Caducidad, Merma, Daño, Calibración).

1. Ve a **Inventario > Baja de Materiales**.
2. Escanea el código QR del material, o busca manualmente el número corto/lote (ej. `286`).
3. El sistema desplegará una tarjeta con la información actual de ese lote (Material, Cantidad disponible actual).
4. Selecciona el **Tipo de Baja** (ej. Merma, Desperdicio, Caducidad).
5. Ingresa la **Cantidad a dar de baja**. (El sistema validará automáticamente que no ingreses una cantidad mayor a la que existe en el lote).
6. Escribe una justificación u observaciones.
7. Haz clic en **"Confirmar Baja"**.
8. **¿Dónde se refleja?** La cantidad se resta inmediatamente del stock del lote y del stock global del material. Esto se puede consultar en **Inventario > Historial de Movimientos** y en el Kardex del material.
   *[📸 INSERTAR CAPTURA: Formulario de Baja de Material validando cantidad]*

---

## 7. Órdenes de Consumo (Surtimiento a Producción)
**Objetivo:** El flujo central del almacén. Producción solicita materiales, almacén los prepara y los entrega.

### Paso 7.1: Crear la Orden
1. Ve a **Órdenes > Nueva Orden de Consumo**.
2. Selecciona el Área o Máquina solicitante.
3. Agrega los materiales necesarios y la cantidad requerida de cada uno.
4. Haz clic en **"Crear Orden"**. La orden nace en estado `PENDIENTE`.
   *[📸 INSERTAR CAPTURA: Creación de Orden de Consumo]*

### Paso 7.2: Administrar y Surtir
1. El almacenista abre la orden desde el listado de **Órdenes de Consumo**.
2. Hace clic en **"Surtir"** o **"Preparar"**.
3. El sistema despliega la lista de lo solicitado. El almacenista **escanea los códigos QR** de los tambos/paquetes físicos que va a entregar.
4. Al escanear, el sistema valida si es el material correcto y resta la cantidad correspondiente.
5. Si un QR contiene 50 Litros y la orden pide 20, el sistema debita 20 del QR (dejando 30) y marca la partida como completada.
6. Una vez surtidas todas las partidas, la orden pasa a estado `COMPLETADA`.
   *[📸 INSERTAR CAPTURA: Vista de surtido de orden escaneando un QR]*

### Paso 7.3: Cancelar una Orden
- Si una orden `PENDIENTE` ya no se necesita, se puede hacer clic en **"Cancelar Orden"**.
- Pedirá confirmación y motivo. Una vez cancelada, no afecta al inventario y pasa a estado `CANCELADA`.
   *[📸 INSERTAR CAPTURA: Botón de cancelar orden]*

---

## 8. Dashboard Principal
**Objetivo:** Ofrecer una visión ejecutiva del estado general de la planta en tiempo real.

- **Tarjetas de Resumen (KPIs):** Muestran el número total de materiales, el valor del inventario, órdenes de consumo pendientes de hoy y alertas críticas.
- **Gráfica de Movimientos:** Refleja la tendencia de entradas vs. salidas a lo largo de los últimos 7, 15 o 30 días, permitiendo ver qué días hay más flujo.
- **Stock Bajo (Advertencia):** Un panel lateral o tabla incrustada que muestra inmediatamente qué materiales están por debajo de su límite de seguridad.
- **Actividad Reciente:** Un registro (feed) en vivo de quién dio de alta un material, quién surtió una orden o qué lote se dio de baja.
   *[📸 INSERTAR CAPTURA: Vista completa del Dashboard]*

---

## 9. Reporte de Stock Bajo (Para Compras)
**Objetivo:** Identificar qué insumos están a punto de agotarse para solicitar su abastecimiento oportuno.

1. Navega a **Inventario > Lista de Materiales (Stock)**.
2. En la parte superior, localiza la tarjeta o botón de filtro rápido llamado **"Stock Crítico"** o **"Por debajo del mínimo"**.
3. Al hacer clic, la tabla se filtrará automáticamente mostrando **únicamente** los materiales cuya "Cantidad Actual" es menor o igual a su "Stock Mínimo" configurado en el Paso 3.2.
4. Puedes exportar esta vista a Excel o imprimirla para enviarla directamente al departamento de Compras.
   *[📸 INSERTAR CAPTURA: Tabla de inventario filtrada por Stock Bajo]*
