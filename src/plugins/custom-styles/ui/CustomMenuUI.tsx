/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import React, { SyntheticEvent } from 'react';
import { EditorState } from 'prosemirror-state';
import { Schema, Node } from 'prosemirror-model';
import { Transform } from 'prosemirror-transform';
import { EditorView } from 'prosemirror-view';
import { UICommand } from '../../../core';
import { uuid } from './Uuid';
import { CustomStyleItem } from './CustomStyleItem';
import { CustomStyleSubMenu } from './CustomStyleSubMenu';
import { CustomStyleEditor } from './CustomStyleEditor';
import type { Style } from '../StyleRuntime';
import {
  applyLatestStyle,
  CustomStyleCommand,
  updateDocument,
} from '../CustomStyleCommand';
import {
  setStyles,
  saveStyle,
  renameStyle,
  removeStyle,
  addStyleToList,
} from '../customStyle';
import {
  setTextAlign,
  setTextLineSpacing,
  atViewportCenter,
  createPopUp,
  HeadingCommand,
} from '../../../commands';
import { setParagraphSpacing } from '../ParagraphSpacingCommand';
import { RESERVED_STYLE_NONE } from '../CustomStyleNodeSpec';

let HEADING_COMMANDS = {
  [RESERVED_STYLE_NONE]: new HeadingCommand(0),
};

type CustomMenuCommandGroup = Record<string, unknown>;

type CustomMenuUIProps = {
  dispatch: (tr: Transform) => void;
  editorState: EditorState;
  editorView: Partial<EditorView> & { disabled?: boolean };
  onCommand?: () => void;
  staticCommand: CustomMenuCommandGroup[];
  theme?: string;
};

type CustomMenuUIState = {
  expanded: boolean;
  style: {
    display: string;
    top: string;
    left: string;
  };
};

export class CustomMenuUI extends React.PureComponent<
  CustomMenuUIProps,
  CustomMenuUIState
> {
  _popUp = null;
  _stylePopup = null;
  _styleName = null;
  _menuItemHeight = 24;

  _id = uuid();
  _menuRef = React.createRef<HTMLDivElement>();
  _navItems: Array<{ command: UICommand; label: string }> = [];
  _staticItems: Array<{ command: UICommand; label: string }> = [];
  _appliedIndex = 0;
  // [Keyboard navigation] Last real pointer position, used to tell genuine
  // mouse movement apart from the mouseover the browser fires when the list
  // scrolls under a stationary cursor (during arrow-key navigation).
  _lastPointerX: number | null = null;
  _lastPointerY: number | null = null;

  state = {
    expanded: false,
    selectedIndex: 0,
    style: {
      display: 'none',
      top: '',
      left: '',
    },
  };
  theme = null;

  normalizeSavedStyles(
    result
  ): Style[] {
    const normalizedResult = Array.isArray(result)
      ? result
      : addStyleToList(result);
    return normalizedResult as Style[];
  }

  closeStylePopup() {
    this.props.editorView.focus?.();
    this._stylePopup?.close();
    this._stylePopup = null;
  }

  findMatchingStyle(
    result: Style[],
    styleName: string
  ) {
    return result.find((obj) => styleName === obj.styleName);
  }

  applySavedStyleResult(val, result, getTransform) {
    if (!result) {
      this.closeStylePopup();
      return;
    }

    const normalizedResult = this.normalizeSavedStyles(result);
    setStyles(normalizedResult);
    const matchingStyle = this.findMatchingStyle(normalizedResult, val.styleName);
    const tr = matchingStyle ? getTransform(matchingStyle) : null;
    if (tr) {
      this.props.editorView.dispatch?.(tr);
    }
    this.closeStylePopup();
  }

  saveStyleAndApply(val, getTransform) {
    delete val.editorView;
    saveStyle(val)
      .then((result) => {
        this.applySavedStyleResult(val, result, getTransform);
      })
      .catch(console.warn);
  }

  handleEditModeSave(val) {
    this.saveStyleAndApply(val, (obj) =>
      updateDocument(
        this.props.editorState,
        this.props.editorState.tr,
        val.styleName,
        obj
      )
    );
  }

  handleRenameModeSave(val) {
    renameStyle(this._styleName, val.styleName)
      .then((result) => {
        if (null == result) {
          return;
        }
        this.saveStyleAndApply(val, () =>
          this.renameStyleInDocument(
            this.props.editorState,
            this.props.editorState.tr,
            this._styleName,
            val.styleName
          )
        );
      })
      .catch(console.warn);
  }

  render() {
    const { dispatch, editorState, editorView, staticCommand, onCommand } =
      this.props;
    const children = [];
    const children1 = [];
    const theme = this.props.theme;
    this.theme =  this.props.theme;
    const selectedName = this.getTheSelectedCustomStyle(this.props.editorState);
    // [Keyboard navigation] One highlight, driven by selectedIndex, is shared
    // by mouse and keyboard. Every row (style names and the static commands
    // below the <hr>) occupies a slot in a single index space: style rows come
    // first (0.._navItems.length-1, the range the arrow keys cycle through),
    // followed by the static rows. Hovering a row sets selectedIndex to its
    // slot, so the same 'selectbackground' highlight follows the pointer.
    // _appliedIndex tracks the currently applied style so the highlight can
    // start there on mount.
    this._navItems = [];
    this._staticItems = [];
    const commandGroups_nw = this.getCommandGroups();
    for (const group of commandGroups_nw) {
      for (const label of Object.keys(group)) {
        const command = group[label];
        const index = this._navItems.length;
        if (label === selectedName) {
          this._appliedIndex = index;
        }
        const isSelected = index === this.state.selectedIndex;
        children.push(
          <CustomStyleItem
            command={command}
            disabled={!!editorView?.disabled}
            dispatch={dispatch}
            editorState={editorState}
            editorView={editorView as EditorView}
            hasText={true}
            index={index}
            key={label}
            label={label}
            onClick={this._onUIEnter}
            onCommand={onCommand}
            onMouseEnter={this._onUIEnter}
            selectionClassName={isSelected ? 'selectbackground' : ''}
            value={command}
          ></CustomStyleItem>
        );
        this._navItems.push({ command, label });
      };
    };
    for (const group of staticCommand) {
      for (const label of Object.keys(group)) {
        const command = group[label];
        const index = this._navItems.length + this._staticItems.length;
        const isSelected = index === this.state.selectedIndex;
        children1.push(
          <CustomStyleItem
            command={command}
            disabled={!!editorView?.disabled}
            dispatch={dispatch}
            editorState={editorState}
            editorView={editorView as EditorView}
            hasText={false}
            index={index}
            key={label}
            label={command._customStyleName}
            onClick={this._onUIEnter}
            onCommand={onCommand}
            onMouseEnter={this._onUIEnter}
            selectionClassName={isSelected ? 'selectbackground' : ''}
            value={command}
          ></CustomStyleItem>
        );
        this._staticItems.push({ command, label: command._customStyleName });
      };
    };
    const className = 'molsp-dropbtn ' + theme;
    return (
      <div onKeyDown={this._onMenuKeyDown} ref={this._menuRef} tabIndex={-1}>
        <span data-cy="cyStyleDropdown">
          <div className={className} id={this._id}>
            <div className="molsp-stylenames">{children}</div>

            <hr className="molsp-stylenames-hr"></hr>
            <div className="molsp-stylenames">{children1}</div>
          </div>
        </span>
      </div>
    );
  }

  componentDidMount() {
    // [Keyboard navigation] Start the highlight on the applied style, scroll it
    // into view, and focus the menu so the arrow keys work without a click.
    this.setState({ selectedIndex: this._appliedIndex }, () =>
      this._scrollAppliedStyleIntoView()
    );
    requestAnimationFrame(() => this._menuRef.current?.focus());
    // [Keyboard navigation] Hover is wired with a NATIVE delegated mouseover
    // listener rather than a React onMouseOver/onMouseEnter prop. This menu is
    // rendered into a foreign React root via createPopUp (legacy
    // ReactDOM.render), where React's synthetic mouse events are unreliable;
    // a native listener on the real DOM node always fires as events bubble.
    this._menuRef.current?.addEventListener('mouseover', this._onMenuMouseOver);
  }

  componentWillUnmount() {
    this._menuRef.current?.removeEventListener(
      'mouseover',
      this._onMenuMouseOver
    );
  }

  // [Keyboard navigation] Map the hovered element back to its row via the
  // data-index attribute and make it the single selection, so mouse and
  // keyboard share one highlight.
  _onMenuMouseOver = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    const row = target?.closest?.('[data-index]') as HTMLElement | null;
    if (!row) {
      return;
    }
    // Ignore the mouseover the browser fires when arrow-key scrolling moves a
    // new row under a stationary pointer: the pointer coordinates are
    // unchanged, so this is not a real hover and must not hijack the keyboard
    // selection. Only act on genuine pointer movement.
    if (e.clientX === this._lastPointerX && e.clientY === this._lastPointerY) {
      return;
    }
    this._lastPointerX = e.clientX;
    this._lastPointerY = e.clientY;
    const index = Number(row.getAttribute('data-index'));
    if (!Number.isNaN(index)) {
      this._onItemMouseEnter(index);
    }
  };

  // [Keyboard navigation] On open, place the applied style near the top of the
  // list (a couple of rows of context above it) so it is visible. This is the
  // original one-shot placement and runs only from componentDidMount.
  _scrollAppliedStyleIntoView() {
    const styleDiv = document.getElementsByClassName('molsp-stylenames')[0];
    if (styleDiv) {
      styleDiv.scrollTop =
        this._menuItemHeight * this.state.selectedIndex -
        this._menuItemHeight * 2 -
        5;
    }
  }

  // [Keyboard navigation] Keep the highlighted row visible during arrow
  // navigation, scrolling ONLY when the row is outside the visible area.
  // Re-pinning the scroll position on every press (the old behaviour) made the
  // whole list jump one row per keystroke even when the row was already in
  // view; here we nudge just enough to reveal a row that is above or below the
  // viewport and leave the scroll untouched otherwise.
  scrollSelectedIntoView() {
    const styleDiv = document.getElementsByClassName('molsp-stylenames')[0];
    if (!styleDiv) {
      return;
    }
    const rowTop = this._menuItemHeight * this.state.selectedIndex;
    const rowBottom = rowTop + this._menuItemHeight;
    const viewTop = styleDiv.scrollTop;
    const viewBottom = viewTop + styleDiv.clientHeight;
    if (rowTop < viewTop) {
      styleDiv.scrollTop = rowTop;
    } else if (rowBottom > viewBottom) {
      styleDiv.scrollTop = rowBottom - styleDiv.clientHeight;
    }
  }

  // [Keyboard navigation] Hovering a row makes it the single selection, so the
  // mouse and the arrow keys share one highlight instead of showing two.
  _onItemMouseEnter = (index: number) => {
    this.setState({ selectedIndex: index });
  };

  // [Keyboard navigation] Move the highlight with ArrowUp/ArrowDown (wrapping
  // around) and activate the highlighted row with Enter. preventDefault /
  // stopPropagation keep the keys from leaking to the ProseMirror editor.
  _onMenuKeyDown = (e: React.KeyboardEvent) => {
    const items = this._navItems;
    if (!items.length) {
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      this.setState(
        (prev) => {
          const last = items.length - 1;
          // The selection may currently sit on a static row (set by hover);
          // arrow keys only cycle the style names, so re-enter that range.
          const onStyleRow =
            prev.selectedIndex >= 0 && prev.selectedIndex <= last;
          let next: number;
          if (!onStyleRow) {
            next = e.key === 'ArrowDown' ? 0 : last;
          } else {
            next =
              e.key === 'ArrowDown'
                ? prev.selectedIndex < last
                  ? prev.selectedIndex + 1
                  : 0
                : prev.selectedIndex > 0
                  ? prev.selectedIndex - 1
                  : last;
          }
          return { selectedIndex: next };
        },
        () => this.scrollSelectedIntoView()
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      // Enter activates whichever row is highlighted — a style name or, if the
      // pointer last hovered below the <hr>, a static command.
      const selected =
        items[this.state.selectedIndex] ??
        this._staticItems[this.state.selectedIndex - items.length];
      if (selected) {
        this._execute(selected.command, e);
      }
    }
  };

  isAllowedNode(node: Node) {
    return (
      node.type.name === 'paragraph' ||
      node.type.name === 'ordered_list' ||
      node.type.name === 'enhanced_table_figure_notes'
    );
  }

  _onUIEnter = (command: UICommand, event: SyntheticEvent<Element>) => {
    if (command.shouldRespondToUIEvent(event)) {
      // check the mouse clicked on down arror to show sub menu
      if (event.currentTarget.className === 'czi-custom-menu-item edit-icon') {
        this.showSubMenu(command, event);
      } else {
        this._execute(command, event);
      }
    }
  };

  _execute = (command: UICommand, e: SyntheticEvent<Element>) => {
    if (undefined !== command) {
      const { dispatch, editorState, editorView, onCommand } = this.props;
      command.execute(editorState, dispatch, editorView as EditorView, e);
      onCommand?.();
    }
  };

  //shows the alignment and line spacing option
  showSubMenu(command: UICommand, event: SyntheticEvent<Element>) {
    const anchor = event ? event.currentTarget : null;

    // close the popup toggling effect
    if (this._stylePopup) {
      this._stylePopup.close();
      this._stylePopup = null;
      return;
    }
    this._popUp = createPopUp(
      CustomStyleSubMenu,
      {
        command: command,
        theme: this.props.theme,
      },
      {
        anchor,
        autoDismiss: true,
        IsChildDialog: true,
        onClose: (val) => {
          if (this._popUp) {
            this._popUp = null;
            if (undefined !== val && val.command._customStyle) {
              // do edit,remove,rename code here
              if ('remove' === val.type) {
                removeStyle(val.command._customStyleName)
                  .then(() => {
                  // [FS] IRAD-1099 2020-11-17
                  // Issue fix: Even the applied style is removed the style name is showing in the editor
                  this.removeCustomStyleName(
                    this.props.editorState,
                    val.command._customStyleName,
                    this.props.editorView.dispatch
                  );
                })
                  .catch(console.warn);
              } else if ('rename' === val.type) {
                this.showStyleWindow(command, event, 2);
              } else {
                this.showStyleWindow(command, event, 1);
              }
            }
          }
        },
      }
    );
  }

  // [FS] IRAD-1099 2020-11-17
  // Issue fix: Even the applied style is removed the style name is showing in the editor
  removeCustomStyleName(editorState, removedStyleName, dispatch) {
    const { selection, doc } = editorState;
    let { from, to } = selection;
    const { empty } = selection;
    if (empty) {
      from = selection.$from.before(1);
      to = selection.$to.after(1);
    }

    let tr = editorState.tr;
    const customStyleName = RESERVED_STYLE_NONE;
    const tasks = [];
    const textAlignNode = [];

    doc.nodesBetween(0, doc.nodeSize - 2, (node, pos) => {
      if (node.content?.content?.length) {
        if (node?.content?.content?.[0]?.marks?.length) {
          node.content.content[0].marks.some((mark) => {
            if (node.attrs.styleName === removedStyleName) {
              tasks.push({ node, pos, mark });
            }
          });
        } else {
          textAlignNode.push({ node, pos });
        }
      }
    });

    if (!tasks.length) {
      for (const eachnode of textAlignNode) {
        const { node, pos } = eachnode;
        const newattrs = { ...node.attrs, styleName: customStyleName };
        tr = tr?.setNodeMarkup(pos, undefined, newattrs);
      };
      // to remove both text align format and line spacing
      tr = this.removeTextAlignAndLineSpacing(tr, editorState.schema);
    }

    for (const job of tasks) {
      const { node, mark, pos } = job;
      tr = tr.removeMark(pos, pos + node.nodeSize, mark.type);
      // reset the custom style name to NONE after remove the styles
      const newattrs = { ...node.attrs, styleName: customStyleName };
      tr = tr.setNodeMarkup(pos, undefined, newattrs);
      const newNode = tr.doc.nodeAt(pos);
      // FIX: Rest to Normal not working for font size.
      tr = applyLatestStyle(
        newNode?.attrs?.styleName,
        editorState,
        tr,
        {
          node: newNode,
          startPos: pos,
          endPos: pos + node.nodeSize - 1,
          opt: 1,
        },
        null
      );
    };

    // to remove both text align format and line spacing
    tr = this.removeTextAlignAndLineSpacing(tr, editorState.schema);
    tr.doc.nodesBetween(from, to, (node, startPos) => {
      if (node.type.name === 'paragraph') {
        tr = tr.setNodeMarkup(startPos, undefined, node.attrs);
      }
    });
    if (dispatch && tr.docChanged) {
      dispatch(tr);
      return true;
    }
    return false;
  }

  // to remove the text align, line spacing, paragraph spacing after and before format if applied.
  removeTextAlignAndLineSpacing(tr: Transform, schema: Schema): Transform {
    tr = setTextAlign(tr, schema, null);
    tr = setTextLineSpacing(tr, schema, null);
    tr = setParagraphSpacing(tr, schema, '0', true);
    tr = setParagraphSpacing(tr, schema, '0', false);
    return tr;
  }

  //shows the alignment and line spacing option
  showStyleWindow(command, _event: SyntheticEvent<Element>, mode) {
    // close the popup toggling effect
    if (this._stylePopup) {
      this._stylePopup.close();
      this._stylePopup = null;
    }
    this._styleName = command._customStyleName;
    this._stylePopup = createPopUp(
      CustomStyleEditor,
      {
        styleName: command._customStyleName,
        mode: mode, //edit
        description: command._customStyle.description,
        styles: command._customStyle.styles,
        editorView: this.props.editorView,
        theme:this.theme,
      },
      {
        position: atViewportCenter,
        autoDismiss: false,
        IsChildDialog: false,
        onClose: (val) => {
          if (this._stylePopup) {
            //handle save style object part here
            if (undefined !== val) {
              // [FS] IRAD-1112 2020-12-14
              // Issue fix: Duplicate style created while modified the style name.
              delete val.runtime;
              if (1 === mode) {
                // update
                this.handleEditModeSave(val);
              } else {
                // rename
                this.handleRenameModeSave(val);
              }
            }
          }
          this.props.editorView.focus?.();
        },
      }
    );
  }

  // [FS] IRAD-1237 2021-05-05
  // Issue fix: Rename style not working on the fly
  renameStyleInDocument(
    state: EditorState,
    tr: Transform,
    oldStyleName,
    styleName
  ) {
    const { doc } = state;

    doc.descendants((child, pos) => {
      if (oldStyleName === child.attrs.styleName) {
        const newAttrs = { ...child.attrs, styleName };
        tr = tr.setNodeMarkup(pos, undefined, newAttrs);
      }
    });
    return tr;
  }

  // [FS] IRAD-1308 2020-04-21
  // To get the customstylename of the selected paragraph
  getTheSelectedCustomStyle(editorState) {
    const { selection, doc } = editorState;
    const { from, to } = selection;
    let customStyleName = RESERVED_STYLE_NONE;
    doc.nodesBetween(from, to, (node) => {
      if (this.isAllowedNode(node)) {
        if (node.attrs.styleName) {
          customStyleName = node.attrs.styleName;
        }
      }
    });
    return customStyleName;
  }

  //[FS] IRAD-1085 2020-10-09
  //method to build commands for list buttons
  getCommandGroups() {
    HEADING_COMMANDS = {
      // [FS] IRAD-1074 2020-12-09
      // When apply 'None' from style menu, not clearing the applied custom style.
      [RESERVED_STYLE_NONE]: new CustomStyleCommand(
        RESERVED_STYLE_NONE,
        RESERVED_STYLE_NONE
      ),
    };
    const result = addStyleToList(undefined);
    let HEADING_NAMES = null;

    if (result) {
      setStyles(result);
      HEADING_NAMES = result;
      if (null != HEADING_NAMES) {
        const foundNormal = result.find(
          (obj) => obj.styleName === RESERVED_STYLE_NONE
        );
        if (foundNormal) {
          HEADING_COMMANDS[RESERVED_STYLE_NONE] = new CustomStyleCommand(
            foundNormal,
            foundNormal.styleName
          );
        }

        for (const obj of HEADING_NAMES) {
          if (RESERVED_STYLE_NONE != obj.styleName)
            HEADING_COMMANDS[obj.styleName] = new CustomStyleCommand(
              obj,
              obj.styleName
            );
        };
      }
      return [HEADING_COMMANDS];
    }
    return [HEADING_COMMANDS];
  }
}
