import { CapabilityRegistry } from '../../core/platform/CapabilityRegistry/CapabilityRegistry';
import { ReceptionManifest } from './manifest';
import { ReceptionWorkspace } from './ReceptionWorkspace';
import { ReceptionProvider } from './ReceptionProvider';

// Esta función permite al Runtime inyectar la dependencia de React de forma perezosa
export const registerReceptionCapability = () => {
  CapabilityRegistry.register({
    ...ReceptionManifest.capability,
    ...ReceptionManifest.runtime,
    workflow: ReceptionManifest.workspace.workflow,
    workspace: () => ReceptionProvider // Factory lazy para el Provider
  });
};
