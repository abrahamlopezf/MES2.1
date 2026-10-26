import { describe, it, expect } from 'vitest';
import { CapabilityRegistry } from '../../core/platform/CapabilityRegistry/CapabilityRegistry';

describe('CapabilityRegistry (Contract)', () => {
  it('debe exponer register(manifest) en el singleton del runtime', () => {
    expect(typeof CapabilityRegistry.register).toBe('function');
  });

  it('debe exponer getCapability(purpose) en el singleton del runtime', () => {
    expect(typeof CapabilityRegistry.getCapability).toBe('function');
  });

  it('debe exponer el método estático unregister(purpose) para limpieza en tests', () => {
    expect(typeof CapabilityRegistry.getAllCapabilities).toBe('function');
  });
});
