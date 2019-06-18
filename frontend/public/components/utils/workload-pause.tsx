import * as React from 'react';
import { Alert, AlertActionLink } from '@patternfly/react-core';

import { K8sKind, k8sPatch, K8sResourceKind } from '../../module/k8s/index';
import { errorModal } from '../modals/index';

export const togglePaused = (model: K8sKind, obj: K8sResourceKind) => {
  const patch = [{
    path: '/spec/paused',
    op: 'add',
    value: !obj.spec.paused,
  }];

  return k8sPatch(model, obj, patch);
};

export const WorkloadPausedAlert = ({model, obj}) => {
  return <Alert
    className="co-alert co-workload-paused__alert"
    variant="info"
    title={<React.Fragment><b>{obj.metadata.name} is paused.</b> This will stop any new rollouts or triggers from running until resumed.</React.Fragment>}
    action={<AlertActionLink onClick={() => togglePaused(model, obj).catch((err) => errorModal({error: err.message}))}>Resume Rollouts</AlertActionLink>}
  />;
};
