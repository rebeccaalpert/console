import * as React from 'react';
import { safeLoad, safeDump } from 'js-yaml';
import { saveAs } from 'file-saver';

import { k8sKinds } from '../module/k8s';
import { Loading } from './utils';
import { SafetyFirst } from './safety-first';
import { NetworkPolicySidebar } from './network-policy-sidebar';
import { EditYAML } from './edit-yaml';
import { TEMPLATES } from '../yaml-templates';

const generateObjToLoad = (kind, templateName) => {
  const kindObj = _.get(k8sKinds, kind, {});
  const kindStr = `${kindObj.apiVersion}.${kind}`;
  return safeLoad(TEMPLATES[kindStr][templateName]);
};

export class EditYAMLWithSidebar extends SafetyFirst {
  constructor(props) {
    super(props);
    this.state = {
      showSidebar: true,
      sampleObj: null
    };
    this.loadSampleYaml_ = this.loadSampleYaml_.bind(this);
    this.downloadSampleYaml_ = this.downloadSampleYaml_.bind(this);
  }

  loadSampleYaml_(templateName = 'default') {
    this.setState({ sampleObj: generateObjToLoad(this.props.kind, templateName) });
  }

  downloadSampleYaml_ (templateName = 'default') {
    const data = safeDump(generateObjToLoad(this.props.kind, templateName));
    const blob = new Blob([data], { type: 'text/yaml;charset=utf-8' });
    let filename = 'k8s-object.yaml';
    try {
      const obj = safeLoad(data);
      if (obj.kind) {
        filename = `${obj.kind.toLowerCase()}-${obj.metadata.name}.yaml`;
      }
    } catch (unused) {
      // unused
    }
    saveAs(blob, filename);
  }

  render () {
    const {showSidebar} = this.state;
    const {create, kind, obj} = this.props;

    if (_.isEmpty(obj)) {
      return <Loading/>;
    }

    const kindObj = _.get(k8sKinds, kind, {});
    const header = create ? `Create ${_.get(kindObj, 'label', kind)}` : `Edit ${obj.metadata.name}`;
    return <div>
      {create && <div className="yaml-editor-header">
        {header}
        <button className="btn btn-link pull-right" onClick={() => this.setState({showSidebar: !showSidebar})}>
          <span className="fa fa-fw fa-info-circle co-p-cluster__sidebar-link-icon"></span>
          {showSidebar ? 'Hide samples' : 'View samples'}
        </button>
      </div>}
      <div className="co-p-cluster">
        <div className="co-p-cluster__body">
          <EditYAML obj={obj} create={create} kind={kind} showHeader={false} sampleObj={this.state.sampleObj} />;
        </div>
        {kind === 'NetworkPolicy' && showSidebar && <NetworkPolicySidebar
          loadSampleYaml={this.loadSampleYaml_}
          downloadSampleYaml={this.downloadSampleYaml_} />}
      </div>
    </div>;
  }
}
