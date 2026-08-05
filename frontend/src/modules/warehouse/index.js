import { CapabilityRegistry } from '../../core/platform/CapabilityRegistry/CapabilityRegistry';
import { WarehouseManifest } from './manifest';
import { WarehouseProvider } from './WarehouseProvider';

export const registerWarehouseCapability = () => {
  CapabilityRegistry.register({
    ...WarehouseManifest.capability,
    ...WarehouseManifest.runtime,
    workflow: WarehouseManifest.workspace.workflow,
    workspace: () => WarehouseProvider
  });
};
