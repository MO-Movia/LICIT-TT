import type {PopUpParams, ViewProps} from './PopUp';

import {PopUp} from './PopUp';
import * as React from 'react';
import ReactDOM from 'react-dom';
import {uuid} from './uuid';

export type PopUpHandle = {
  close: (val) => void;
  update: (props: Record<string, unknown>) => void;
};

let modalsCount = 0;
let popUpsCount = 0;

const Z_INDEX_BASE = 9999;
const MODAL_MASK_ID = 'pop-up-modal-mask-' + uuid();

export function showModalMask(IsChildDialog?: boolean): void {
  const root = document.body || document.documentElement;
  let element = document.getElementById(MODAL_MASK_ID);
  if (!element) {
    element = document.createElement('div');
    element.id = MODAL_MASK_ID;
    // [FS] IRAD-1048 2020-10-07
    // To handle child dialog window
    if (IsChildDialog) {
      element.className = 'czi-pop-up-modal-mask child-modal';
      element.setAttribute(
        'data-mask-type',
        'czi-pop-up-modal-mask child-modal'
      );
    } else {
      element.className = 'czi-pop-up-modal-mask';
      element.setAttribute('data-mask-type', 'czi-pop-up-modal-mask');
    }

    element.setAttribute('role', 'dialog');
    element.setAttribute('aria-modal', 'true');
  }

  if (root && !element.parentElement) {
    root.appendChild(element);
  }
  const style = element.style;

  const selector = '.czi-pop-up-element[data-pop-up-modal]';
  const zIndex = Array.from(document.querySelectorAll(selector)).reduce(
    (zz, el) => Math.max(zz, Number((el as HTMLElement).style.zIndex)),
    0
  );

  if ('' === style.zIndex) {
    style.zIndex = String(zIndex - 1);
  }
}

export function hideModalMask(): void {
  const element = document.getElementById(MODAL_MASK_ID);
  if (element?.parentElement) {
    element.parentElement.removeChild(element);
  }
}

function getRootElement(
  id: string,
  forceCreation: boolean,
  popUpParams?: PopUpParams
): HTMLElement | null {
  const root =
    popUpParams?.container ||
    document?.getElementsByClassName('czi-editor-frameset')?.[0] ||
    document.documentElement;
  let element = document.getElementById(id);
  if (!element && forceCreation) {
    element = document.createElement('div');
  }

  if (!element) {
    return null;
  }

  if (popUpParams?.modal) {
    element.setAttribute('data-pop-up-modal', 'y');
  }
  // [FS] IRAD-1048 2020-10-07
  // To handle child dialog window
  if (popUpParams?.IsChildDialog) {
    element.className = 'czi-pop-up-element child-modal czi-vars';
  } else {
    element.className = 'czi-pop-up-element czi-vars';
  }

  element.id = id;
  const style = element.style;
  const modalZIndexOffset = popUpParams?.modal ? 1 : 0;
  if (!popUpParams?.container) {
    style.zIndex = String(Z_INDEX_BASE + popUpsCount * 3 + modalZIndexOffset);
  }

  // Populates the default ARIA attributes here.
  // http://accessibility.athena-ict.com/aria/examples/dialog.shtml
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-modal', 'true');
  if (root && !element.parentElement) {
    root.appendChild(element);
  }
  return element;
}

function renderPopUp(
  rootId: string,
  close: () => void,
  View: typeof React.PureComponent,
  viewProps: ViewProps,
  popUpParams: PopUpParams
): void {
  const rootNode = getRootElement(rootId, true, popUpParams);
  if (rootNode) {
    const component = (
      <PopUp
        View={View}
        close={close}
        popUpParams={popUpParams}
        viewProps={viewProps}
      />
    );
    ReactDOM.render(component, rootNode);
  }

  if (modalsCount > 0) {
    showModalMask(popUpParams.IsChildDialog);
  } else {
    hideModalMask();
  }
}

export function unrenderPopUp(rootId: string): void {
  const rootNode = getRootElement(rootId, false);
  if (rootNode) {
    ReactDOM.unmountComponentAtNode(rootNode);
    rootNode.parentElement?.removeChild(rootNode);
  }

  if (modalsCount === 0) {
    hideModalMask();
  }
}

export function createPopUp(
  View,
  viewProps?: ViewProps,
  popUpParams?: PopUpParams
): PopUpHandle {
  const rootId = popUpParams.popUpId ?? uuid();

  let handle = null;
  let currentViewProps = viewProps || {};

  popUpParams = popUpParams || {};

  const modal = popUpParams.modal || !popUpParams.anchor;
  popUpParams.modal = modal;

  popUpsCount++;
  if (modal) {
    modalsCount++;
  }

  const closePopUp = (value) => {
    if (!handle) {
      return;
    }

    if (modal) {
      modalsCount--;
    }
    popUpsCount--;

    handle = null;
    unrenderPopUp(rootId);

    popUpParams?.onClose?.(value);
  };

  const render = renderPopUp.bind(null, rootId, closePopUp, View);

  handle = {
    close: closePopUp,
    update: (nextViewProps) => {
      currentViewProps = nextViewProps || {};
      render(currentViewProps, popUpParams);
    },
  };

  render(currentViewProps, popUpParams);
  return handle;
}
