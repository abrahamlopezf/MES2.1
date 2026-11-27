export const getTransferSourceCopy = (mode: string) => mode === 'RACK_PARTIAL'
  ? {
    heading: 'Rack PTI de Extrusión:',
    count: 'racks con bobinas',
    placeholder: '-- Seleccionar Rack Disponible --',
  }
  : {
    heading: 'Carrito PTI de Extrusión:',
    count: 'carritos con bobinas',
    placeholder: '-- Seleccionar Carrito Disponible --',
  };
