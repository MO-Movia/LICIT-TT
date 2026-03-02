/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import * as React from 'react';
import cx from 'classnames';
import type {PointerSurfaceProps} from '@modusoperandi/licit-ui-commands';
import {TooltipSurface,PointerSurface,} from '@modusoperandi/licit-ui-commands';
 import { UICommand
} from '@modusoperandi/licit-doc-attrs-step';
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
