import * as PropTypes from 'prop-types';
import * as React from 'react';
import { Base64 } from 'js-base64';
import { saveAs } from 'file-saver';
import { Alert, AlertActionLink, Button } from '@patternfly/react-core';
import * as _ from 'lodash-es';
import { Trans, withTranslation, useTranslation } from 'react-i18next';

import {
  CompressIcon,
  ExpandIcon,
  DownloadIcon,
  OutlinedWindowRestoreIcon,
} from '@patternfly/react-icons';
import * as classNames from 'classnames';
import { FLAGS } from '@console/shared/src/constants';
import { LoadingInline, LogWindow, TogglePlay, ExternalLink } from './';
import { modelFor, resourceURL } from '../../module/k8s';
import { WSFactory } from '../../module/ws-factory';
import { LineBuffer } from './line-buffer';
import * as screenfull from 'screenfull';
import { k8sGet, k8sList } from '@console/internal/module/k8s';
import { ConsoleExternalLogLinkModel, ProjectModel } from '@console/internal/models';
import { connectToFlags } from '../../reducers/features';

export const STREAM_EOF = 'eof';
export const STREAM_LOADING = 'loading';
export const STREAM_PAUSED = 'paused';
export const STREAM_ACTIVE = 'streaming';

export const LOG_SOURCE_RESTARTING = 'restarting';
export const LOG_SOURCE_RUNNING = 'running';
export const LOG_SOURCE_TERMINATED = 'terminated';
export const LOG_SOURCE_WAITING = 'waiting';

// Messages to display for corresponding log status
const streamStatusMessages = {
  // t('details-item~Log stream ended.')
  [STREAM_EOF]: 'details-item~Log stream ended.',
  // t('details-item~Loading log...')
  [STREAM_LOADING]: 'details-item~Loading log...',
  // t('details-item~Log stream paused.')
  [STREAM_PAUSED]: 'details-item~Log stream paused.',
  // t('details-item~Log streaming...')
  [STREAM_ACTIVE]: 'details-item~Log streaming...',
};

const replaceVariables = (template, values) => {
  return _.reduce(
    values,
    (result, value, name) => {
      // Replace all occurrences of template expressions like "${name}" with the URL-encoded value.
      // eslint-disable-next-line prefer-template
      const pattern = _.escapeRegExp('${' + name + '}');
      return result.replace(new RegExp(pattern, 'g'), encodeURIComponent(value));
    },
    template,
  );
};

// Component for log stream controls
export const LogControls = ({
  dropdown,
  logURL,
  toggleFullscreen,
  isFullscreen,
  status,
  toggleStreaming,
  resource,
  containerName,
  podLogLinks,
  namespaceUID,
}) => {
  const { t } = useTranslation();
  return (
    <div className="co-toolbar">
      <div className="co-toolbar__group co-toolbar__group--left">
        <div className="co-toolbar__item">
          {status === STREAM_LOADING && (
            <>
              <LoadingInline />
              &nbsp;
            </>
          )}
          {[STREAM_ACTIVE, STREAM_PAUSED].includes(status) && (
            <TogglePlay active={status === STREAM_ACTIVE} onClick={toggleStreaming} />
          )}
          {t(streamStatusMessages[status])}
        </div>
        {dropdown && <div className="co-toolbar__item">{dropdown}</div>}
      </div>
      <div className="co-toolbar__group co-toolbar__group--right">
        {!_.isEmpty(podLogLinks) &&
          _.map(_.sortBy(podLogLinks, 'metadata.name'), (link) => {
            const namespace = resource.metadata.namespace;
            const namespaceFilter = link.spec.namespaceFilter;
            if (namespaceFilter) {
              try {
                const namespaceRegExp = new RegExp(namespaceFilter, 'g');
                if (namespace.search(namespaceRegExp)) {
                  return null;
                }
              } catch (e) {
                // eslint-disable-next-line no-console
                console.warn('invalid log link regex', namespaceFilter, e);
                return null;
              }
            }
            const url = replaceVariables(link.spec.hrefTemplate, {
              resourceName: resource.metadata.name,
              resourceUID: resource.metadata.uid,
              containerName,
              resourceNamespace: namespace,
              resourceNamespaceUID: namespaceUID,
              podLabels: JSON.stringify(resource.metadata.labels),
            });
            return (
              <React.Fragment key={link.metadata.uid}>
                <ExternalLink href={url} text={link.spec.text} dataTestID={link.metadata.name} />
                <span aria-hidden="true" className="co-action-divider hidden-xs">
                  |
                </span>
              </React.Fragment>
            );
          })}
        <a href={logURL} target="_blank" rel="noopener noreferrer">
          <OutlinedWindowRestoreIcon className="co-icon-space-r" />
          {t('details-item~Raw')}
        </a>
        <span aria-hidden="true" className="co-action-divider hidden-xs">
          |
        </span>
        <a href={logURL} download>
          <DownloadIcon className="co-icon-space-r" />
          {t('details-item~Download')}
        </a>
        {screenfull.enabled && (
          <>
            <span aria-hidden="true" className="co-action-divider hidden-xs">
              |
            </span>
            <Button variant="link" isInline onClick={toggleFullscreen}>
              {isFullscreen ? (
                <>
                  <CompressIcon className="co-icon-space-r" />
                  {t('details-item~Collapse')}
                </>
              ) : (
                <>
                  <ExpandIcon className="co-icon-space-r" />
                  {t('details-item~Expand')}
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

LogControls.propTypes = {
  isFullscreen: PropTypes.bool.isRequired,
  dropdown: PropTypes.node,
  logURL: PropTypes.string.required,
  status: PropTypes.string,
  resource: PropTypes.object,
  containerName: PropTypes.string,
  podLogLinks: PropTypes.arrayOf(PropTypes.object), // k8sResourceKind
  namespaceUID: PropTypes.string,
  toggleStreaming: PropTypes.func,
  toggleFullscreen: PropTypes.func.isRequired,
};

// Resource agnostic log component
class ResourceLog_ extends React.Component {
  constructor(props) {
    super(props);
    this._buffer = new LineBuffer(props.bufferSize);
    this._download = this._download.bind(this);
    this._toggleFullscreen = this._toggleFullscreen.bind(this);
    this._onClose = this._onClose.bind(this);
    this._onError = this._onError.bind(this);
    this._onMessage = this._onMessage.bind(this);
    this._onOpen = this._onOpen.bind(this);
    this._restartStream = this._restartStream.bind(this);
    this._toggleStreaming = this._toggleStreaming.bind(this);
    this._updateStatus = this._updateStatus.bind(this);
    this._resourceLogRef = React.createRef();
    this.state = {
      error: false,
      hasTruncated: false,
      lines: [],
      linesBehind: 0,
      resourceStatus: LOG_SOURCE_WAITING,
      stale: false,
      status: STREAM_LOADING,
      isFullscreen: false,
      namespaceUID: '',
    };
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.resourceStatus !== prevState.resourcStatus) {
      const newState = {};
      newState.resourceStatus = nextProps.resourceStatus;
      // Container changed from non-running to running state, so currently displayed logs are stale
      if (
        prevState.resourceStatus === LOG_SOURCE_RESTARTING &&
        newState.resourceStatus !== LOG_SOURCE_RESTARTING
      ) {
        newState.stale = true;
      }
      return newState;
    }
    return null;
  }

  fetchLogLinks() {
    const promises = [
      k8sList(ConsoleExternalLogLinkModel),
      k8sGet(ProjectModel, this.props.resource.metadata.namespace),
    ];
    Promise.all(promises)
      .then(([podLogLinks, project]) => {
        // Project UID and namespace UID are the same value. Use the projects
        // API since normal OpenShift users can list projects.
        this.setState({ podLogLinks, namespaceUID: project.metadata.uid });
      })
      .catch((e) => this.setState({ error: e }));
  }

  componentDidMount() {
    if (this.props.flags.CONSOLE_EXTERNAL_LOG_LINK && this.props.resource.kind === 'Pod') {
      this.fetchLogLinks();
    }
    this._wsInit(this.props);
    if (screenfull.enabled) {
      screenfull.on('change', () => {
        this.setState({ isFullscreen: screenfull.isFullscreen });
      });
      screenfull.on('error', () => {
        this.setState({ isFullscreen: false });
      });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const containerChanged = prevProps.containerName !== this.props.containerName;
    const resourceStarted =
      prevState.resourceStatus === LOG_SOURCE_WAITING &&
      this.state.resourceStatus !== LOG_SOURCE_WAITING;

    // Container changed or transitioned out of waiting state
    if (containerChanged || resourceStarted) {
      this._restartStream();
    }
  }

  componentWillUnmount() {
    this._wsDestroy();
    if (screenfull.enabled) {
      screenfull.off('change');
      screenfull.off('error');
    }
  }

  // Download currently displayed log content
  _download() {
    const { resource, containerName } = this.props;
    const blob = this._buffer.getBlob({ type: 'text/plain;charset=utf-8' });
    let filename = resource.metadata.name;
    if (containerName) {
      filename = `${filename}-${containerName}`;
    }
    saveAs(blob, `${filename}.log`);
  }

  // Handler for websocket onclose event
  _onClose() {
    this.setState({ status: STREAM_EOF });
  }

  // Handler for websocket onerror event
  _onError() {
    this.setState({
      error: true,
    });
  }

  // Handler for websocket onmessage event
  _onMessage(msg) {
    const { linesBehind, status } = this.state;
    if (msg) {
      const text = Base64.decode(msg);
      const linesAdded = this._buffer.ingest(text);
      this.setState({
        linesBehind: status === STREAM_PAUSED ? linesBehind + linesAdded : linesBehind,
        lines: [...this._buffer.getLines(), this._buffer.getTail()],
        hasTruncated: this._buffer.getHasTruncated(),
      });
    }
  }

  // Handler for websocket onopen event
  _onOpen() {
    this._buffer.clear();
    this._updateStatus(STREAM_ACTIVE);
  }

  // Destroy and reinitialize websocket connection
  _restartStream() {
    this.setState(
      {
        error: false,
        hasTruncated: false,
        lines: [],
        linesBehind: 0,
        stale: false,
        status: STREAM_LOADING,
      },
      () => {
        this._wsDestroy();
        this._wsInit(this.props);
      },
    );
  }

  // Toggle currently displayed log content to/from fullscreen
  _toggleFullscreen() {
    const logConsole = this._resourceLogRef.current;
    if (!logConsole) {
      return;
    }

    if (screenfull.enabled) {
      screenfull.toggle(logConsole);
    }
  }

  // Toggle streaming/paused status
  _toggleStreaming() {
    const newStatus = this.state.status === STREAM_ACTIVE ? STREAM_PAUSED : STREAM_ACTIVE;
    this._updateStatus(newStatus);
  }

  // Updates log status
  _updateStatus(newStatus) {
    const { status } = this.state;
    const newState = { status: newStatus };

    // Reset linesBehind when transitioning out of paused state
    if (status !== STREAM_ACTIVE && newStatus === STREAM_ACTIVE) {
      newState.linesBehind = 0;
    }
    this.setState(newState);
  }

  // Destroy websocket
  _wsDestroy() {
    this.ws && this.ws.destroy();
  }

  // Initialize websocket connection and wire up handlers
  _wsInit({ resource, containerName, bufferSize }) {
    if (
      [LOG_SOURCE_RUNNING, LOG_SOURCE_TERMINATED, LOG_SOURCE_RESTARTING].includes(
        this.state.resourceStatus,
      )
    ) {
      const urlOpts = {
        ns: resource.metadata.namespace,
        name: resource.metadata.name,
        path: 'log',
        queryParams: {
          container: containerName || '',
          follow: 'true',
          tailLines: bufferSize,
        },
      };
      const watchURL = resourceURL(modelFor(resource.kind), urlOpts);
      const wsOpts = {
        host: 'auto',
        path: watchURL,
        subprotocols: ['base64.binary.k8s.io'],
      };

      this.ws = new WSFactory(watchURL, wsOpts)
        .onclose(this._onClose)
        .onerror(this._onError)
        .onmessage(this._onMessage)
        .onopen(this._onOpen);
    }
  }

  render() {
    const { resource, containerName, dropdown, bufferSize, t } = this.props;
    const {
      error,
      hasTruncated,
      lines,
      linesBehind,
      stale,
      status,
      isFullscreen,
      podLogLinks,
      namespaceUID,
    } = this.state;
    const bufferFull = lines.length === bufferSize;
    const logURL = resourceURL(modelFor(resource.kind), {
      name: resource.metadata.name,
      ns: resource.metadata.namespace,
      path: 'log',
      queryParams: { container: containerName || '' },
    });
    return (
      <>
        {error && (
          <Alert
            isInline
            className="co-alert"
            variant="danger"
            title={t('details-item~An error occurred while retrieving the requested logs.')}
            actionLinks={
              <AlertActionLink onClick={this._restartStream}>
                {t('details-item~Retry')}
              </AlertActionLink>
            }
          />
        )}
        {hasTruncated && (
          <Alert
            isInline
            className="co-alert"
            variant="warning"
            title={t(
              'details-item~Some lines have been abridged because they are exceptionally long.',
            )}
          >
            <Trans ns="details-item" t={t}>
              To view unabridged log content, you can either{' '}
              <a href={logURL} target="_blank" rel="noopener noreferrer">
                open the raw file in another window
              </a>{' '}
              or{' '}
              <a href={logURL} download>
                download it
              </a>
              .
            </Trans>
          </Alert>
        )}
        {stale && (
          <Alert
            isInline
            className="co-alert"
            variant="info"
            title={t('details-item~The logs for this {{resourceKind}} may be stale.', {
              resourceKind: resource.kind,
            })}
            actionLinks={
              <AlertActionLink onClick={this._restartStream}>
                {t('details-item~Refresh')}
              </AlertActionLink>
            }
          />
        )}
        <div
          ref={this._resourceLogRef}
          className={classNames('resource-log', { 'resource-log--fullscreen': isFullscreen })}
        >
          <LogControls
            dropdown={dropdown}
            isFullscreen={isFullscreen}
            logURL={logURL}
            setLineWrap={this._setLineWrap}
            status={status}
            toggleFullscreen={this._toggleFullscreen}
            toggleStreaming={this._toggleStreaming}
            resource={resource}
            containerName={containerName}
            podLogLinks={podLogLinks}
            namespaceUID={namespaceUID}
          />
          <LogWindow
            bufferFull={bufferFull}
            isFullscreen={isFullscreen}
            lines={lines}
            linesBehind={linesBehind}
            status={status}
            updateStatus={this._updateStatus}
          />
        </div>
      </>
    );
  }
}

/** @type {React.FC<{bufferSize?: number, containerName?: string, dropdown?: React.ReactNode, resource: any, resourceStatus: string}}>} */
const ResourceLogWithTranslation = connectToFlags(FLAGS.CONSOLE_EXTERNAL_LOG_LINK)(ResourceLog_);

export const ResourceLog = withTranslation()(ResourceLogWithTranslation);

ResourceLog.defaultProps = {
  bufferSize: 1000,
};

ResourceLog.propTypes = {
  bufferSize: PropTypes.number.isRequired,
  containerName: PropTypes.string,
  dropdown: PropTypes.element,
  resource: PropTypes.object.isRequired,
  resourceStatus: PropTypes.string.isRequired,
};
