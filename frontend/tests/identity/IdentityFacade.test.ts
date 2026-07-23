import { describe, it, expect, vi } from 'vitest';
import { GenerateBatchRequestDTO } from '../../src/modules/identity/application/dto/GenerateBatchDTOs';
import { IdentityUseCaseFacadeImpl } from '../../src/modules/identity/infrastructure/facades/IdentityUseCaseFacadeImpl';
import { GenerateBatchHandler } from '../../src/modules/identity/application/handlers/GenerateBatchHandler';
import { IdentityCommandRepository } from '../../src/modules/identity/domain/repositories/IdentityRepository';
import { IndustrialCodeGeneratorPort } from '../../src/modules/identity/domain/ports/IndustrialCodeGeneratorPort';
import { DomainEventBus, UuidGeneratorPort, ClockPort } from '../../src/shared/domain/ports/DomainPorts';

describe('IdentityUseCaseFacade Contract Test', () => {
  it('Debe aceptar DTO y devolver DTO sin filtrar clases de Dominio hacia la UI', async () => {
    
    // Mocks de los puertos y adaptadores
    const mockRepo: IdentityCommandRepository = {
      findBatch: vi.fn(),
      findToken: vi.fn(),
      findRequest: vi.fn(),
      saveBatch: vi.fn().mockResolvedValue(undefined),
      saveToken: vi.fn(),
      saveRequest: vi.fn(),
    };
    const mockCodeGenerator: IndustrialCodeGeneratorPort = {
      generateCodes: vi.fn().mockResolvedValue([{ value: 'MTY-26-EXT-000001' }]),
    };
    const mockEventBus: DomainEventBus = { publish: vi.fn(), publishAll: vi.fn() };
    const mockUuidGenerator: UuidGeneratorPort = { generate: () => 'fake-uuid' };
    const mockClock: ClockPort = { now: () => new Date('2026-07-21T00:00:00Z') };

    const handler = new GenerateBatchHandler(mockRepo, mockCodeGenerator, mockEventBus, mockUuidGenerator, mockClock);
    const facade = new IdentityUseCaseFacadeImpl(handler);

    // DTO de entrada simulado (Lo que manda la UI)
    const requestDTO: GenerateBatchRequestDTO = {
      plantId: 'MTY',
      areaId: 'EXT',
      tokenType: 'QR',
      amount: 1,
      requestedBy: 'user-123'
    };

    // Act
    const responseDTO = await facade.generateBatch(requestDTO);

    // Assert (Contrato estricto, no debe haber objetos complejos, entidades ni arreglos de instancias Aggregate)
    expect(responseDTO).toBeDefined();
    expect(typeof responseDTO.batchId).toBe('string');
    expect(typeof responseDTO.batchNumber).toBe('string');
    expect(typeof responseDTO.generatedAmount).toBe('number');
    expect(typeof responseDTO.message).toBe('string');

    // Validación de fronteras
    // La respuesta no debe exponer métodos del agregado ni arreglos sin serializar.
    expect((responseDTO as any).tokens).toBeUndefined(); // Para el Slice 1, decidimos no retornar el array enorme
    expect(responseDTO.batchNumber).toContain('MTY');
  });
});
