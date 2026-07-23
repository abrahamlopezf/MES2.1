import { MixBatch } from '../../domain/entities/MixBatch';
import { MixTransformation } from '../../domain/entities/MixTransformation';
import { MachineHealthState } from '../../domain/entities/MachineHealthState';
import { StationExecutionState } from '../../domain/entities/StationExecutionState';
import { ExtrusionTransformation } from '../../domain/entities/ExtrusionTransformation';
import { Rack } from '../../domain/entities/Rack';

export interface ProductionRepository {
  saveMixBatch(batch: MixBatch): Promise<void>;
  saveMixTransformation(transformation: MixTransformation): Promise<void>;
  
  saveExtrusionTransformation(transformation: ExtrusionTransformation): Promise<void>;
  getExtrusionTransformation(id: string): Promise<ExtrusionTransformation | null>;
  
  saveRack(rack: Rack): Promise<void>;
  getRack(id: string): Promise<Rack | null>;
  
  getMachineHealth(machineId: string): Promise<MachineHealthState | null>;
  saveMachineHealth(state: MachineHealthState): Promise<void>;
  getAllMachineHealths(): Promise<MachineHealthState[]>;
  
  getStationExecution(stationId: string): Promise<StationExecutionState | null>;
  saveStationExecution(state: StationExecutionState): Promise<void>;
  getAllStationExecutions(): Promise<StationExecutionState[]>;
}
