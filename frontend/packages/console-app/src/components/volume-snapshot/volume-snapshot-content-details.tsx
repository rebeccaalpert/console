import * as React from 'react';
import {
  SectionHeading,
  ResourceSummary,
  ResourceLink,
  navFactory,
  Kebab,
  humanizeBinaryBytes,
} from '@console/internal/components/utils';
import {
  VolumeSnapshotClassModel,
  VolumeSnapshotContentModel,
  VolumeSnapshotModel,
} from '@console/internal/models';
import { referenceForModel, VolumeSnapshotContentKind } from '@console/internal/module/k8s';
import { DetailsPage, DetailsPageProps } from '@console/internal/components/factory';
import { Status } from '@console/shared';
import { useTranslation } from 'react-i18next';
import { ResourceEventStream } from '@console/internal/components/events';
import { volumeSnapshotStatus } from '../../status';

const { editYaml, events } = navFactory;

const Details: React.FC<DetailsProps> = ({ obj }) => {
  const { t } = useTranslation();
  const { deletionPolicy, driver } = obj?.spec;
  const { volumeHandle, snapshotHandle } = obj?.spec?.source || {};
  const { name: snapshotName, namespace: snapshotNamespace } = obj?.spec?.volumeSnapshotRef || {};
  const size = obj.status?.restoreSize;
  const sizeMetrics = size ? humanizeBinaryBytes(size).string : '-';

  return (
    <div className="co-m-pane__body">
      <SectionHeading
        text={t('volume-snapshot-content~{{resource}} details', {
          resource: VolumeSnapshotContentModel.label,
        })}
      />
      <div className="row">
        <div className="col-md-6 col-xs-12">
          <ResourceSummary resource={obj}>
            <dt>{t('volume-snapshot-content~Status')}</dt>
            <dd>
              <Status status={volumeSnapshotStatus(obj)} />
            </dd>
          </ResourceSummary>
        </div>
        <div className="col-md-6">
          <dl className="co-m-pane__details">
            {size && (
              <>
                <dt>{t('volume-snapshot-content~Size')}</dt>
                <dd>{sizeMetrics}</dd>
              </>
            )}
            <dt>{VolumeSnapshotModel.label}</dt>
            <dd>
              <ResourceLink
                kind={referenceForModel(VolumeSnapshotModel)}
                name={snapshotName}
                namespace={snapshotNamespace}
              />
            </dd>
            <dt>{VolumeSnapshotClassModel.label}</dt>
            <dd>
              <ResourceLink
                kind={referenceForModel(VolumeSnapshotClassModel)}
                name={obj?.spec?.volumeSnapshotClassName}
              />
            </dd>
            <dt>{t('volume-snapshot-content~Deletion Policy')}</dt>
            <dd>{deletionPolicy}</dd>
            <dt>{t('volume-snapshot-content~Driver')}</dt>
            <dd>{driver}</dd>
            {volumeHandle && (
              <>
                <dt>{t('volume-snapshot-content~Volume Handle')}</dt>
                <dd>{volumeHandle}</dd>
              </>
            )}
            {snapshotHandle && (
              <>
                <dt>{t('volume-snapshot-content~Snapshot Handle')}</dt>
                <dd>{snapshotHandle}</dd>
              </>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
};

const pages = [
  {
    href: '',
    name: 'Details',
    component: Details,
  },
  editYaml(),
  events(ResourceEventStream),
];

const VolumeSnapshotContentDetailsPage: React.FC<DetailsPageProps> = (props) => (
  <DetailsPage
    {...props}
    getResourceStatus={volumeSnapshotStatus}
    menuActions={Kebab.factory.common}
    pages={pages}
  />
);

type DetailsProps = {
  obj: VolumeSnapshotContentKind;
};

export default VolumeSnapshotContentDetailsPage;
