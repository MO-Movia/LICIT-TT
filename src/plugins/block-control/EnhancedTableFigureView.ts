import { Node as ProseMirrorNode } from 'prosemirror-model';
import { EditorView, NodeView } from 'prosemirror-view';
import { NodeSelection, TextSelection } from 'prosemirror-state';
import { addNotesCommand } from './EnhancedTableCommands';
import { atAnchorBottomCenter, createPopUp, PopUpHandle, uuid } from '@modusoperandi/licit-ui-commands';
import { ImageInlineEditor } from './ui/ImageInlineEditor';

const FRAMESET_BODY_CLASSNAME = 'czi-editor-frame-body';

export class EnhancedTableFigureView implements NodeView {
  node: ProseMirrorNode;
  view: EditorView;
  getPos: () => number;
  dom: HTMLElement;
  contentDOM: HTMLElement;
  addNotesButton: HTMLButtonElement;
  selectHandle: HTMLElement;
  _inlineEditor?: PopUpHandle;
  _id = uuid();

  constructor(node: ProseMirrorNode, view: EditorView, getPos: () => number) {
    this.node = node;
    this.view = view;
    this.getPos = getPos;

    // Main container
    this.dom = document.createElement('div');
    this.dom.setAttribute('id', this._id);
    this.dom.className = 'enhanced-table-figure';
    this.dom.setAttribute('data-type', 'enhanced-table-figure');
    this.dom.setAttribute('data-id', node.attrs.id);
    this.dom.setAttribute('data-figure-type', node.attrs.figureType);
    this.dom.style.position = 'relative';
    this.dom.style.overflow = 'visible';

    // contentDOM
    this.contentDOM = document.createElement('div');

    const isLandscape = this.node.attrs.orientation === 'landscape';
    const portraitWidthPx = 6.5 * 96; // 624
    const landscapeWidthPx = 9 * 96; // 864

    // This is the scrollable container
    this.dom.style.width = `${portraitWidthPx}px`;
    this.dom.style.maxWidth = `${portraitWidthPx}px`;
    this.dom.style.overflowX = 'auto'; // <-- Enable horizontal scrolling here
    this.dom.style.overflowY = 'visible';

    // This is the wider content (table holder)
    this.contentDOM.style.width = isLandscape ? `${landscapeWidthPx}px` : '100%';

    // end
    this.contentDOM.className = 'enhanced-table-figure-content';
    this.dom.appendChild(this.contentDOM);

    // Add Notes button
    this.addNotesButton = document.createElement('button');
    this.addNotesButton.className = 'enhanced-table-figure-add-notes';
    this.addNotesButton.classList.add('handle-hidden-on-hover');
    this.addNotesButton.textContent = 'Add Notes';
    Object.assign(this.addNotesButton.style, {
      position: 'absolute',
      bottom: '2px',
      right: '2px',
      display: 'none',
    });
    this.addNotesButton.addEventListener('click', (event) => {
      event.preventDefault();
      const { state, dispatch } = this.view;
      dispatch(addNotesCommand(state.tr, state.schema, this.getPos()));
    });
    this.dom.appendChild(this.addNotesButton);

    // Selection handle
    this.selectHandle = document.createElement('div');
    this.selectHandle.className = 'enhanced-table-figure-select-handle';
    this.selectHandle.textContent = '☰';
    Object.assign(this.selectHandle.style, {
      position: 'absolute',
      top: '0px',
      right: '0px',
      cursor: 'pointer',
      padding: '2px 4px',
      background: '#ccc',
      borderRadius: '3px',
      zIndex: '10',
    });
    this.selectHandle.addEventListener('click', (e) => {
      e.preventDefault();
      const { state, dispatch } = this.view;
      const pos = this.getPos();
      if (state.selection instanceof NodeSelection && state.selection.from === pos) {
        dispatch(state.tr.setSelection(TextSelection.create(state.doc, pos + 1)));
      } else {
        dispatch(state.tr.setSelection(NodeSelection.create(state.doc, pos)));
      }
    });
    this.selectHandle.classList.add('handle-hidden-on-hover');
    this.dom.classList.add('has-hover-handle');
    this.dom.appendChild(this.selectHandle);
    this.updateNotesTrigger();
  }

  onResizeEnd = (newWidth: number, newHeight: number) => {
    const { state, dispatch } = this.view;
    const pos = this.getPos();
    dispatch(
      state.tr.setNodeMarkup(pos, undefined, {
        ...this.node.attrs,
        width: newWidth,
        height: newHeight,
      })
    );
  };

  update(node: ProseMirrorNode): boolean {
    if (node.type === this.node.type) {
      const isLandscape = node.attrs.orientation === 'landscape';
      this.dom.style.overflowX = 'auto';
      this.dom.style.width = `${6.5 * 96}px`;
      this.dom.style.maxWidth = `${6.5 * 96}px`;
      this.contentDOM.style.width = isLandscape ? `${9 * 96}px` : '100%';

      //end
      this.node = node;
      this.dom.setAttribute('data-id', node.attrs.id);
      this.dom.setAttribute('data-figure-type', node.attrs.figureType);
      this.updateNotesTrigger();
    }
    return false;
  }

  updateNotesTrigger() {
    let notesExists = false;
    this.node.forEach(child => {
      if (child.type.name === 'enhanced_table_figure_notes') {
        notesExists = true;
      }
    });
    this.addNotesButton.style.display =
      !notesExists && (this.node.attrs.figureType === 'table' || this.node.attrs.figureType === 'figure') ? 'block' : 'none';
  }

  selectNode() {
    this.dom.classList.add('ProseMirror-selectednode');
    this.dom.setAttribute('data-active', 'true');
    this._renderInlineEditor();
  }

  deselectNode() {
    this.dom.setAttribute('data-active', undefined);
    this._inlineEditor?.close?.(undefined);
    this.dom.classList.remove('ProseMirror-selectednode');
  }

  destroy() {
    this._inlineEditor?.close?.(undefined);
  }

  stopEvent(_event: Event): boolean {
    return false;
  }

  private _renderInlineEditor(): void {
    const editorProps = {
      value: this.node.attrs,
      onSelect: this._onChange,
      editorView: this.view,
    };
    const el = document.getElementById(this._id);
    if (!el || el.getAttribute('data-active') !== 'true') {
      this._inlineEditor?.close?.(undefined);
      return;
    }

    if (!this._inlineEditor) {
      this._inlineEditor = createPopUp(ImageInlineEditor, editorProps, {
        anchor: el,
        autoDismiss: false,
        container: el.closest(`.${FRAMESET_BODY_CLASSNAME}`),
        position: atAnchorBottomCenter,
        onClose: () => {
          this._inlineEditor = null;
        },
      });
    }
  }

  _onChange = (value?: { align: string }): void => {

    const align = value ? value.align : null;
    const pos = this.getPos();
    const attrs = {
      ...this.node.attrs,
      align,
    };

    let tr = this.view.state.tr;
    const { selection } = this.view.state;
    tr = tr.setNodeMarkup(pos, null, attrs);
    // reset selection to original using the latest doc.
    const origSelection = NodeSelection.create(tr.doc, selection.from);
    tr = tr.setSelection(origSelection);
    this.view.dispatch(tr);
  };
}
