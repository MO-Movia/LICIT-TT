// @flow

import {EditorState} from 'prosemirror-state';
import {setCellAttr} from 'prosemirror-tables';
import {Transform} from 'prosemirror-transform';
import {EditorView} from 'prosemirror-view';

import {
  PopUpHandle,
  atAnchorRight,
  createPopUp,
  findNodesWithSameMark,
  MARK_TEXT_COLOR,
  RuntimeService,
} from '@modusoperandi/licit-ui-commands';
import {ColorEditor} from '@modusoperandi/color-picker';
import {UICommand} from '@modusoperandi/licit-doc-attrs-step';

export class TableColorCommand extends UICommand {
  executeCustomStyleForTable(
    _state: EditorState,
    tr: Transform,
    _from: number,
    _to: number
  ): Transform {
    return tr;
  }
  _popUp?: PopUpHandle = null;

  getAttrName = (): string => {
    return '';
  };

  isEnabled = (_state: EditorState): boolean => {
    return true;
  };

  shouldRespondToUIEvent = (e: React.SyntheticEvent | MouseEvent): boolean => {
    return e.type === UICommand.EventType.MOUSEENTER;
  };

  waitForUserInput = (
    _state: EditorState,
    _dispatch?: (tr: Transform) => void,
    _view?: EditorView,
    event?: React.SyntheticEvent
  ): Promise<unknown> => {
    if (this._popUp) {
      return Promise.resolve(undefined);
    }
    const target = event?.currentTarget;
    if (!(target instanceof HTMLElement)) {
      return Promise.resolve(undefined);
    }
    const {doc, selection, schema} = _state;
    const {from, to} = selection;
    const markType = schema.marks[MARK_TEXT_COLOR];
    const result = findNodesWithSameMark(doc, from, to, markType);
    const hex = result?.mark.attrs.color ?? null;
    const anchor = event?.currentTarget;
    const node = _state.tr.doc.nodeAt(from);
    const Textmark = node?.marks.find((mark) => mark?.attrs?.color);
    const Textcolor = Textmark?.attrs?.color;
    // [FS] KNITE-1489 2024-12-25
    // Fix:VIgnette Color and Border Palette GUIs should match GUIs of Font and Background tools in Doc Edit View
    return new Promise((resolve) => {
      this._popUp = createPopUp(
        ColorEditor,
        {hex, runtime: RuntimeService.Runtime, Textcolor},
        {
          anchor,
          position: atAnchorRight,
          popUpId: 'mo-menuList-child',
          autoDismiss: true,
          onClose: (val) => {
            if (this._popUp) {
              this._popUp = null;
              resolve(val);
            }
          },
        }
      );
    });
  };

  executeWithUserInput = (
    state: EditorState,
    dispatch?: (tr: Transform) => void,
    view?: EditorView,
    color?: {color; selectedOption}
  ): boolean => {
    if (dispatch && color?.color !== undefined) {
      const cmd = setCellAttr(this.getAttrName(), color.color);
      cmd(state, dispatch, view);
      return true;
    }
    return false;
  };

  cancel(): void {
    this._popUp?.close(undefined);
  }

  renderLabel() {
    return null;
  }
  isActive(): boolean {
    return true;
  }
  executeCustom(_state: EditorState, tr: Transform): Transform {
    return tr;
  }
}
