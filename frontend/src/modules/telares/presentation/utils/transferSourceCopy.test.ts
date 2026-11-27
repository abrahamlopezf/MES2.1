import { describe, expect, it } from 'vitest';
import { getTransferSourceCopy } from './transferSourceCopy';

describe('getTransferSourceCopy', () => {
  it('uses rack labels in partial rack transfer mode', () => {
    expect(getTransferSourceCopy('RACK_PARTIAL')).toEqual({
      heading: 'Rack PTI de Extrusión:',
      count: 'racks con bobinas',
      placeholder: '-- Seleccionar Rack Disponible --',
    });
  });

  it('keeps cart labels in full cart transfer mode', () => {
    expect(getTransferSourceCopy('CART_FULL')).toEqual({
      heading: 'Carrito PTI de Extrusión:',
      count: 'carritos con bobinas',
      placeholder: '-- Seleccionar Carrito Disponible --',
    });
  });
});
