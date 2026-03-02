/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import * as React from 'react';
import {createPopUp} from './createPopUp';
import {atAnchorBottomCenter, atAnchorRight} from './PopUpPosition';
import {uuid} from './uuid';

type TooltipSurfaceProps = {
  tooltip: string;
  children?;
};

class TooltipView extends React.PureComponent<TooltipSurfaceProps> {
  render(): React.ReactElement {
    const {tooltip} = this.props;
    return (
      <div className="czi-tooltip-view czi-animation-fade-in">{tooltip}</div>
    );
  }
}

export class TooltipSurface extends React.PureComponent<TooltipSurfaceProps> {
  _id = uuid();
  _popUp = null;

  declare props: {
    tooltip: string;
    children?;
  };

  componentWillUnmount(): void {
    this._popUp?.close();
  }

  render(): React.ReactElement {
    const {tooltip, children} = this.props;
    return (
      <span
        aria-label={tooltip}
        className="czi-tooltip-surface"
        data-tooltip={tooltip}
        id={this._id}
        onMouseDown={tooltip && this._onMouseLeave}
        onMouseEnter={tooltip && this._onMouseEnter}
        onMouseLeave={tooltip && this._onMouseLeave}
        role="tooltip"
      >
        {children}
      </span>
    );
  }

  _onMouseEnter = (e): void => {
    if(e?.target && e.target?.nodeName==='IMG' ||
       e.target?.className.startsWith('czi-custom-button')|| e.target?.className.startsWith('width-100 czi-dropdown-border') || e.target?.className.startsWith('width-100 czi-custom-menu-button')){
    if (!this._popUp) {
      const { tooltip } = this.props;
      const alignmentTooltips = ['center align', 'right align', 'left align', 'justify'];
      const position = alignmentTooltips.includes(tooltip?.toLowerCase())
        ? atAnchorRight
        : atAnchorBottomCenter;
      this._popUp = createPopUp(
        TooltipView,
        { tooltip },
        {
          anchor: document.getElementById(this._id),
          onClose: this._onClose,
          position: position,
        }
      );
    }
  }
  };

  _onMouseLeave = (): void => {
    this._popUp?.close();
    this._popUp = null;
  };

  _onClose = (): void => {
    this._popUp = null;
  };
}
