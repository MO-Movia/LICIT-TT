import * as React from 'react';
import { UICommand } from '@modusoperandi/licit-doc-attrs-step';
import { EditorState } from '@tiptap/pm/state';
import { Transform } from '@tiptap/pm/transform';
import { EditorView } from '@tiptap/pm/view';
import { InfoIconDialog } from './infoIconDialog';
import { createPopUp } from '@modusoperandi/licit-ui-commands';
import type { PopUpHandle } from '@modusoperandi/licit-ui-commands';
import { getNode } from './constants';
import { DOMSerializer, Fragment } from '@tiptap/pm/model';

export class InfoIconCommand extends UICommand {
  _popUp: PopUpHandle | null = null;
  _alertPopup: PopUpHandle | null = null;
  _color = '';

  constructor(color?: string) {
    super();
    this._color = color;
  }
  isEnabled = (state: EditorState): boolean => {
    return this._isEnabled(state);
  };
  createInfoObject(editorView: EditorView, mode: number) {
    return {
      infoIcon: '',
      description: '',
      mode: mode, //0 = new , 1- modify, 2- delete
      editorView: editorView,
      selectedIconName: '',
    };
  }
  waitForUserInput = (
    _state: EditorState,
    _dispatch?: (tr: Transform) => void,
    view?: EditorView,
    _event?: React.SyntheticEvent
  ): Promise<unknown> => {
    if (this._popUp) {
      return Promise.resolve(undefined);
    }
    return new Promise((resolve) => {
      this._popUp = createPopUp(
        InfoIconDialog,
        this.createInfoObject(view, 1),
        {
          modal: true,
          IsChildDialog: false,
          autoDismiss: false,
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
    dispatch: (tr: Transform) => void | undefined,
    _view: EditorView | undefined,
    infoIcon
  ): boolean => {
    if (dispatch) {
      const { selection } = state;
      let { tr } = state;
      tr = tr.setSelection(selection);
      const from = state.selection.from;
      const to = state.selection.to;
      const node = getNode(from, to, tr);
      if (node && infoIcon) {
        const div = document.createElement('div');
        const fragm = this.getFragm(infoIcon);
        div.appendChild(fragm);
        const desc = div.innerHTML;
        const infoicon = state.schema.nodes['infoicon'];
        let newAttrs = {};
        Object.assign(newAttrs, infoicon['attrs']);
        newAttrs = this.createInfoIconAttrs(from, to, desc, infoIcon);
        const infoiconNode = infoicon.create(null);
        const $head = state.selection.$head;
        let listNodeAttr = null;
        let listPos = 0;
        for (let d = $head.depth; d > 0; d--) {
          if (this.isList($head, d)) {
            listNodeAttr = { ...$head.node(d).attrs };
            listPos = $head['path'][d + 4];
            break;
          }
        }
        tr = tr.insert(to, Fragment.from(infoiconNode));
        tr = tr.setNodeMarkup(to, undefined, newAttrs);
        if (listNodeAttr) {
          tr = tr.setNodeMarkup(listPos, undefined, listNodeAttr);
        }
      }
      dispatch(tr);
    }

    return false;
  };

  cancel(): void {
    return null;
  }

  createInfoIconAttrs(from, to, desc, infoIcon) {
    const newAttrs = {};
    Object.assign(newAttrs, infoIcon['attrs']);
    newAttrs['from'] = from;
    newAttrs['to'] = to;
    newAttrs['description'] = desc;
    newAttrs['infoIcon'] = infoIcon.infoIcon;
    return newAttrs;
  }

  getFragm(infoIcon) {
    return DOMSerializer.fromSchema(
      infoIcon.editorView.state.schema
    ).serializeFragment(this.getDocContent(infoIcon));
  }

  getDocContent(infoIcon) {
    return infoIcon.editorView.state.doc.content;
  }

  isList($head, d) {
    return !!(
      $head.node(d).type.name === 'ordered_list' ||
      $head.node(d).type.name === 'bullet_list'
    );
  }

  getParentNodeSize(state: EditorState): number {
    return state.selection.$head.parent.nodeSize - 2;
  }

  getParentStartPos(head): number {
    return head.pos - head.parentOffset;
  }

  _isEnabled = (state: EditorState): boolean => {
    const tr = state.tr;
    if (!tr.selection.empty) {
      return false;
    }
    return true;
  };

  renderLabel() {
    return;
  }
  isActive(): boolean {
    return true;
  }
  executeCustom(_state: EditorState, tr: Transform): Transform {
    return tr;
  }
  executeCustomStyleForTable(
    _state: EditorState,
    tr: Transform,
    _from: number,
    _to: number
  ): Transform {
    return tr;
  }
}
