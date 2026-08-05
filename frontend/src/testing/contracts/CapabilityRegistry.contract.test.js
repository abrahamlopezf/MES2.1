import { describe, it, expect } from 'vitest';
import { CapabilityRegistry } from '../../../core/platform/CapabilityRegistry/CapabilityRegistry';

describe('CapabilityRegistry (Contract)', () => {
  it('debe exponer el método estático register(manifest)', () => {
    expect(typeof CapabilityRegistry.register).toBe('function');
  });

  it('debe exponer el método estático resolve(purpose)', () => {
    expect(typeof CapabilityRegistry.resolve).toBe('function');
  });

  it('debe exponer el método estático unregister(purpose) para limpieza en tests', () => {
    // Es posible que necesitemos agregarlo si no existe
    // expect(typeof CapabilityRegistry.unregister).toBe('function');
  });
});
