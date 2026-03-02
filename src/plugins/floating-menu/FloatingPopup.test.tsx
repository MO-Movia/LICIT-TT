/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { FloatingMenu } from './FloatingPopup';
import { FloatingMenuItem, FloatingMenuContext } from './model';

// Mock CustomButton → render as native <button>
jest.mock('@modusoperandi/licit-ui-commands', () => ({
  CustomButton: ({ label, onClick, disabled }) => (
    <button disabled={disabled} onClick={onClick}>
      {label}
    </button>
  ),
}));

describe('FloatingMenu (UI)', () => {
  let container: HTMLDivElement;
  let handlers: Record<string, jest.Mock>;
  let items: FloatingMenuItem[];

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    handlers = {
      addComment: jest.fn(),
      addTag: jest.fn(),
      createCitation: jest.fn(),
      createInfoIcon: jest.fn(),
      copyRich: jest.fn(),
      copyPlain: jest.fn(),
      paste: jest.fn(),
      pastePlain: jest.fn(),
      pasteAsReference: jest.fn(),
      createSlice: jest.fn(),
      showReferences: jest.fn(),
    };

    items = [
      {
        id: 'comment',
        label: 'Add Comment',
        onClick: handlers.addComment,
      },
      {
        id: 'tag',
        label: 'Add Tag',
        onClick: handlers.addTag,
      },
      {
        id: 'citation',
        label: 'Create Citation',
        onClick: handlers.createCitation,
      },
      {
        id: 'info',
        label: 'Create Infoicon',
        onClick: handlers.createInfoIcon,
      },
      {
        id: 'copy',
        label: 'Copy (Ctrl + C)',
        onClick: handlers.copyRich,
      },
      {
        id: 'copy-plain',
        label: 'Copy Without Formatting',
        onClick: handlers.copyPlain,
      },
      {
        id: 'paste',
        label: 'Paste (Ctrl + V)',
        onClick: handlers.paste,
      },
      {
        id: 'paste-plain',
        label: 'Paste As Plain Text',
        onClick: handlers.pastePlain,
      },
      {
        id: 'paste-ref',
        label: 'Paste As Reference (Ctrl + Alt + V)',
        onClick: handlers.pasteAsReference,
        isEnabled: () => true,
      },
      {
        id: 'slice',
        label: 'Create Referent',
        onClick: handlers.createSlice,
      },
      {
        id: 'insert-ref',
        label: 'Insert Reference',
        onClick: handlers.showReferences,
      },
    ];
  });

  afterEach(() => {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
    jest.clearAllMocks();
  });

  function render(itemsOverride = items,
  isReadonly = false) {
    ReactDOM.render(
      <FloatingMenu
        context={{} as unknown as FloatingMenuContext}
        items={itemsOverride}
        isReadonly={isReadonly}
      />,
      container
    );
  }

  function getButton(label: string): HTMLButtonElement {
    const btn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === label
    );
    if (!btn) {
      throw new Error(`Button "${label}" not found`);
    }
    return btn;
  }

  function click(label: string) {
    getButton(label).click();
  }

  it('renders all buttons from config', () => {
    render();

    const labels = Array.from(container.querySelectorAll('button')).map(
      (b) => b.textContent
    );

    expect(labels).toEqual([
      'Add Comment',
      'Add Tag',
      'Create Citation',
      'Create Infoicon',
      'Copy (Ctrl + C)',
      'Copy Without Formatting',
      'Paste (Ctrl + V)',
      'Paste As Plain Text',
      'Paste As Reference (Ctrl + Alt + V)',
      'Create Referent',
      'Insert Reference',
    ]);
  });

  it('calls correct handlers on click', () => {
    render();

    click('Add Comment');
    click('Add Tag');
    click('Create Citation');
    click('Create Infoicon');
    click('Copy (Ctrl + C)');
    click('Copy Without Formatting');
    click('Paste (Ctrl + V)');
    click('Paste As Plain Text');
    click('Paste As Reference (Ctrl + Alt + V)');
    click('Create Referent');
    click('Insert Reference');

    expect(handlers.addComment).toHaveBeenCalled();
    expect(handlers.addTag).toHaveBeenCalled();
    expect(handlers.createCitation).toHaveBeenCalled();
    expect(handlers.createInfoIcon).toHaveBeenCalled();
    expect(handlers.copyRich).toHaveBeenCalled();
    expect(handlers.copyPlain).toHaveBeenCalled();
    expect(handlers.paste).toHaveBeenCalled();
    expect(handlers.pastePlain).toHaveBeenCalled();
    expect(handlers.pasteAsReference).toHaveBeenCalled();
    expect(handlers.createSlice).toHaveBeenCalled();
    expect(handlers.showReferences).toHaveBeenCalled();
  });

  it('disables button when isEnabled returns false', () => {
    items[0] = {
      ...items[0],
      isEnabled: () => false,
    };

    render(items);

    const btn = getButton('Add Comment');
    expect(btn.disabled).toBe(true);
  });

  it('enables button when isEnabled returns true', () => {
    items[0] = {
      ...items[0],
      isEnabled: () => true,
    };

    render(items);

    const btn = getButton('Add Comment');
    expect(btn.disabled).toBe(false);
  });

  it('renders empty menu safely when no items provided', () => {
    render([]);

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(0);
  });

  it('filters items in readonly mode', () => {
    render(items, true); // ← important

    const labels = Array.from(container.querySelectorAll('button')).map(
    b => b.textContent
    );

    expect(labels).toEqual([
    'Add Comment',
    'Add Tag',
    'Copy (Ctrl + C)',
    'Copy Without Formatting',
    'Create Referent',
    ]);
  }); 
});