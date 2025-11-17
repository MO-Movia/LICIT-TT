import { UICommand } from '@modusoperandi/licit-doc-attrs-step';
import { applyMark, updateMarksAttrs } from './applyMark';
import { createPopUp } from './ui/createPopUp';
import { findNodesWithSameMark } from './findNodesWithSameMark';
import { isTextStyleMarkCommandEnabled } from './isTextStyleMarkCommandEnabled';
import { EditorState, TextSelection, Transaction } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';
import { MARK_TEXT_HIGHLIGHT } from './MarkNames';
import { Transform } from '@tiptap/pm/transform';
import { RuntimeService } from './runtime.service';
import { ColorEditor } from '@modusoperandi/color-picker';

export class TextHighlightCommand extends UICommand {
  _popUp: unknown = null;
  _color = '';

  constructor(color?: string) {
    super();
    this._color = color;
  }
  isEnabled = (state: EditorState): boolean => {
    return isTextStyleMarkCommandEnabled(state, MARK_TEXT_HIGHLIGHT);
  };

  waitForUserInput = (
    state: EditorState,
    _dispatch?: (tr: Transform) => void,
    _view?: EditorView,
    event?: Event
  ): Promise<undefined> => {
    if (this._popUp) {
      return Promise.resolve(undefined);
    }
    const target = event?.currentTarget;
    if (!(target instanceof HTMLElement)) {
      return Promise.resolve(undefined);
    }

    const { doc, selection, schema } = state;
    const markType = schema.marks[MARK_TEXT_HIGHLIGHT];
    const { from, to } = selection;
    const result = findNodesWithSameMark(doc, from, to, markType);
    const hex = result ? result.mark.attrs.highlightColor : null;
    const anchor = event?.currentTarget;
    const node = state.tr.doc.nodeAt(from);
    const Textmark = node?.marks.find((mark) => mark?.attrs?.highlightColor);
    const Textcolor = Textmark?.attrs?.highlightColor;

    return new Promise((resolve) => {
      this._popUp = createPopUp(
        ColorEditor,
        { hex, runtime: RuntimeService.Runtime, Textcolor },
        {
          anchor,
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
    _view?: EditorView,
    color?: { color; selectedOption }
  ): boolean => {
    if (dispatch && color?.color !== undefined) {
      const { schema } = state;
      let { tr } = state;
      const markType = schema.marks?.[MARK_TEXT_HIGHLIGHT];
      const attrs = { highlightColor: color.color, overridden: true };
      (tr as Transform) = applyMark(tr, schema, markType, attrs);
      updateMarksAttrs(markType, tr, state, color.color);
      if (tr.docChanged || tr.storedMarksSet) {
        // If selection is empty, the color is added to `storedMarks`, which
        // works like `toggleMark`
        // (see https://prosemirror.net/docs/ref/#commands.toggleMark).
        dispatch(tr);
        return true;
      }
    }
    return false;
  };
  // [FS] IRAD-1087 2020-09-30
  // Method to execute custom styling implementation of Text Highlight
  executeCustom = (
    state: EditorState,
    tr: Transform,
    from: number,
    to: number
  ): Transform => {
    const { schema } = state;
    const markType = schema.marks[MARK_TEXT_HIGHLIGHT];
    const attrs = { highlightColor: this._color };
    tr = applyMark(
      (tr as Transaction).setSelection(TextSelection.create(tr.doc, from, to)),
      schema,
      markType,
      attrs,
      true
    );
    return tr;
  };

  executeCustomStyleForTable = (
    state: EditorState,
    tr: Transform,
    from: number,
    to: number
  ): Transform => {
    const { schema } = state;
    const markType = schema.marks[MARK_TEXT_HIGHLIGHT];
    const attrs = { highlightColor: this._color };
    tr = applyMark(
      (tr as Transaction).setSelection(TextSelection.create(tr.doc, from, to)),
      schema,
      markType,
      attrs,
      true
    );
    return tr;
  };

  cancel(): void {
    return null;
  }

  isActive(): boolean {
    return true;
  }

  renderLabel() {
    return null;
  }
}
