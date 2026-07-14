import { ErpStatus } from '../config/statusConfig';
import { AllowedAction } from '../qr-workspace/types/qr-workspace.types';

export interface WorkflowContext<TEntity = any> {
  entity: TEntity;
  current_state: ErpStatus;
  allowed_actions: AllowedAction[];
  required_inputs: Record<string, any>; // Ej. { weight: "number", destination: "string" }
  next_possible_states: ErpStatus[];
}
