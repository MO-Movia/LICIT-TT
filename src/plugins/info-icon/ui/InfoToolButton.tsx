/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import * as React from 'react';
import cx from 'classnames';
import type { PointerSurfaceProps } from '../../../commands';
import { TooltipSurface, PointerSurface } from '../../../commands';
import { UICommand } from '../../../core';
type InfoToolButtonProps = PointerSurfaceProps & {
  icon?: string | React.ReactNode | null;
  label?: string | React.ReactNode | null;
};

export class InfoToolButton extends React.PureComponent {
  declare props: InfoToolButtonProps;

  render() {
    const {icon, label, className, title, ...pointerProps} = this.props;
    const klass = cx(className, 'czi-custom-button', UICommand.theme, {
      'use-icon': !!icon,
    });
    return (
      <TooltipSurface tooltip={title}>
        <PointerSurface {...pointerProps} className={klass}>
          {icon}
          {label}
        </PointerSurface>
      </TooltipSurface>
    );
  }
}
