import * as React from 'react';

import {createModalLauncher, ModalTitle, ModalBody, ModalFooter} from '../factory/modal';

export const eventModal = createModalLauncher(
  ({message, cancel}) => {
    return (
      <div>
        <ModalTitle>Event Description</ModalTitle>
        <ModalBody className="co-sysevent_modal">{message}


        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}
        {message}

        </ModalBody>
        <ModalFooter inProgress={false} errorMessage=""><button type="button" onClick={(e) => cancel(e)} className="btn btn-default">OK</button></ModalFooter>
      </div>
    );
  }
);
