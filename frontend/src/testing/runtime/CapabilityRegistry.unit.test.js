import { describe, it, expect, beforeEach } from 'vitest';
import { CapabilityRegistry } from '../../core/platform/CapabilityRegistry/CapabilityRegistry';

describe('CapabilityRegistry (Unit)', () => {
  beforeEach(() => {
    // Limpiar el estado antes de cada prueba (suponiendo que haya un reset)
    // O mockear lo necesario. Aquí probaremos directo el módulo.
    CapabilityRegistry.capabilities = new Map();
  });

  it('debe registrar una capacidad exitosamente (happy path)', () => {
    const manifest = {
      purpose: 'RECEPTION',
      permissions: ['CAN_RECEIVE'],
      workflow: 'ReceptionWorkflow',
      workspace: () => null
    };
    
    CapabilityRegistry.register(manifest);
    expect(CapabilityRegistry.capabilities.has('RECEPTION')).toBe(true);
  });

  it('debe reemplazar una capacidad registrada con el mismo purpose', () => {
    const manifest = {
      purpose: 'RECEPTION',
      permissions: [],
      workflow: 'W1',
      workspace: () => null
    };
    CapabilityRegistry.register(manifest);
    
    const replacement = { ...manifest, workflow: 'W2' };
    CapabilityRegistry.register(replacement);
    expect(CapabilityRegistry.getCapability('RECEPTION').workflow).toBe('W2');
  });

  it('debe fallar si el manifest no incluye la propiedad workspace', () => {
    const invalidManifest = {
      purpose: 'INVALID',
      workflow: 'W1'
    };
    expect(() => CapabilityRegistry.register(invalidManifest))
      .toThrow(/Faltan propiedades obligatorias/);
  });

  it('debe resolver correctamente una capacidad existente', () => {
    const manifest = {
      purpose: 'EXTRUSION',
      permissions: [],
      workflow: 'ExtrusionWorkflow',
      workspace: () => null
    };
    CapabilityRegistry.register(manifest);
    
    const cap = CapabilityRegistry.getCapability('EXTRUSION');
    expect(cap).toBeDefined();
    expect(cap.purpose).toBe('EXTRUSION');
  });

  it('debe fallar al resolver una capacidad no registrada', () => {
    expect(() => CapabilityRegistry.getCapability('UNKNOWN'))
      .toThrow(/No se encontró ninguna capacidad registrada/);
  });
});
