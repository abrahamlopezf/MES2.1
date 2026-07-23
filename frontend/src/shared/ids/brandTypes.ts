// Definición de Brand Types (Tipos Nominales) para evitar mezclar IDs en TypeScript.

export type Brand<K, T> = K & { __brand: T };

// Identidad y Trazabilidad
export type IdentityTokenId = Brand<string, 'IdentityTokenId'>;
export type TraceableItemId = Brand<string, 'TraceableItemId'>;
export type TraceabilityMovementId = Brand<string, 'TraceabilityMovementId'>;
export type QrBatchId = Brand<string, 'QrBatchId'>;

// Organización Multi-Planta
export type OrganizationId = Brand<string, 'OrganizationId'>;
export type BusinessUnitId = Brand<string, 'BusinessUnitId'>;
export type PlantId = Brand<string, 'PlantId'>;
export type AreaId = Brand<string, 'AreaId'>;
export type SubAreaId = Brand<string, 'SubAreaId'>;

// Operación y Piso
export type ProcessRunId = Brand<string, 'ProcessRunId'>;
export type ScrapContainerId = Brand<string, 'ScrapContainerId'>;
export type OrderId = Brand<string, 'OrderId'>;
export type WarehouseId = Brand<string, 'WarehouseId'>;
export type StorageRackId = Brand<string, 'StorageRackId'>;

// Auth
export type UserId = Brand<string, 'UserId'>;
export type RoleId = Brand<string, 'RoleId'>;

// Helpers para crear IDs
export const createIdentityTokenId = (id: string) => id as IdentityTokenId;
export const createPlantId = (id: string) => id as PlantId;
// ... (agregar los demás helpers según se necesiten)
