import { K8sResourceKind, MachineKind, NodeKind } from '@console/internal/module/k8s';
import { HostMultiStatus } from '../utils/host-status';

export type HostRowBundle = K8sResourceKind & {
  machine: MachineKind;
  node: NodeKind;
  host: K8sResourceKind;
  nodeMaintenance: K8sResourceKind;
  status: HostMultiStatus;
};
