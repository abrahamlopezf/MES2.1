import { describe, it, expect, beforeEach } from 'vitest';
import { CapabilityRegistry } from '../../../core/platform/CapabilityRegistry/CapabilityRegistry';

describe('CapabilityRegistry (Unit)', () => {
  beforeEach(() => {
    // Limpiar el estado antes de cada prueba (suponiendo que haya un reset)
    // O mockear lo necesario. Aquí probaremos directo el módulo.
    CapabilityRegistry.registry = new Map(); 
  });

  it('debe registrar una capacidad exitosamente (happy path)', () => {
    const manifest = {
      purpose: 'RECEPTION',
      permissions: ['CAN_RECEIVE'],
      workflow: 'ReceptionWorkflow',
      workspace: () => null
    };
    
    CapabilityRegistry.register(manifest);
    expect(CapabilityRegistry.registry.has('RECEPTION')).toBe(true);
  });

  it('debe fallar si se intenta registrar una capacidad con purpose duplicado', () => {
    const manifest = {
      purpose: 'RECEPTION',
      permissions: [],
      workflow: 'W1',
      workspace: () => null
    };
    CapabilityRegistry.register(manifest);
    
    expect(() => CapabilityRegistry.register(manifest))
      .toThrow(/\[MES_DUPLICATE_CAPABILITY\]/);
  });

  it('debe fallar si el manifest no incluye la propiedad workspace', () => {
    const invalidManifest = {
      purpose: 'INVALID',
      workflow: 'W1'
    };
    expect(() => CapabilityRegistry.register(invalidManifest))
      .toThrow(/\[MES_INVALID_MANIFEST\]/);
  });

  it('debe resolver correctamente una capacidad existente', () => {
    const manifest = {
      purpose: 'EXTRUSION',
      permissions: [],
      workflow: 'ExtrusionWorkflow',
      workspace: () => null
    };
    CapabilityRegistry.register(manifest);
    
    const cap = CapabilityRegistry.resolve('EXTRUSION');
    expect(cap).toBeDefined();
    expect(cap.purpose).toBe('EXTRUSION');
  });

  it('debe fallar al resolver una capacidad no registrada', () => {
    expect(() => CapabilityRegistry.resolve('UNKNOWN'))
      .toThrow(/\[MES_CAPABILITY_NOT_FOUND\]/);
  });
});
