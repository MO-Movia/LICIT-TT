/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import * as React from 'react';
import type { CapcoEle } from './contextMenu';
import {
  CAPCOKEY,
  CAPCO_PLUGIN_KEY,
  METADATAKEY,
  TABLE,
  TABLE_FIGURE_CAPCO,
} from './constants';
import { SYSTEMCAPCO } from './editorSchema';
import { EditorView } from 'prosemirror-view';
import { CapcoRuntime, CapcoState } from './types';
import { getBlockControlCapco, safeCapcoParse } from './utils';

export type capcoContextMenuProps = {
  editorView: EditorView;
  position: { x: number; y: number };
  pos: number;
  isCitation?: boolean;
  customCapcoListItems: CapcoState[];
  close?: (val?) => void;
};

export class CapcoContextMenu extends React.Component<
  capcoContextMenuProps,
  capcoContextMenuProps
> {
  constructor(props: capcoContextMenuProps) {
    super(props);
    this.state = {
      ...props,
      customCapcoListItems: this.props.customCapcoListItems ?? [],
    };
  }
  createDefaultMenu(capcoList: CapcoEle[]): CapcoEle[] {
    capcoList.push(
      {
        name: 'Edit...',
        appendHr: false,
        isCustomCAPCO: false,
        // show CAPCO builder ui for edit menu.
        // action: this.showCAPCOBuilder.bind(self),
      },
      {
        name: 'Clear',
        appendHr: true,
        isCustomCAPCO: false,
        action: this.clearCapcoMark.bind(this),
      }
    );
    return capcoList;
  }
  clearCapcoMark(): void {
    this.setCapco(null);
  }
  createCustomCapcoMenu(
    capcoList: CapcoEle[],
    customCapcoListItems?
  ): CapcoEle[] {
    for (const customCapco of customCapcoListItems ?? []) {
      if (null !== customCapco) {
        capcoList.push({
          name: customCapco.portionMarking,
          appendHr: false,
          isCustomCAPCO: true,
          action: this.wrapItemWithCapco.bind(
            this,
            JSON.stringify(customCapco)
          ),
          value: customCapco,
          removeAction: this.remoCapcoFromList.bind(
            this,
            customCapco.portionMarking
          ),
        });
      }
    }
    return capcoList;
  }
  getCustomCapcoList() {
    return this.getCustomCapco();
  }
  getcapcoRunTime() {
    return (
      this.props.editorView.state.plugins
        .find((p) => p.spec.key === CAPCO_PLUGIN_KEY)
        ?.getState(this.props.editorView.state)?.runtime as CapcoRuntime
    )?.capcoService;
  }
  async getCustomCapco() {
    const ccList = await this.getcapcoRunTime()?.getCapco();
    return ccList;
  }
  remoCapcoFromList(val: string): void {
    const { customCapcoListItems } = this.state;
    this.removeCustomCapco(val, customCapcoListItems);
  }
  removeCustomCapco(capco: string, capcoList: CapcoState[]): boolean {
    const bOk = false;
    if (capco) {
      if (capcoList) {
        const index = capcoList.findIndex((c) => c.portionMarking === capco);
        if (index > -1) {
          capcoList.splice(index, 1);
        }
        this.getcapcoRunTime()
          ?.saveCapco(this.state.customCapcoListItems)
          ?.catch(console.error);
      }
    }
    return bOk;
  }
  createJSON(value) {
    return JSON.stringify({
      ism: {
        version: '1',
        system: 'US',
        // CUI and FOUO are not actual classifications. They are Non-IC disseminationControls for the U classification
        // This needs to remain like this until there are changes on the backend to properly support this.
        classification: ['CUI', 'FOUO'].includes(value) ? 'U' : value,
        ownerProducer: ['USA'],
        sciControls: [],
        sarIdentifiers: [],
        atomicEnergyMarkings: [],
        fgiSourceOpen: [],
        releasableTo: [],
        // Only “CUI” and “FOUO” fall under disseminationControls. For all other default values this should be an empty array.
        disseminationControls: ['CUI', 'FOUO'].includes(value) ? [value] : [],
        nonICmarkings: [],
      },
      portionMarking: value,
    });
  }
  createSystemCapcoMenu(capcoList: CapcoEle[]): CapcoEle[] {
    capcoList.push(
      {
        name: 'TBD - To be Determined',
        displayName: this.createJSON('TBD'),
        appendHr: false,
        isCustomCAPCO: false,
        action: this.wrapItemWithCapco.bind(this, this.createJSON('TBD')),
        value: SYSTEMCAPCO.TBD,
      },
      {
        name: 'U - Unclassified',
        displayName: this.createJSON('U'),
        appendHr: false,
        isCustomCAPCO: false,
        action: this.wrapItemWithCapco.bind(this, this.createJSON('U')),
        value: SYSTEMCAPCO.UNCLASSIFIED,
      },
      {
        name: 'C - Confidential',
        displayName: this.createJSON('C'),
        appendHr: false,
        isCustomCAPCO: false,
        action: this.wrapItemWithCapco.bind(this, this.createJSON('C')),
        value: SYSTEMCAPCO.CONFIDENTIAL,
      },
      {
        name: 'S - Secret',
        displayName: this.createJSON('S'),
        appendHr: false,
        isCustomCAPCO: false,
        action: this.wrapItemWithCapco.bind(this, this.createJSON('S')),
        value: SYSTEMCAPCO.SECRET,
      },
      {
        name: 'TS - Top Secret',
        displayName: this.createJSON('TS'),
        appendHr: false,
        isCustomCAPCO: false,
        action: this.wrapItemWithCapco.bind(this, this.createJSON('TS')),
        value: SYSTEMCAPCO.TOPSECRET,
      },

      {
        name: 'CUI - Controlled Unclassified Information',
        displayName: this.createJSON('CUI'),
        appendHr: true,
        isCustomCAPCO: false,
        action: this.wrapItemWithCapco.bind(this, this.createJSON('CUI')),
        value: SYSTEMCAPCO.CONTROLLEDUNCLASSIFIEDINFORMATION,
      }
    );
    return capcoList;
  }
  wrapItemWithCapco(value: string): void {
    // This is a user action.
    this.setCapco(value);
  }
  setCapco(capco: string): void {
    if (this.props.isCitation) {
      return;
    }
    let pos = this.props.pos - 1; // nodeAt and setNodeMarkup resolve to the node AFTER the given position, so -1 to correct for that.
    let enhanced_capco_pos = pos;
    let node = this.props.editorView.state.doc.nodeAt(pos);
    if (!node) {
      const $from = this.props.editorView.state.selection.$from;

      // Position before the current block for identifying the table node.
      const posBefore = $from.before($from.depth);
      const $before = this.props.editorView.state.doc.resolve(posBefore);

      const indexBefore = $before.index() - 1;
      if (indexBefore > 0) {
        const prevNode = $before.node().child(indexBefore);
        if (prevNode?.type.name === TABLE) {
          node = prevNode;
          pos = posBefore - prevNode.nodeSize;
        }
      }
    }
    if (node?.type?.name === TABLE_FIGURE_CAPCO) {
      pos = getBlockControlCapco(this.props.editorView.state, pos);
    }
    let newAttrs = {
      ...node?.attrs,
      [CAPCOKEY]: capco,
      [METADATAKEY]: {
        ...(node?.attrs?.[METADATAKEY]),
        capco: safeCapcoParse(capco)?.ism,
      },
      ['isValidate']: false,
    };
    const event = new KeyboardEvent('keydown', {
      keyCode: 0,
      bubbles: true,
    });
    this.props.editorView.dom?.dispatchEvent(event);
    const ParentNodeType = this.props.editorView.state.doc.nodeAt(pos);
    if (ParentNodeType?.type?.name === 'image') {
    newAttrs = {
      ...ParentNodeType.attrs,
      [CAPCOKEY]: capco,
      [METADATAKEY]: {
        ...(ParentNodeType.attrs?.[METADATAKEY]),
        capco: safeCapcoParse(capco)?.ism,
      },
      isValidate: false,
    };
    }
    const tr = this.props.editorView.state.tr.setNodeMarkup(
      pos,
      null,
      newAttrs
    );
    if (node?.type?.name === TABLE_FIGURE_CAPCO) {
      const newAttrs = {
        ...ParentNodeType?.attrs,
        [CAPCOKEY]: safeCapcoParse(capco).portionMarking,
        ['isValidate']: false,
      };
      const enhanced_capco_node = tr.doc?.nodeAt(enhanced_capco_pos);
      if (
        ParentNodeType?.type?.name !== TABLE &&
        enhanced_capco_node?.type.name !== TABLE_FIGURE_CAPCO
      ) {
        enhanced_capco_pos = enhanced_capco_pos + 2;
      }
      tr.setNodeMarkup(enhanced_capco_pos, null, newAttrs);
    }
    if (typeof tr.setMeta === 'function') {
      tr.setMeta('capcoChangedPos', pos);
    }
    this.props.editorView.dispatch(tr);
    this.props.close();
  }
  closePopUP(): void {
    this.props.close();
  }
  onCapcoMenuClicked(menuName: string): void {
    if ('Clear' === menuName) {
      this.clearCapcoMark();
    } else {
      this.getcapcoRunTime()
        ?.openManagementDialog(
          safeCapcoParse(
            this.props.editorView.state.selection.$head.parent.attrs.capco
          )
        )
        .then((customCapco: CapcoState | null) => {
          if (customCapco) {
            return this.saveCapco(
              JSON.stringify(customCapco),
              this.state.customCapcoListItems
            );
          }
        })
        ?.catch(console.error);
    }
    this.closePopUP();
  }
  saveCapco(capco: string, capcoList: CapcoState[]): Promise<boolean> {
    capcoList ??= [];
    const parsedCapco = safeCapcoParse(capco);
    capcoList = capcoList?.filter(
      (item) => item.portionMarking !== parsedCapco.portionMarking
    );
    capcoList.push(parsedCapco);
    return this.getcapcoRunTime()
      ?.saveCapco(capcoList)
      ?.then((bOK) => {
        if (bOK) {
          this.setCapco(capco);
        }
        return bOK;
      });
  }

  componentDidMount() {
    // Perform asynchronous operation, for example, fetch data from a server
    // const response = await fetch('https://api.example.com/data');
    this.getCustomCapcoList()
      .then((customCapcoListItems) =>
        this.setState({ customCapcoListItems: customCapcoListItems })
      )
      .catch((error) => console.error('Error fetching data:', error));
  }

  onKeyDownCmenuclicked = (e: React.KeyboardEvent<unknown>, item: CapcoEle) => {
    if (e.key === 'Enter' || e.key === ' ') {
      this.onCapcoMenuClicked.bind(this, item.name);
    }
  };
  onKeyDownwrapItemWithCapco = (
    e: React.KeyboardEvent<unknown>,
    capcoitem: CapcoEle
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      this.wrapItemWithCapco(capcoitem.displayName);
    }
  };
  render(): React.ReactNode {
    let capcoList: CapcoEle[] = [];
    let defMenu: CapcoEle[] = [];
    let customCapcoList: CapcoEle[] = [];
    defMenu = this.createDefaultMenu(defMenu);
    capcoList = this.createSystemCapcoMenu(capcoList);
    const { customCapcoListItems } = this.state;
    customCapcoList = this.createCustomCapcoMenu(
      customCapcoList,
      customCapcoListItems
    );
    const selection = this.props.editorView.state.selection;
    const cursorPos = selection.$anchor?.pos;
    const node = this.props.editorView.domAtPos(cursorPos).node as HTMLElement;
    const offsetWidth = node.offsetWidth;
    const offsetHeight = node.offsetHeight;

    const cMenuPosition = this.props.position;
    const positionX = cMenuPosition.x;
    const positionY = cMenuPosition.y;
    const menuWidth = offsetWidth + 4;
    const menuHeight = offsetHeight + 4;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    let leftPos: string;
    let topPos: string;
    if (windowWidth - positionX < menuWidth) {
      leftPos = windowWidth - menuWidth + 'px';
    } else {
      leftPos = positionX + 'px';
    }

    if (windowHeight - positionY < menuHeight) {
      topPos = windowHeight - menuHeight - 30 + 'px';
    } else {
      topPos = positionY - 30 + 'px';
    }
    const maxHeight = windowHeight - 150 + 'px';

    return (
      <div
        className="ProseMirror molcap-context-menu"
        onMouseLeave={() => this.closePopUP()}
        role="menu"
        style={{
          background: 'white',
          left: leftPos,
          top: topPos,
          width: '220px',
          display: 'inline-table',
          maxHeight: maxHeight,
        }}
        tabIndex={-1}
      >
        <ul
          style={{
            listStyleType: 'none',
            fontSize: '14px',
            fontFamily: 'calibri, serif',
          }}
        >
          {defMenu.map((item) => (
            <li key={item.name}>
              <button
                id={item.name}
                onClick={this.onCapcoMenuClicked.bind(this, item.name)}
                onKeyDown={(e) => this.onKeyDownCmenuclicked(e, item)}
                style={{
                  all: 'unset', // Resets button styling completely
                  cursor: 'pointer', // Ensures it's still clickable
                  display: 'inline', // Keeps it inline like normal text
                  fontSize: 'inherit',
                  fontFamily: 'inherit',
                }}
              >
                {item.name}
              </button>
            </li>
          ))}
        </ul>
        <hr />

        <ul
          style={{
            listStyleType: 'none',
            fontSize: '14px',
            fontFamily: 'calibri, serif',
          }}
        >
          {capcoList.map((capcoitem) => (
            <li key={capcoitem.name}>
              <button
                id={capcoitem.name}
                onClick={() => this.wrapItemWithCapco(capcoitem.displayName)}
                onKeyDown={(e) => this.onKeyDownwrapItemWithCapco(e, capcoitem)}
                style={{
                  all: 'unset', // Resets button styling completely
                  cursor: 'pointer', // Ensures it's still clickable
                  display: 'inline', // Keeps it inline like normal text
                  fontSize: 'inherit',
                  fontFamily: 'inherit',
                }}
              >
                {capcoitem.name}
              </button>
            </li>
          ))}
        </ul>
        {customCapcoListItems?.length ? <hr /> : null}
        <ul
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            listStyleType: 'none',
            fontSize: '14px',
            fontFamily: 'calibri, serif',
          }}
        >
          {customCapcoList.map((customcapcoitem) => (
            <li
              key={customcapcoitem.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <button
                id={customcapcoitem.name}
                onClick={customcapcoitem.action}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    customcapcoitem.action(e);
                  }
                }}
                style={{
                  all: 'unset', // Resets button styling completely
                  cursor: 'pointer', // Ensures it's still clickable
                  display: 'inline', // Keeps it inline like normal text
                  fontSize: 'inherit',
                  fontFamily: 'inherit',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flexGrow: 1, // Allows text to take up remaining space
                }}
                title={customcapcoitem.name}
              >
                {customcapcoitem.name}
              </button>
              <button
                aria-label={`Remove ${customcapcoitem.name}`}
                className="molcap-del-btn"
                id="capcoDelete"
                onClick={customcapcoitem.removeAction}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  fontSize: 'inherit',
                  fontFamily: 'inherit',
                  marginLeft: '8px', // Adds spacing between the name and delete button
                }}
              >
                X
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }
}
