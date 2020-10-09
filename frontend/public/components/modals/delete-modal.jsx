import * as _ from 'lodash-es';
import * as React from 'react';
import { Alert } from '@patternfly/react-core';
import { Trans, useTranslation } from 'react-i18next';

import { createModalLauncher, ModalTitle, ModalBody, ModalSubmitFooter } from '../factory/modal';
import { history, resourceListPathFromModel } from '../utils';
import { k8sKill, referenceForOwnerRef } from '../../module/k8s/';
import { YellowExclamationTriangleIcon } from '@console/shared';
import { ClusterServiceVersionModel } from '@console/operator-lifecycle-manager/src/models';
import { findOwner } from '../../module/k8s/managed-by';
import { k8sList } from '../../module/k8s/resource';
import { ResourceLink } from '../utils/resource-link';

//Modal for resource deletion and allows cascading deletes if propagationPolicy is provided for the enum
const DeleteModal = (props) => {
  const [isChecked, setChecked] = React.useState(true);
  const [owner, setOwner] = React.useState(null);
  const { t } = useTranslation();
  const { cancel, errorMessage, kind, message, resource } = props;

  const namespace = resource?.metadata?.namespace;
  if (!namespace || !resource?.metadata?.ownerReferences?.length) {
    return;
  }
  k8sList(ClusterServiceVersionModel, { ns: namespace })
    .then((data) => {
      const resourceOwner = findOwner(resource, data);
      setOwner(resourceOwner);
    })
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error('Could not fetch CSVs', e);
    });

  const submit = (event) => {
    event.preventDefault();
    const { close } = props;

    //https://kubernetes.io/docs/concepts/workloads/controllers/garbage-collection/
    const propagationPolicy = isChecked ? kind.propagationPolicy : 'Orphan';
    const json = propagationPolicy
      ? { kind: 'DeleteOptions', apiVersion: 'v1', propagationPolicy }
      : null;

    this.handlePromise(k8sKill(kind, resource, {}, json)).then(() => {
      close();

      // If we are currently on the deleted resource's page, redirect to the resource list page
      const re = new RegExp(`/${resource.metadata.name}(/|$)`);
      if (re.test(window.location.pathname)) {
        const listPath = props.redirectTo
          ? props.redirectTo
          : resourceListPathFromModel(kind, _.get(resource, 'metadata.namespace'));
        history.push(listPath);
      }
    });
  };

  return (
    <form onSubmit={submit} name="form" className="modal-content ">
      <ModalTitle>
        <YellowExclamationTriangleIcon className="co-icon-space-r" />{' '}
        {t('modal~Delete {{kind}}?', { kind: kind.label })}
      </ModalTitle>
      <ModalBody className="modal-body">
        {message}
        <div>
          {_.has(resource.metadata, 'namespace') ? (
            <Trans ns="modal" t={t}>
              Are you sure you want to delete{' '}
              <strong className="co-break-word">{{ resourceName: resource.metadata.name }}</strong>
              <span>
                {' '}
                in namespace <strong>{{ namespace: resource.metadata.namespace }}</strong>
              </span>
              ?
            </Trans>
          ) : (
            <Trans ns="modal" t={t}>
              Are you sure you want to delete{' '}
              <strong className="co-break-word">{{ resourceName: resource.metadata.name }}</strong>?
            </Trans>
          )}
          {_.has(kind, 'propagationPolicy') && (
            <div className="checkbox">
              <label className="control-label">
                <input
                  type="checkbox"
                  onChange={() => setChecked(!this.state.isChecked)}
                  checked={!!isChecked}
                />
                {t('modal~Delete dependent objects of this resource')}
              </label>
            </div>
          )}
          {owner && (
            <Alert
              className="co-alert co-alert--margin-top"
              isInline
              variant="warning"
              title={t('modal~Managed resource')}
            >
              This resource is managed by{' '}
              <ResourceLink
                className="modal__inline-resource-link"
                inline
                kind={referenceForOwnerRef(owner)}
                name={owner.name}
                namespace={resource.metadata.namespace}
              />{' '}
              and any modifications may be overwritten. Edit the managing resource to preserve
              changes.
            </Alert>
          )}
        </div>
      </ModalBody>
      <ModalSubmitFooter
        inProgress={false}
        errorMessage={errorMessage}
        submitDanger
        submitText={props.btnText || t('modal~Delete')}
        cancel={cancel}
      />
    </form>
  );
};

export const deleteModal = createModalLauncher(DeleteModal);
