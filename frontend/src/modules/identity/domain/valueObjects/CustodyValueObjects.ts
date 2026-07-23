// TODO: CustodyOwner idealmente sería un PlantId o AreaId en un futuro. 
// Por ahora, se representa como string strongly-typed.
export type CustodyOwner = string;

export enum TransferReason {
  PRODUCTION_START = 'PRODUCTION_START',
  QUALITY_CHECK = 'QUALITY_CHECK',
  STORAGE = 'STORAGE',
  REWORK = 'REWORK',
  SCRAP = 'SCRAP'
}
