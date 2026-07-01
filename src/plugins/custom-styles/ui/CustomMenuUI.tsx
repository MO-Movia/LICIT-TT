/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import React, { ChangeEvent, SyntheticEvent } from 'react';
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
import { MenuKeyboardNav } from '../../../commands/ui/menuKeyboardNav';

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
  selectedIndex: number;
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
  _kbd = new MenuKeyboardNav({
    getRoot: () => this._menuRef.current,
    getNavCount: () => this._navItems.length,
    getSelectedIndex: () => this.state.selectedIndex,
    setSelectedIndex: (index, done) =>
      this.setState({ selectedIndex: index }, done),
    activate: (index, event) => {
      const selected =
        this._navItems[index] ??
        this._staticItems[index - this._navItems.length];
      if (selected) {
        this._execute(selected.command, event as unknown as SyntheticEvent);
      }
    },
    scrollSelectedIntoView: () => this.scrollSelectedIntoView(),
  });

  state = {
    expanded: false,
    selectedIndex: 0,
    searchTerm: '',
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
    const searchTerm = this.state.searchTerm.toLowerCase();
    const selectedName = this.getTheSelectedCustomStyle(this.props.editorState);

    this._navItems = [];
    this._staticItems = [];
    const commandGroups_nw = this.getCommandGroups();
    for (const group of commandGroups_nw) {
      for (const label of Object.keys(group)) {
        if (!this.isStyleMatch(label, searchTerm)) {
          continue;
        }
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
        this._navItems.push({ command: command as UICommand, label });
      };
    };
    for (const group of staticCommand) {
      for (const label of Object.keys(group)) {
        const command = group[label] as CustomStyleCommand;
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
    const styleNamesClassName =
      searchTerm && !children.length
        ? 'molsp-stylenames molsp-stylenames-empty'
        : 'molsp-stylenames';
    return (
      <div onKeyDown={this._kbd.onKeyDown} ref={this._menuRef} tabIndex={-1}>
        <span data-cy="cyStyleDropdown">
          <div className={className} id={this._id}>
            <div className="molsp-search-wrapper">
              <input
                aria-label="Search custom styles"
                className="molsp-search-input"
                onChange={this._onSearchChange}
                onClick={this._onSearchClick}
                onContextMenu={this._onSearchContextMenu}
                onKeyDown={this._onSearchKeyDown}
                placeholder="Search styles"
                type="search"
                value={this.state.searchTerm}
              />
            </div>
            <div className={styleNamesClassName}>{children}</div>

            <hr className="molsp-stylenames-hr"></hr>
            <div className="molsp-stylenames">{children1}</div>
          </div>
        </span>
      </div>
    );
  }

  componentDidMount() {

    this.setState({ selectedIndex: this._appliedIndex }, () =>
      this._scrollAppliedStyleIntoView()
    );
    this._kbd.mount();
  }

  componentWillUnmount() {
    this._kbd.unmount();
  }

  _scrollAppliedStyleIntoView() {
    const styleDiv = document.getElementsByClassName('molsp-stylenames')[0];
    if (styleDiv) {
      styleDiv.scrollTop =
        this._menuItemHeight * this.state.selectedIndex -
        this._menuItemHeight * 2 -
        5;
    }
  }

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

  isStyleMatch(label: string, searchTerm: string): boolean {
    return !searchTerm || label.toLowerCase().includes(searchTerm);
  }

  _onSearchChange = (event: ChangeEvent<HTMLInputElement>): void => {
    this._selectedIndex = 0;
    this.setState({ searchTerm: event.target.value });
  };

  _onSearchClick = (event: SyntheticEvent<HTMLInputElement>): void => {
    event.stopPropagation();
  };

  _onSearchContextMenu = (event: SyntheticEvent<HTMLInputElement>): void => {
    event.stopPropagation();
  };

  _onSearchKeyDown = (event: SyntheticEvent<HTMLInputElement>): void => {
    event.stopPropagation();
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
