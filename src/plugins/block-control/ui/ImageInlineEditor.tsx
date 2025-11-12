import { CustomButton } from '@modusoperandi/licit-ui-commands';
import React from 'react';
import { Icon } from './Icon';
import { EditorView } from 'prosemirror-view';
export type PropValue = {
  value?: string;
  text?: string;
  label?: string;
};

const ICON_LABEL_PATTERN = /\[([A-Za-z_\d]+)\](.*)/;

type parseLabeltype = {
  icon;
  title;
};

type AlignKey = 'LEFT' | 'CENTER' | 'RIGHT';
type FloatKey = 'FLOAT_LEFT' | 'FLOAT_RIGHT';
type AlterKey = 'DELETE';

const ImageAlignValues: { [key in AlignKey]: PropValue } = {
  LEFT: {
    value: 'left',
    text: 'Left',
    label: '[format_align_left] Left Align',
  },
  CENTER: {
    value: 'center',
    text: 'Center',
    label: '[format_align_center] Center Align',
  },
  RIGHT: {
    value: 'right',
    text: 'Right',
    label: '[format_align_right] Right Align',
  },
};
const ImageFloatValues: { [key in FloatKey]: PropValue } = {
  FLOAT_LEFT: {
    value: 'float-left',
    text: 'Float left',
    label: '[format_textdirection_r_to_l] Left Align',
  },

  FLOAT_RIGHT: {
    value: 'float-right',
    text: 'Float right',
    label: '[format_textdirection_l_to_r] Right Align',
  },
};
const ImageAlterValues: { [key in AlterKey]: PropValue } = {

  DELETE: {
    value: 'delete',
    text: 'Delete',
    label: '[delete] ',
  },
};
export type ImageInlineEditorValue = {
  align?: string;
  src?;
};
type ImageInlineProps = {
  onSelect: (val: ImageInlineEditorValue) => void;
  value: ImageInlineEditorValue;
  editorView: EditorView;
};
export class ImageInlineEditor extends React.PureComponent {
  declare props: ImageInlineProps;
  state = {
    expanded: false,
    srcc: null,
  };

  render(): React.ReactNode {
    const alignButtons = this.prepButtons(ImageAlignValues);
    const floatButtons = this.prepButtons(ImageFloatValues);
    const alterButtons = this.prepButtons(ImageAlterValues);
    return (
      <div className="molm-czi-inline-editor">
        <span className="molm-czi-custom-buttons">{alignButtons}</span>
        <span className="molm-czi-custom-buttons">{floatButtons}</span>
        <span className="molm-czi-custom-buttons">{alterButtons}</span>
      </div>
    );
  }

  prepButtons(ImgValues) {
    let buttons;
    const align = this.props?.value ? this.props?.value.align : null;
    const onClick = this._onClick;
    const { editorView } = this.props;
    this.setState({ srcc: this.props?.value?.src });
    if (ImgValues === ImageAlterValues) {
      const onAlter = this._onAlter;
      const onRemove = this._onRemove.bind(this, editorView);
      buttons = Object.keys(ImageAlterValues).map((key) => {
        const { text, label } = ImageAlterValues[key];
        const { icon } = this.parseLabel(label);
        return (
          <CustomButton
            icon={icon}
            key={key}
            onClick={key === 'EDIT' ? onAlter : onRemove}
            title={text}
            value={editorView}
          />
        );
      });
    } else {
      buttons = Object.keys(ImgValues).map((key) => {
        const { value, text, label } = ImgValues[key];
        const { icon } = this.parseLabel(label, value);

        return (
          <CustomButton
            active={align === value}
            icon={icon}
            key={key}
            onClick={onClick}
            title={text}
            value={value}
          />
        );
      });
    }
    return buttons;
  }

  parseLabel(input: string, value?): parseLabeltype {
    const matched = RegExp(ICON_LABEL_PATTERN).exec(input);
    if (matched) {
      const icon = matched[1];
      const label = matched[2];
      if (value) {
        const klass = 'molm-custom-align-icon-' + value;
        return {
          icon: <span className={klass}>{value}</span>,
          title: label || null,
        };
      }
      return {
        icon: icon ? Icon.get(icon) : null,
        title: label || null,
      };
    }
    return {
      icon: null,
      title: input || null,
    };
  }

  _onClick = (align?: string) => {
    this.props?.onSelect({ align: align });
  };

  _onAlter = (): void => {
    //Handle Edit
  };
  _onRemove = (view: EditorView): void => {
    const { dispatch } = view;
    let tr = view.state.tr;
    tr = tr.deleteSelection();
    dispatch(tr);
  };
}
