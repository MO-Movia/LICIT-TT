import {PointerSurface} from './PointerSurface';
import * as React from 'react';
import { TooltipSurface } from './TooltipSurface';
import cx from 'classnames';
import { ThemeProvider } from './contextProvider';

import type {PointerSurfaceProps} from './PointerSurface';

type CustomButtonProps = PointerSurfaceProps & {
  icon?: string | React.ReactElement | null;
  label?: string | React.ReactElement | null;
  theme?: string
};

export class CustomButton extends React.PureComponent<CustomButtonProps> {
  declare props: CustomButtonProps;

  render(): React.ReactNode {
    const {icon, label, className, title, theme, ...pointerProps} = this.props;
    // const { theme, setTheme } = useTheme();
    const klass = cx(className, 'czi-custom-button', theme);
    return (
      <ThemeProvider theme={theme}>
        <TooltipSurface tooltip={title}>
          <PointerSurface {...pointerProps} className={klass}>
            {icon}
            {label}
          </PointerSurface>
        </TooltipSurface>
      </ThemeProvider>
    );
  }
}

