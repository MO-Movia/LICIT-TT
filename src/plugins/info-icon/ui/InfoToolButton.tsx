import * as React from 'react';
import cx from 'classnames';
import type {PointerSurfaceProps} from '@modusoperandi/licit-ui-commands';
import {TooltipSurface,PointerSurface} from '@modusoperandi/licit-ui-commands';

type InfoToolButtonProps = PointerSurfaceProps & {
  icon?: string | React.ReactNode | null;
  label?: string | React.ReactNode | null;
};

export class InfoToolButton extends React.PureComponent {
  declare props: InfoToolButtonProps;

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
