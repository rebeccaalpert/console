import * as React from 'react';
import { AboutModal as PFAboutModal } from 'patternfly-react';
import * as classNames from 'classnames';

import * as _ from 'lodash-es';
import { Link } from 'react-router-dom';
import * as okdLogoImg from '../imgs/okd-logo.svg';
import * as ocpLogoImg from '../imgs/openshift-platform-logo.svg';
import * as onlineLogoImg from '../imgs/openshift-online-logo.svg';
import * as dedicatedLogoImg from '../imgs/openshift-dedicated-logo.svg';
import * as rhLogoImg from '../imgs/redhat-logo-modal.svg';
import * as okdModalImg from '../imgs/okd-logo-modal.svg';
import { FLAGS, connectToFlags, flagPending } from '../features';
import { authSvc } from '../module/auth';
import { Dropdown, ActionsMenu } from './utils';
import { openshiftHelpBase } from './utils/documentation';
import { k8sVersion } from '../module/status';
//import { AsyncComponent } from './utils';
//import { createPFModalLauncher } from './factory/modal';
import * as ReactDOM from 'react-dom';

import { coFetchJSON } from '../co-fetch';
import { SafetyFirst } from './safety-first';

const developerConsoleURL = (window as any).SERVER_FLAGS.developerConsoleURL;


export type CreateModalLauncherProps = {
};

export type CreateModalLauncher = <P extends FlagsProps>(C: React.ComponentClass<P>) =>
  (props: Omit<P, keyof FlagsProps> & CreateModalLauncherProps) => {result: Promise<{}>};

export const createModalLauncher: CreateModalLauncher = (Component) => (props) => {
  const modalContainer = document.getElementById('modal-container');

  const result = new Promise(resolve => {
    ReactDOM.render(<AboutModal />, modalContainer);
  });
  return {result};
};

const BrandingDetails = () => {
  let backgroundImg, logoImg, logoAlt, modalLogoImg, modalLogoAlt, productTitle;

  // Webpack won't bundle these images if we don't directly reference them, hence the switch
  switch ((window as any).SERVER_FLAGS.branding) {
    case 'ocp':
      backgroundImg = true;
      logoImg = ocpLogoImg;
      logoAlt = 'OpenShift Container Platform';
      modalLogoImg = rhLogoImg;
      modalLogoAlt = 'Red Hat';
      productTitle = <React.Fragment>Red Hat<sup>&reg;</sup> OpenShift Container Platform</React.Fragment>;
      break;
    case 'online':
      backgroundImg = true;
      logoImg = onlineLogoImg;
      logoAlt = 'OpenShift Online';
      modalLogoImg = rhLogoImg;
      modalLogoAlt = 'Red Hat';
      productTitle = <React.Fragment>Red Hat<sup>&reg;</sup> OpenShift Online</React.Fragment>;
      break;
    case 'dedicated':
      backgroundImg = true;
      logoImg = dedicatedLogoImg;
      logoAlt = 'OpenShift Dedicated';
      modalLogoImg = rhLogoImg;
      modalLogoAlt = 'Red Hat';
      productTitle = <React.Fragment>Red Hat<sup>&reg;</sup> OpenShift Dedicated</React.Fragment>;
      break;
    default:
      backgroundImg = false;
      logoImg = okdLogoImg;
      logoAlt = 'OKD';
      modalLogoImg = okdModalImg;
      modalLogoAlt = 'OKD';
      productTitle = 'OKD';
  }

  return ({'backgroundImg': backgroundImg, 'logoImg': logoImg, 'logoAlt': logoAlt, 'modalLogo': modalLogoImg, 'modalLogoAlt': modalLogoAlt, 'productTitle': productTitle});
};

class AboutModal_ extends React.Component<AboutModalProps, AboutModalState> {
    constructor (props) {
      super(props);
      this.state = {
        showAboutModal: true,
        openshiftVersion: null,
        kubernetesVersion: null,
      };
      this.closeAboutModal = this.closeAboutModal.bind(this);
    }

    componentDidMount() {
      this._checkKubernetesVersion();
      this.setState({ showAboutModal: true });
    }

    _checkOpenShiftVersion() {
      coFetchJSON('api/kubernetes/version/openshift')
        .then((data) => {
          this.setState({openshiftVersion: data.gitVersion});
        }).catch(() => this.setState({openshiftVersion: 'unknown'}));
    }

    _checkKubernetesVersion() {
      k8sVersion()
        .then((data) => this.setState({kubernetesVersion: data.gitVersion}))
        .catch(() => this.setState({kubernetesVersion: 'unknown'}));
    }

    closeAboutModal() {
      this.setState({ showAboutModal: false });
    }

    render() {
      const {openshiftVersion, kubernetesVersion, showAboutModal} = this.state;
      const details = BrandingDetails();
      if (props.flags[FLAGS.OPENSHIFT]) {
        this._checkOpenShiftVersion();
      }

      return <PFAboutModal className={classNames('co-masthead__modal', {'co-masthead__modal--upstream': details.backgroundImg})} logo={details.logoImg} altLogo={details.logoAlt} productTitle={details.productTitle} show={showAboutModal} onHide={this.closeAboutModal}>
        <strong>About</strong>
        <p>{details.productTitle === 'OKD' ? 'OKD' : 'OpenShift'} is Red Hat&apos;s container application platform that allows developers to quickly develop, host, and scale applications in a cloud environment.</p>
        {(openshiftVersion || kubernetesVersion) &&
          <React.Fragment>
            <strong>Version</strong>
            <PFAboutModal.Versions className="co-masthead__modal--version">
              {openshiftVersion && <PFAboutModal.VersionItem label={`${details.productTitle === 'OKD' ? 'OKD' : 'OpenShift'} Master`} versionText={openshiftVersion} />}
              {kubernetesVersion && <PFAboutModal.VersionItem label="Kubernetes Master" versionText={kubernetesVersion} />}
            </PFAboutModal.Versions>
          </React.Fragment>}
      </PFAboutModal>;
    }
  }

const AboutModal = connectToFlags(FLAGS.OPENSHIFT)(AboutModal_);

const AB = createModalLauncher(AboutModal);

class HelpMenu extends React.Component<HelpMenuProps, HelpMenuState> {
  constructor (props) {
    super(props);
    this.openDocumentation = this.openDocumentation.bind(this);
  }

  openDocumentation() {
    window.open(openshiftHelpBase, '_blank').opener = null;
  }

  render() {
    return <React.Fragment>
      <ActionsMenu
        actions={[
          {label: 'Documentation', callback: this.openDocumentation},
          {label: 'About', callback: AB}]}
        buttonClassName="nav-item-iconic"
        noButton
        noCaret
        title={<i className="fa fa-question-circle-o co-masthead__help-icon" />} />
    </React.Fragment>;
  }
}

const HelpMenuWrapper = connectToFlags(FLAGS.OPENSHIFT)((props: FlagsProps) => {
  const details = BrandingDetails();
  return <HelpMenu backgroundImg={details.backgroundImg} logoAlt={details.modalLogoAlt} logoImg={details.modalLogo} openshiftFlag={props.flags[FLAGS.OPENSHIFT]} title={details.productTitle} />;
});

const UserMenu: React.StatelessComponent<UserMenuProps> = ({username, actions}) => {
  const title = <React.Fragment>
    <i className="pficon pficon-user co-masthead__user-icon" aria-hidden="true"></i>
    <span className="co-masthead__username">{username}</span>
  </React.Fragment>;
  if (_.isEmpty(actions)) {
    return <div className="nav-item-iconic no-dropdown">{title}</div>;
  }

  return <ActionsMenu actions={actions}
    buttonClassName="nav-item-iconic"
    title={title}
    noButton={true} />;
};

const UserMenuWrapper = connectToFlags(FLAGS.AUTH_ENABLED, FLAGS.OPENSHIFT)((props: FlagsProps) => {
  if (flagPending(props.flags[FLAGS.OPENSHIFT]) || flagPending(props.flags[FLAGS.AUTH_ENABLED])) {
    return null;
  }

  const actions: Actions = [];
  if (props.flags[FLAGS.AUTH_ENABLED]) {
    const logout = e => {
      e.preventDefault();
      if (props.flags[FLAGS.OPENSHIFT]) {
        authSvc.deleteOpenShiftToken().then(() => authSvc.logout());
      } else {
        authSvc.logout();
      }
    };
    actions.push({
      label: 'Logout',
      callback: logout
    });
  }

  if (props.flags[FLAGS.OPENSHIFT]) {
    return <OSUserMenu actions={actions} />;
  }

  actions.unshift({
    label: 'My Account',
    href: '/settings/profile'
  });

  return authSvc.userID() ? <UserMenu actions={actions} username={authSvc.name()} /> : null;
});

export class OSUserMenu extends SafetyFirst<OSUserMenuProps, OSUserMenuState> {
  constructor(props) {
    super(props);
    this.state = {
      username: undefined
    };
  }

  componentDidMount() {
    super.componentDidMount();
    this._getUserInfo();
  }

  _getUserInfo() {
    coFetchJSON('api/kubernetes/apis/user.openshift.io/v1/users/~')
      .then((user) => {
        this.setState({ username: _.get(user, 'fullName') || user.metadata.name });
      }).catch(() => this.setState({ username: null }));
  }

  render () {
    const username = this.state.username;
    return username ? <UserMenu actions={this.props.actions} username={username} /> : null;
  }
}

const ContextSwitcher = () => {
  const items = {
    [`${developerConsoleURL}catalog`]: 'Service Catalog',
    [`${developerConsoleURL}projects`]: 'Application Console',
    [(window as any).SERVER_FLAGS.basePath]: 'Cluster Console'
  };

  return <div className="contextselector-pf">
    <Dropdown title="Cluster Console" items={items} selectedKey={(window as any).SERVER_FLAGS.basePath}
      dropDownClassName="bootstrap-select btn-group" onChange={url => window.location.href = url} />
  </div>;
};

export const LogoImage = () => {
  const details = BrandingDetails();
  return <div className="co-masthead__logo">
    <Link to="/" className="co-masthead__logo-link"><img src={details.logoImg} alt={details.logoAlt} /></Link>
  </div>;
};

export const Masthead = () => <header role="banner" className="navbar navbar-pf-vertical co-masthead">
  <div className="navbar-header">
    <LogoImage />
    {developerConsoleURL && <div className="co-masthead__console-picker">
      <ContextSwitcher />
    </div>}
  </div>
  <div className="nav navbar-nav navbar-right navbar-iconic navbar-utility">
    <div className="co-masthead__dropdowns">
      <div className="co-masthead__help">
        <HelpMenuWrapper />
      </div>
      <div className="co-masthead__user">
        <UserMenuWrapper />
      </div>
    </div>
  </div>
</header>;

/* eslint-disable no-undef */
export type FlagsProps = {
  flags: {[name: string]: boolean},
};

export type Actions = { label: string, href?: string, callback?: any }[];

export type HelpMenuProps = {
  backgroundImg: boolean,
  logoAlt: string,
  logoImg: string,
  openshiftFlag: boolean,
  title: any,
};

export type HelpMenuState = {
  showAboutModal: boolean,
};

export type AboutModalProps = {
  flags: {[name: string]: boolean},
};

export type AboutModalState = {
  kubernetesVersion: string,
  openshiftVersion: string,
  showAboutModal: boolean,
};

export type UserMenuProps = {
  actions: Actions,
  username: any,
};

export type OSUserMenuProps = {
  actions: Actions,
};

export type OSUserMenuState = {
  username: string,
};
