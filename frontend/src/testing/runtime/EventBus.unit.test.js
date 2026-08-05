import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../../core/platform/EventBus/EventBus';

describe('EventBus (Unit)', () => {
  beforeEach(() => {
    EventBus.listeners = new Map(); // Reset internal state
  });

  it('debe permitir suscribirse a un evento y recibir la notificación', () => {
    const callback = vi.fn();
    EventBus.on('TEST_EVENT', callback);
    
    EventBus.emit('TEST_EVENT', { data: 123 });
    
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({ data: 123 });
  });

  it('debe permitir desuscribirse de un evento', () => {
    const callback = vi.fn();
    const unsubscribe = EventBus.on('TEST_EVENT', callback);
    
    unsubscribe();
    EventBus.emit('TEST_EVENT', { data: 123 });
    
    expect(callback).not.toHaveBeenCalled();
  });

  it('debe manejar múltiples listeners en el orden de suscripción', () => {
    const order = [];
    EventBus.on('TEST_EVENT', () => order.push(1));
    EventBus.on('TEST_EVENT', () => order.push(2));
    
    EventBus.emit('TEST_EVENT', {});
    
    expect(order).toEqual([1, 2]);
  });

  it('no debe bloquearse si un listener lanza una excepción', () => {
    const callbackFailing = vi.fn(() => { throw new Error('Crash'); });
    const callbackSuccess = vi.fn();
    
    EventBus.on('TEST_EVENT', callbackFailing);
    EventBus.on('TEST_EVENT', callbackSuccess);
    
    // El bus debería atrapar el error interno y continuar
    EventBus.emit('TEST_EVENT', {});
    
    expect(callbackFailing).toHaveBeenCalledTimes(1);
    expect(callbackSuccess).toHaveBeenCalledTimes(1);
  });

  it('debe manejar emisiones simultáneas sin pérdida de eventos', () => {
    const callback = vi.fn();
    EventBus.on('BULK_EVENT', callback);
    
    for(let i=0; i<100; i++) {
      EventBus.emit('BULK_EVENT', { i });
    }
    
    expect(callback).toHaveBeenCalledTimes(100);
  });
});
