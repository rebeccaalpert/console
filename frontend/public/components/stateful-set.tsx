import * as React from 'react';

import { K8sResourceKind } from '../module/k8s';
import { ResourceEventStream } from './events';
import { DetailsPage, ListPage, Table } from './factory';

import { WorkloadTableRow, WorkloadTableHeader } from './workload-table';

import {
  AsyncComponent,
  Kebab,
  KebabAction,
  ContainerTable,
  ResourceSummary,
  SectionHeading,
  navFactory,
} from './utils';
import { VolumesTable } from './volumes-table';
import { StatefulSetModel } from '../models';

const { AddStorage, common } = Kebab.factory;
export const menuActions: KebabAction[] = [
  AddStorage,
  ...Kebab.getExtensionsActionsForKind(StatefulSetModel),
  ...common,
];

const kind = 'StatefulSet';

const StatefulSetTableRow = ({
  obj,
  index,
  key,
  style,
}: {
  obj: K8sResourceKind;
  index: number;
  key: string;
  style: any;
}) => {
  return (
    <WorkloadTableRow
      obj={obj}
      index={index}
      key={key}
      style={style}
      menuActions={menuActions}
      kind={kind}
    />
  );
};
StatefulSetTableRow.displayName = 'StatefulSetTableRow';

const StatefulSetTableHeader = () => {
  return WorkloadTableHeader();
};
StatefulSetTableHeader.displayName = 'StatefulSetTableHeader';

const StatefulSetDetails: React.FC<StatefulSetDetailsProps> = ({ obj: ss }) => (
  <>
    <div className="co-m-pane__body">
      <SectionHeading text="StatefulSet Details" />
      <ResourceSummary resource={ss} showPodSelector showNodeSelector showTolerations />
    </div>
    <div className="co-m-pane__body">
      <SectionHeading text="Containers" />
      <ContainerTable containers={ss.spec.template.spec.containers} />
    </div>
    <div className="co-m-pane__body">
      <VolumesTable resource={ss} heading="Volumes" />
    </div>
  </>
);

const EnvironmentPage: React.FC<EnvironmentPageProps> = (props) => (
  <AsyncComponent
    loader={() => import('./environment.jsx').then((c) => c.EnvironmentPage)}
    {...props}
  />
);

const envPath = ['spec', 'template', 'spec', 'containers'];
const EnvironmentTab: React.FC<EnvironmentTabProps> = (props) => (
  <EnvironmentPage
    obj={props.obj}
    rawEnvData={props.obj.spec.template.spec}
    envPath={envPath}
    readOnly={false}
  />
);

export const StatefulSetsList: React.FC = (props) => (
  <Table
    {...props}
    aria-label="Stateful Sets"
    Header={StatefulSetTableHeader}
    Row={StatefulSetTableRow}
    virtualize
  />
);
export const StatefulSetsPage: React.FC<StatefulSetsPageProps> = (props) => (
  <ListPage {...props} ListComponent={StatefulSetsList} kind={kind} canCreate={true} />
);

const pages = [
  navFactory.details(StatefulSetDetails),
  navFactory.editYaml(),
  navFactory.pods(),
  navFactory.envEditor(EnvironmentTab),
  navFactory.events(ResourceEventStream),
];

export const StatefulSetsDetailsPage: React.FC<StatefulSetsDetailsPageProps> = (props) => (
  <DetailsPage {...props} kind={kind} menuActions={menuActions} pages={pages} />
);

type EnvironmentPageProps = {
  obj: K8sResourceKind;
  rawEnvData: any;
  envPath: string[];
  readOnly: boolean;
};

type EnvironmentTabProps = {
  obj: K8sResourceKind;
};

type StatefulSetDetailsProps = {
  obj: K8sResourceKind;
};

type StatefulSetsPageProps = {
  showTitle?: boolean;
  namespace?: string;
  selector?: any;
};

type StatefulSetsDetailsPageProps = {
  match: any;
};
