import Color, {ColorInstance} from 'color';
import * as React from 'react';

import {CustomButton} from './CustomButton';
import {clamp} from './clamp';

function generateGreyColors(count: number): Array<ColorInstance> {
  let cc = 255;
  const interval = cc / count;
  const colors = [];
  while (cc > 0) {
    const color = Color({r: cc, g: cc, b: cc});
    cc -= interval;
    cc = Math.floor(cc);
    colors.unshift(color);
  }
  return colors;
}

function generateRainbowColors(
  count: number,
  saturation: number,
  lightness: number
): Array<ColorInstance> {
  const colors = [];
  const interval = 360 / count;
  const ss = clamp(0, saturation, 100);
  const ll = clamp(0, lightness, 100);
  let hue = 0;
  while (hue < 360) {
    const hsl = `hsl(${hue},${ss}%,${ll}%)`;
    const color = Color(hsl);
    colors.unshift(color);
    hue += interval;
  }
  return colors;
}

export class ColorEditor extends React.PureComponent<{
  close: (hex: string) => void;
  hex?: string;
}> {
  render(): React.ReactElement<CustomButton> {
    const renderColor = this._renderColor;
    const selectedColor = this.props.hex;
    return (
      <div className="czi-color-editor">
        <div className="czi-color-editor-section">
          <CustomButton
            active={!selectedColor}
            className="czi-color-editor-color-transparent"
            label="Transparent"
            onClick={this._onSelectColor}
            value="rgba(0,0,0,0)"
          />
        </div>
        <div className="czi-color-editor-section">
          {generateGreyColors(10).map(renderColor)}
        </div>
        <div className="czi-color-editor-section">
          {generateRainbowColors(10, 90, 50).map(renderColor)}
        </div>
        <div className="czi-color-editor-section">
          {generateRainbowColors(30, 70, 70).map(renderColor)}
        </div>
        <div className="czi-color-editor-section">
          {generateRainbowColors(30, 90, 30).map(renderColor)}
        </div>
      </div>
    );
  }

  private readonly _renderColor = (
    color: ColorInstance,
    index: number
  ): React.ReactElement<CustomButton> => {
    const selectedColor = this.props.hex;
    const hex = color.hex().toLowerCase();
    const style = {backgroundColor: hex};
    const active = selectedColor?.toLowerCase() === hex;
    return (
      <CustomButton
        active={active}
        className="czi-color-editor-cell"
        id={`$c-btn-${index}`}
        key={`${hex}-${index}`}
        label=""
        onClick={this._onSelectColor}
        style={style}
        value={hex}
      />
    );
  };

  private readonly _onSelectColor = (hex: string): void => {
    this.props.close(hex);
  };
}
