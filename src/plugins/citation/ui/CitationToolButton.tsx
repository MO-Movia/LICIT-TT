/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import React from 'react';
import cx from 'classnames';
import type { PointerSurfaceProps } from '../../../commands';
import { PointerSurface, TooltipSurface } from '../../../commands';

export class CitationToolButton extends React.PureComponent {
  declare props: PointerSurfaceProps & {
    icon?: string | React.ReactNode | null;
    label?: string | React.ReactNode | null;
  };

  render() {
    const {icon, label, className, title, ...pointerProps} = this.props;
    const klass = cx(className, 'czi-custom-button', {
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
