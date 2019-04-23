import * as React from 'react';
import { AboutModal as PfAboutModal, Alert, TextContent, TextList, TextListItem } from '@patternfly/react-core';
import { k8sVersion } from '../module/status';
import { Link } from 'react-router-dom';

import { getBrandingDetails } from './masthead';
import { connect } from 'react-redux';
import { clusterIDStateToProps } from '../ui/ui-reducers';
import { ClusterUpdateStatus, getClusterUpdateStatus } from '../module/k8s';


class AboutModal_ extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      kubernetesVersion: null,
    };
  }

  componentDidMount() {
    this._checkKubernetesVersion();
  }

  _checkKubernetesVersion() {
    k8sVersion()
      .then(data => this.setState({kubernetesVersion: data.gitVersion}))
      .catch(() => this.setState({kubernetesVersion: 'unknown'}));
  }

  render() {
    const {isOpen, clusterID, closeAboutModal, obj} = this.props;
    const {kubernetesVersion} = this.state;
    const details = getBrandingDetails();
    const status = getClusterUpdateStatus(obj);
    console.log(status);

    return (
      <PfAboutModal
        isOpen={isOpen}
        onClose={closeAboutModal}
        productName=""
        brandImageSrc={details.logoImg}
        brandImageAlt={details.productName}
      >
        <p>OpenShift is Red Hat&apos;s container application platform that allows developers to quickly develop, host,
          and scale applications in a cloud environment.</p>
        {status === ClusterUpdateStatus.UpdatesAvailable && <Alert variant="info" title={<React.Fragment>Update Available. <Link onClick={closeAboutModal} to="/settings/cluster">View Cluster Settings</Link></React.Fragment>} />}
        <br />
        <TextContent>
          <TextList component="dl">
            {clusterID &&
            <TextListItem component="dt">Cluster ID</TextListItem>}
            {clusterID &&
            <TextListItem component="dd">{clusterID}</TextListItem>}
            <TextListItem component="dt">Kubernetes Master Version</TextListItem>
            <TextListItem component="dd">{kubernetesVersion}</TextListItem>
          </TextList>
        </TextContent>
      </PfAboutModal>
    );
  }
}

export const AboutModal = connect(clusterIDStateToProps)(AboutModal_);
