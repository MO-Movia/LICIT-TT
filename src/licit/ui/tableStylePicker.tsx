/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import React, { ChangeEvent, SyntheticEvent } from 'react';
import { EditorState, Transaction } from 'prosemirror-state';
import { Transform } from 'prosemirror-transform';
import { EditorView } from 'prosemirror-view';

import {
  atAnchorRight,
  createPopUp,
  PopUpHandle,
} from '../../commands';
import { UICommand } from '../../core';
import { CustomStyleCommand } from '../../plugins/custom-styles/CustomStyleCommand';
import {
  getCachedStyles,
  getStylesAsync,
  setStyles,
} from '../../plugins/custom-styles/customStyle';
import type { Style } from '../../plugins/custom-styles/StyleRuntime';
import { DEFAULT_NORMAL_STYLE } from '../../plugins/custom-styles/Constants';
import { RESERVED_STYLE_NONE } from '../../plugins/custom-styles/customStyleConstants';
import { CustomStyleItem } from '../../plugins/custom-styles/ui/CustomStyleItem';
import {
  applyTableStyle,
  TABLE_STYLE_NAME_ATTRIBUTE,
} from '../extensions/tableEx/tableStyle';

class TableStyleItemCommand extends CustomStyleCommand {
  private readonly _onSelect: (style: Style) => void;

  constructor(style: Style, onSelect: (style: Style) => void) {
    super(style, style.styleName);
    this._onSelect = onSelect;
  }

  execute = (): boolean => {
    this._onSelect(this._customStyle as Style);
    return true;
  };
}

type TableStylePickerProps = {
  dispatch: (tr: Transform) => void;
  editorState: EditorState;
  editorView: EditorView;
  onClose?: () => void;
  onSelectStyle: (style: Style) => void;
  selectedStyleName?: string | null;
  theme?: string;
};

type TableStylePickerState = {
  searchTerm: string;
  styles: Style[];
};

type OpenTableStylePickerOptions = {
  anchor: HTMLElement;
  getTablePos: () => number | null;
  onClose?: () => void;
  view: EditorView;
};

function normalizeTableStyles(styles: Style[]): Style[] {
  const availableStyles = (styles || []).filter((style) => style?.styleName);
  const normalStyle = availableStyles.find(
    (style) => style.styleName === RESERVED_STYLE_NONE
  );
  const otherStyles = availableStyles.filter(
    (style) => style.styleName !== RESERVED_STYLE_NONE
  );

  return [normalStyle || DEFAULT_NORMAL_STYLE, ...otherStyles];
}

export function openTableStylePicker({
  anchor,
  getTablePos,
  onClose,
  view,
}: OpenTableStylePickerOptions): PopUpHandle | null {
  const tablePos = getTablePos();
  const table = tablePos === null ? null : view.state.doc.nodeAt(tablePos);
  if (!table || table.type.spec.tableRole !== 'table') {
    return null;
  }

  const picker: PopUpHandle = createPopUp(
    TableStylePicker,
    {
      dispatch: view.dispatch,
      editorState: view.state,
      editorView: view,
      onClose: () => picker.close(undefined),
      onSelectStyle: (style: Style) => {
        const currentTablePos = getTablePos();
        const currentTable =
          currentTablePos === null
            ? null
            : view.state.doc.nodeAt(currentTablePos);
        if (!currentTable || currentTable.type.spec.tableRole !== 'table') {
          return;
        }

        view.dispatch(
          applyTableStyle(
            view.state,
            view.state.tr,
            currentTablePos,
            style.styleName
          ) as Transaction
        );
      },
      selectedStyleName:
        table.attrs[TABLE_STYLE_NAME_ATTRIBUTE] || 'Normal',
      theme: UICommand.theme,
    },
    {
      anchor,
      autoDismiss: true,
      IsChildDialog: true,
      onClose,
      position: atAnchorRight,
    }
  );

  return picker;
}

/**
 * The table menu deliberately exposes only selection and filtering. Editing,
 * deleting, and style-level options remain available only in the main toolbar.
 */
export class TableStylePicker extends React.PureComponent<
  TableStylePickerProps,
  TableStylePickerState
> {
  state: TableStylePickerState = {
    searchTerm: '',
    styles: normalizeTableStyles(getCachedStyles()),
  };

  componentDidMount(): void {
    getStylesAsync()
      .then((styles) => {
        const hasRuntimeStyles = styles.length > 0;
        const availableStyles = normalizeTableStyles(
          hasRuntimeStyles ? styles : getCachedStyles()
        );
        if (hasRuntimeStyles) {
          setStyles(availableStyles);
        }
        this.setState({ styles: availableStyles });
      })
      .catch(console.warn);
  }

  render(): React.ReactElement {
    const searchTerm = this.state.searchTerm.trim().toLowerCase();
    const styles = this.state.styles.filter((style) =>
      style.styleName.toLowerCase().includes(searchTerm)
    );

    return (
      <div className={`molsp-dropbtn ${this.props.theme || ''}`}>
        <div className="molsp-search-wrapper">
          <input
            aria-label="Search table styles"
            className="molsp-search-input"
            onChange={this._onSearchChange}
            onClick={this._stopPropagation}
            onContextMenu={this._stopPropagation}
            onKeyDown={this._stopPropagation}
            placeholder="Search styles"
            type="search"
            value={this.state.searchTerm}
          />
        </div>
        <div className="molsp-stylenames">
          {styles.map((style) => this._renderStyleItem(style))}
        </div>
      </div>
    );
  }

  private _renderStyleItem(style: Style): React.ReactElement {
    const command = new TableStyleItemCommand(style, this._onSelectStyle);
    const selected = style.styleName === this.props.selectedStyleName;

    return (
      <CustomStyleItem
        command={command}
        dispatch={this.props.dispatch}
        editorState={this.props.editorState}
        editorView={this.props.editorView}
        hasText={true}
        key={style.styleName}
        label={style.styleName}
        onClick={this._onCommand}
        onMouseEnter={this._onCommand}
        selectionClassName={selected ? 'selectbackground' : ''}
        showStyleEditAction={false}
        value={command}
      />
    );
  }

  private _onSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
    this.setState({ searchTerm: event.target.value });
  };

  private _stopPropagation = (
    event: SyntheticEvent<HTMLInputElement>
  ): void => {
    event.stopPropagation();
  };

  private _onCommand = (
    command: TableStyleItemCommand,
    event: SyntheticEvent<Element>
  ): void => {
    if (command.shouldRespondToUIEvent(event)) {
      command.execute();
    }
  };

  private _onSelectStyle = (style: Style): void => {
    this.props.onSelectStyle(style);
    this.props.onClose?.();
  };
}

export default TableStylePicker;
