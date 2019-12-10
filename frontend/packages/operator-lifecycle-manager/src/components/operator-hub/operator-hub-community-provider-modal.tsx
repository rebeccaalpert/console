import * as React from 'react';
import { Checkbox, Modal } from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { RH_OPERATOR_SUPPORT_POLICY_LINK } from '@console/internal/const';
import { createModalLauncher, ModalSubmitFooter } from '@console/internal/components/factory/modal';
import { ExternalLink } from '@console/internal/components/utils';

export class OperatorHubCommunityProviderModal extends React.Component<
  OperatorHubCommunityProviderModalProps,
  OperatorHubCommunityProviderModalState
> {
  constructor(props) {
    super(props);
    this.state = {
      ignoreWarnings: false,
    };
  }

  onIgnoreChange = (checked) => {
    this.setState({ ignoreWarnings: checked });
  };

  submit = (event) => {
    event.preventDefault();
    this.props.showCommunityOperators(this.state.ignoreWarnings);
    this.props.close();
  };

  render() {
    const { close } = this.props;
    const { ignoreWarnings } = this.state;
    const submitButtonContent = <>Continue</>;
    return (
      <Modal
        footer={
          <form onSubmit={this.submit} className="co-modal-ignore-warning">
            <ModalSubmitFooter
              submitText={submitButtonContent}
              inProgress={false}
              errorMessage=""
              cancel={this.props.close}
            />
          </form>
        }
        isSmall
        isOpen
        onClose={close}
        title="Show Community Operator"
      >
        <div className="co-modal-ignore-warning__content">
          <div className="co-modal-ignore-warning__icon">
            <InfoCircleIcon />
          </div>
          <div>
            <p>
              Community Operators are operators which have not been vetted or verified by Red Hat.
              Community Operators should be used with caution because their stability is unknown.
              Red Hat provides no support for Community Operators.
              {RH_OPERATOR_SUPPORT_POLICY_LINK && (
                <span className="co-modal-ignore-warning__link">
                  <ExternalLink
                    href={RH_OPERATOR_SUPPORT_POLICY_LINK}
                    text="Learn more about Red Hat’s third party software support policy"
                  />
                </span>
              )}
            </p>
            <Checkbox
              className="co-modal-ignore-warning__checkbox"
              onChange={this.onIgnoreChange}
              isChecked={ignoreWarnings}
              id="do-not-show-warning"
              label="Do not show this warning again"
            />
          </div>
        </div>
      </Modal>
    );
  }
}

export type OperatorHubCommunityProviderModalProps = {
  showCommunityOperators: (ignoreWarnings: boolean) => void;
  close: () => void;
};

export type OperatorHubCommunityProviderModalState = {
  ignoreWarnings: boolean;
};

export const communityOperatorWarningModal = createModalLauncher(OperatorHubCommunityProviderModal);
