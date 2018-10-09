import * as React from 'react';
import * as _ from 'lodash-es';

// eslint-disable-next-line no-unused-vars
import { K8sResourceKind, K8sResourceKindReference, planExternalName, serviceCatalogStatus } from '../module/k8s';
import { ColHead, DetailsPage, List, ListHeader, ListPage } from './factory';
import { Kebab, history, navFactory, ResourceKebab, ResourceLink, ResourceSummary, SectionHeading, StatusWithIcon, Timestamp } from './utils';
import { ResourceEventStream } from './events';
import { Conditions } from './conditions';
import { ServiceCatalogParameters, ServiceCatalogParametersSecrets } from './service-catalog-parameters';
import { ServiceBindingsPage } from './service-binding';

const ServiceInstancesReference: K8sResourceKindReference = 'ServiceInstance';

const createBinding = (kindObj, serviceInstance) => {
  return {
    callback: () => {
      history.push(`/k8s/ns/${serviceInstance.metadata.namespace}/serviceinstances/${serviceInstance.metadata.name}/create-binding`);
    },
    label: 'Create Service Binding',
  };
};

const { common } = Kebab.factory;

const menuActions = [
  createBinding,
  ...common,
];

const ServiceInstanceDetails: React.SFC<ServiceInstanceDetailsProps> = ({obj: si}) => {
  const plan = planExternalName(si);
  const parameters = _.get(si, 'status.externalProperties.parameters', {});
  const bindingCreateHandler = createBinding(null, si).callback;
  const bindingFilters = {selector: {field: 'spec.instanceRef.name', values: new Set(_.map(si, 'name'))}};
  const classDisplayName = si.spec.clusterServiceClassExternalName || si.spec.serviceClassExternalName;
  const clusterServiceClassName = _.get(si, 'spec.clusterServiceClassRef.name');

  return <React.Fragment>
    <div className="co-m-pane__body">
      <SectionHeading text="Service Instance Overview" />
      <div className="row">
        <div className="col-sm-6">
          <ResourceSummary resource={si} showPodSelector={false} showNodeSelector={false} />
        </div>
        <div className="col-sm-6">
          <dl className="co-m-pane__details">
            <dt>Service Class</dt>
            <dd>
              {clusterServiceClassName
                ? <ResourceLink kind="ClusterServiceClass" displayName={classDisplayName} title={classDisplayName} name={clusterServiceClassName} />
                : classDisplayName}
            </dd>
            <dt>Status</dt>
            <dd><StatusWithIcon obj={si} /></dd>
            <dt>Plan</dt>
            <dd>{plan || '-'}</dd>
          </dl>
        </div>
      </div>
    </div>
    <div className="co-m-pane__body co-m-pane__body--alt">
      <SectionHeading text="Service Bindings" />
      <p className="co-m-pane__explanation">Service bindings create a secret containing the necessary information for an application to use a service.</p>
    </div>
    <ServiceBindingsPage canCreate={true} createHandler={bindingCreateHandler} namespace={si.metadata.namespace} filters={bindingFilters} autoFocus={false} showTitle={false} />
    <div className="co-m-pane__body">
      <SectionHeading text="Conditions" />
      <Conditions conditions={si.status.conditions} />
    </div>
    {!_.isEmpty(si.spec.parametersFrom) && <ServiceCatalogParametersSecrets obj={si} /> }
    {!_.isEmpty(parameters) && <ServiceCatalogParameters parameters={parameters} /> }
  </React.Fragment>;
};

const pages = [navFactory.details(ServiceInstanceDetails), navFactory.editYaml(), navFactory.events(ResourceEventStream)];
export const ServiceInstanceDetailsPage: React.SFC<ServiceInstanceDetailsPageProps> = props =>
  <DetailsPage
    {...props}
    kind={ServiceInstancesReference}
    menuActions={menuActions}
    pages={pages} />;
ServiceInstanceDetailsPage.displayName = 'ServiceInstanceDetailsPage';

const ServiceInstancesHeader = props => <ListHeader>
  <ColHead {...props} className="col-md-2 col-sm-4 col-xs-6" sortField="metadata.name">Name</ColHead>
  <ColHead {...props} className="col-md-2 col-sm-3 col-xs-6" sortField="metadata.namespace">Namespace</ColHead>
  <ColHead {...props} className="col-md-2 col-sm-3 hidden-xs" sortField="spec.clusterServiceClassExternalName">Service Class</ColHead>
  <ColHead {...props} className="col-md-2 col-sm-2 hidden-xs" sortFunc="serviceCatalogStatus">Status</ColHead>
  <ColHead {...props} className="col-md-2 hidden-sm hidden-xs" sortFunc="planExternalName">Plan</ColHead>
  <ColHead {...props} className="col-md-2 hidden-sm hidden-xs" sortField="metadata.creationTimestamp">Created</ColHead>
</ListHeader>;

const ServiceInstancesRow: React.SFC<ServiceInstancesRowProps> = ({obj}) => {
  const clusterServiceClassRefName = _.get(obj, 'spec.clusterServiceClassRef.name');

  return <div className="row co-resource-list__item">
    <div className="col-md-2 col-sm-4 col-xs-6 co-resource-link-wrapper">
      <ResourceLink kind={ServiceInstancesReference} name={obj.metadata.name} namespace={obj.metadata.namespace} title={obj.metadata.name} />
    </div>
    <div className="col-md-2 col-sm-3 col-xs-6 co-break-word">
      <ResourceLink kind="Namespace" name={obj.metadata.namespace} title={obj.metadata.namespace} />
    </div>
    <div className="col-md-2 col-sm-3 hidden-xs co-break-word">
      {clusterServiceClassRefName
        ? <ResourceLink kind="ClusterServiceClass" displayName={obj.spec.clusterServiceClassExternalName} title={obj.spec.clusterServiceClassExternalName} name={obj.spec.clusterServiceClassRef.name} />
        : obj.spec.clusterServiceClassExternalName }
    </div>
    <div className="col-md-2 col-sm-2 hidden-xs">
      <StatusWithIcon obj={obj} />
    </div>
    <div className="col-md-2 hidden-sm hidden-xs co-break-word">
      {planExternalName(obj) || '-'}
    </div>
    <div className="col-md-2 hidden-sm hidden-xs co-break-word">
      <Timestamp timestamp={obj.metadata.creationTimestamp} />
    </div>
    <div className="co-resource-kebab">
      <ResourceKebab actions={menuActions} kind={ServiceInstancesReference} resource={obj} />
    </div>
  </div>;
};

const ServiceInstancesList: React.SFC = props => <List {...props} Header={ServiceInstancesHeader} Row={ServiceInstancesRow} />;
ServiceInstancesList.displayName = 'ServiceInstancesList';

const filters = [{
  type: 'catalog-status',
  selected: ['Ready', 'Pending', 'Failed'],
  reducer: serviceCatalogStatus,
  items: [
    {id: 'Ready', title: 'Ready'},
    {id: 'Pending', title: 'Pending'},
    {id: 'Failed', title: 'Failed'}
  ],
}];

export const ServiceInstancesPage: React.SFC<ServiceInstancesPageProps> = props =>
  <ListPage
    {...props}
    kind={ServiceInstancesReference}
    ListComponent={ServiceInstancesList}
    filterLabel="Service Instances by name"
    rowFilters={filters}
  />;
ServiceInstancesPage.displayName = 'ServiceInstancesListPage';

/* eslint-disable no-undef */
export type ServiceInstanceStatusProps = {
  obj: K8sResourceKind
};

export type ServiceInstancesRowProps = {
  obj: any,
};

export type ServiceInstanceDetailsProps = {
  obj: any,
};

export type ServiceInstancesPageProps = {
  showTitle?: boolean,
  namespace?: string,
  selector?: any,
};

export type ServiceInstanceDetailsPageProps = {
  match: any,
};
/* eslint-enable no-undef */
