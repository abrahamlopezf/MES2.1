import { describe, it, expect } from 'vitest';
import { EventBus } from '../../../core/platform/EventBus/EventBus';

describe('EventBus (Contract)', () => {
  it('debe exponer el método emit(event, payload)', () => {
    expect(typeof EventBus.emit).toBe('function');
  });

  it('debe exponer el método on(event, callback) que retorna unsubscribe', () => {
    expect(typeof EventBus.on).toBe('function');
    const unsubscribe = EventBus.on('DUMMY', () => {});
    expect(typeof unsubscribe).toBe('function');
  });

  // Si existe en un futuro
  it('debe exponer el método once(event, callback)', () => {
    // expect(typeof EventBus.once).toBe('function');
  });
});
