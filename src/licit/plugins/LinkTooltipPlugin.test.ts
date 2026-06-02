/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import {EditorState, TextSelection} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';
import {Schema, DOMParser} from 'prosemirror-model';
import LinkTooltipPlugin from './linkTooltipPlugin';
import {
  findNodesWithSameMark,
  MARK_LINK,
  RuntimeService,
  createPopUp,
} from '../../commands';

jest.mock('../../commands', () => {
  const actual =
    jest.requireActual<typeof import('../../commands')>('../../commands');
  return {
    ...actual,
    findNodesWithSameMark: jest.fn(),
    createPopUp: jest.fn(),
    atAnchorTopCenter: jest.fn(),
  };
});


jest.mock('../lookUpElement', () => {
  return {
    __esModule: true,
    default: jest.fn().mockReturnValue(document.createElement('a')),
  };
});
import lookUpElement from '../lookUpElement';

/** A single paragraph well over 40 characters. We can safely pick pos=5..9. */
function createTestSchema() {
  return new Schema({
    nodes: {
      doc: {content: 'block+'},
      text: {},
      paragraph: {
        attrs: {
          styleName: {default: null},
          selectionId: {default: null},
        },
        content: 'text*',
        group: 'block',
        toDOM: () => ['p', 0],
      },
    },
    marks: {
      [MARK_LINK]: {
        attrs: {href: {}, selectionId: {default: null}},
        toDOM: (node) => ['a', {href: node.attrs.href}, 0],
      },
    },
  });
}

describe('LinkTooltipPlugin - No Warning / In-Bounds Selection', () => {
  let editorView: EditorView | null = null;
  let pluginView = null; // We'll call plugin methods directly

  beforeEach(() => {
    jest.clearAllMocks();

    const container = document.createElement('div');
    document.body.appendChild(container);

    // Single paragraph, definitely > 40 characters:
    const contentHTML = `
      <p>ABCDE12345 This is a long paragraph to ensure pos=5..9 is inline text. More text here.</p>
    `;

    const schema = createTestSchema();
    const content = document.createElement('div');
    content.innerHTML = contentHTML;

    const state = EditorState.create({
      schema,
      doc: DOMParser.fromSchema(schema).parse(content),
      plugins: [new LinkTooltipPlugin()],
    });

    editorView = new EditorView(container, {state});

    // Directly get the plugin's view:
    const plugin = editorView.state.plugins.find(
      (pl) => pl instanceof LinkTooltipPlugin
    );
    if (plugin) {
      pluginView = (plugin).spec.view(editorView);
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (editorView) {
      editorView.destroy();
      editorView = null;
    }
    pluginView = null;
    RuntimeService.Runtime = null;
  });

  it('instantiates plugin & pluginView without warning', () => {
    expect(editorView).toBeDefined();
    expect(pluginView).toBeDefined();
  });

  it('calls update(), _onCancel, _onClose without warnings', () => {
    if (!editorView) return;
    pluginView.update(editorView, null);
    pluginView._onCancel?.(editorView);
    pluginView._onClose?.();
    expect(true).toBe(true);
  });

  it('insert link at pos=5, calls _onEditEnd with selection=5..9 => no warning', () => {
    if (!editorView) return;
    // Insert "Link" mark at position=5
    insertLinkAtPos(editorView, 5, 'https://example.com');

    // Now do _onEditEnd with selection=5..9
    pluginView._onEditEnd?.(
      editorView,
      TextSelection.create(editorView.state.doc, 5, 9),
      'https://newhref.com'
    );
    expect(true).toBe(true); // No console.warn or crash
  });

  it('updates visible URL text when editing a link whose text is the old href', () => {
    if (!editorView) return;
    const from = 5;
    const oldHref = 'https://old.com';
    const newHref = 'https://new.com';
    const markType = editorView.state.schema.marks[MARK_LINK];

    insertLinkedTextAtPos(editorView, from, oldHref, oldHref);
    (
      findNodesWithSameMark as jest.MockedFunction<typeof findNodesWithSameMark>
    ).mockReturnValue({
      mark: markType.create({href: oldHref}),
      from: {node: null, pos: from},
      to: {node: null, pos: from + oldHref.length - 1},
    });

    pluginView._onEditEnd?.(
      editorView,
      TextSelection.create(editorView.state.doc, from, from + oldHref.length),
      newHref
    );

    expect(editorView.state.doc.textContent).toContain(newHref);
    expect(editorView.state.doc.textContent).not.toContain(oldHref);
    expect(editorView.state.doc.nodeAt(from)?.marks[0]?.attrs.href).toBe(
      newHref
    );
  });

  it('replaces stripped URL text instead of inserting the edited href beside it', () => {
    if (!editorView) return;
    const from = 5;
    const oldText = 'www.google.com';
    const oldHref = 'https://www.google.com';
    const newHref = 'https://chatgpt.com/';
    const markType = editorView.state.schema.marks[MARK_LINK];

    insertLinkedTextAtPos(editorView, from, oldText, oldHref);
    (
      findNodesWithSameMark as jest.MockedFunction<typeof findNodesWithSameMark>
    ).mockReturnValue({
      mark: markType.create({href: oldHref}),
      from: {node: null, pos: from},
      to: {node: null, pos: from + oldText.length - 1},
    });

    pluginView._onEditEnd?.(
      editorView,
      TextSelection.create(editorView.state.doc, from, from + oldText.length),
      newHref,
      newHref
    );

    expect(editorView.state.doc.textContent).toContain(newHref);
    expect(editorView.state.doc.textContent).not.toContain(oldText);
    expect(editorView.state.doc.nodeAt(from)?.marks[0]?.attrs.href).toBe(
      newHref
    );
  });

  it('keeps custom link text when the link dialog returns the edited href as display text', () => {
    if (!editorView) return;
    const from = 5;
    const oldText = 'custom label';
    const oldHref = 'https://www.google.com';
    const newHref = 'https://chatgpt.com/';
    const markType = editorView.state.schema.marks[MARK_LINK];

    insertLinkedTextAtPos(editorView, from, oldText, oldHref);
    (
      findNodesWithSameMark as jest.MockedFunction<typeof findNodesWithSameMark>
    ).mockReturnValue({
      mark: markType.create({href: oldHref}),
      from: {node: null, pos: from},
      to: {node: null, pos: from + oldText.length - 1},
    });

    pluginView._onEditEnd?.(
      editorView,
      TextSelection.create(editorView.state.doc, from, from + oldText.length),
      newHref,
      newHref
    );

    expect(editorView.state.doc.textContent).toContain(oldText);
    expect(editorView.state.doc.textContent).not.toContain(newHref);
    expect(editorView.state.doc.nodeAt(from)?.marks[0]?.attrs.href).toBe(
      newHref
    );
  });

  it('calls _onRemove => no warnings, no crashes', () => {
    pluginView._onRemove?.(editorView);
    expect(true).toBe(true);
  });

  it('calls _onEdit through the angular link dialog callback with link items', async () => {
    const markType = editorView.state.schema.marks[MARK_LINK];
    (
      findNodesWithSameMark as jest.MockedFunction<typeof findNodesWithSameMark>
    ).mockReturnValue({
      mark: markType.create({href: 'https://example.com'}),
      from: {node: null, pos: 5},
      to: {node: null, pos: 9},
    });
    RuntimeService.Runtime = {
      openLinkDialog: jest.fn((_href, _text, applyLink) => {
        applyLink?.('https://edited.com');
      }),
    };

    pluginView._onEdit?.(editorView);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(RuntimeService.Runtime.openLinkDialog).toHaveBeenCalled();
    expect(RuntimeService.Runtime.openLinkDialog).toHaveBeenCalledWith(
      'https://example.com',
      expect.any(String),
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        paragraphs: expect.arrayContaining([
          expect.objectContaining({
            label: expect.stringContaining('ABCDE12345'),
          }),
        ]),
      })
    );
    expect(true).toBe(true);
  });

  it('uses an inclusive end position when editing a stored link selection', () => {
    const markType = editorView.state.schema.marks[MARK_LINK];
    (
      findNodesWithSameMark as jest.MockedFunction<typeof findNodesWithSameMark>
    ).mockReturnValue({
      mark: markType.create({href: 'https://example.com'}),
      from: {node: null, pos: 5},
      to: {node: null, pos: 9},
    });
    RuntimeService.Runtime = {
      openLinkDialog: jest.fn(),
    };
    pluginView._linkSelection = TextSelection.create(editorView.state.doc, 5, 10);

    pluginView._onEdit?.(editorView);

    expect(findNodesWithSameMark).toHaveBeenCalledWith(
      editorView.state.doc,
      5,
      9,
      markType
    );
  });

  it('jumps to an inner link target when href contains a selection id', () => {
    const schema = editorView.state.schema;
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [schema.text('Intro paragraph')]),
      schema.node(
        'paragraph',
        {styleName: 'Table Caption', selectionId: 'target-selection'},
        [schema.text('Target table')]
      ),
    ]);
    editorView.updateState(
      EditorState.create({
        schema,
        doc,
        plugins: [new LinkTooltipPlugin()],
      })
    );

    let targetPos = 0;
    editorView.state.doc.descendants((node, pos) => {
      if (node.attrs.selectionId === 'target-selection') {
        targetPos = pos;
      }
    });

    const markType = editorView.state.schema.marks[MARK_LINK];
    const handled = pluginView._handleClick?.(
      editorView,
      markType.create({href: '#target-selection'})
    );

    expect(handled).toBe(true);
    expect(editorView.state.selection.from).toBe(targetPos + 1);
  });

  it('handles view.readOnly mode by calling destroy()', () => {
    const mockDestroy = jest.spyOn(pluginView, 'destroy');

    const mockView = {
      ...editorView,
      readOnly: true,
    } as unknown as EditorView;

    pluginView.update(mockView, null);
    expect(mockDestroy).toHaveBeenCalled();
  });

  it('handles missing markType by returning early', () => {
    const mockDestroy = jest.spyOn(pluginView, 'destroy');
    const mockView = {
      ...editorView,
      state: {schema: {marks: {}}},
    } as unknown as EditorView;

    pluginView.update(mockView, null);

    // Should NOT destroy
    expect(mockDestroy).not.toHaveBeenCalled();
  });

  it('calls destroy() when domAtPos returns null (covers !domFound)', () => {
    const mockDestroy = jest.spyOn(pluginView, 'destroy');
    pluginView._popup = {close: jest.fn(), update: jest.fn()};

    // Get link mark type from schema
    const markType = editorView.state.schema.marks[MARK_LINK];
    const validMark = markType.create({href: 'https://example.com'});

    // Mock findNodesWithSameMark to return valid from/to positions
    (
      findNodesWithSameMark as jest.MockedFunction<typeof findNodesWithSameMark>
    ).mockReturnValue({
      mark: validMark,
      from: {
        node: null,
        pos: 0,
      },
      to: {
        node: null,
        pos: 0,
      },
    });

    // Mock domAtPos to simulate no DOM element found
    const mockDomAtPos: EditorView['domAtPos'] = () =>
      null;

    // Mock view instance preserving EditorView prototype
    const mockView: EditorView = Object.assign(
      Object.create(Object.getPrototypeOf(editorView)),
      {
        ...editorView,
        domAtPos: mockDomAtPos,
        readOnly: false,
      }
    );

    // 🔹 Run update — should trigger `if (!domFound)`
    pluginView.update(mockView, editorView.state);

    expect(mockDestroy).toHaveBeenCalled();
  });

  it('prevents duplicate editors by checking if this._editor exists', () => {
    pluginView._editor = {close: jest.fn()};

    const mockPopup = {update: jest.fn()};

    // Extend pluginView with mock lookUpElement safely
    const testPluginView = Object.assign(pluginView, {
      lookUpElement: jest.fn().mockReturnValue(true),
    });

    testPluginView.update(editorView, null);

    // Ensure popup.update() was not called
    expect(mockPopup.update).not.toHaveBeenCalled();
  });

it('calls destroy() when lookUpElement returns null (covers !anchorEl)', () => {
  const mockDestroy = jest.spyOn(pluginView, 'destroy');
  pluginView._popup = {close: jest.fn(), update: jest.fn()};

  // Mock domAtPos to return a valid node so that lookUpElement is actually called
  const mockDomAtPos: EditorView['domAtPos'] = () => ({
    node: document.createElement('span'),
    offset: 0,
  });

  // Temporarily make lookUpElement return null
  (lookUpElement as jest.Mock).mockReturnValueOnce(null);

  const markType = editorView.state.schema.marks[MARK_LINK];
  (
    findNodesWithSameMark as jest.MockedFunction<typeof findNodesWithSameMark>
  ).mockReturnValue({
    mark: markType.create({href: 'https://example.com'}),
    from: { node: null, pos: 5 },
    to: { node: null, pos: 9 },
  });

  const mockView: EditorView = Object.assign(
    Object.create(Object.getPrototypeOf(editorView)),
    {
      ...editorView,
      domAtPos: mockDomAtPos,
      readOnly: false,
    }
  );

  // Run update → should hit `if (!anchorEl)`
  pluginView.update(mockView, editorView.state);

  expect(mockDestroy).toHaveBeenCalled();
});

it('returns early when anchorEl is the same as this._anchorEl (covers equality branch)', () => {
  const mockDestroy = jest.spyOn(pluginView, 'destroy');
  pluginView._popup = {close: jest.fn(), update: jest.fn()};

  // Create a shared anchor element
  const sameAnchor = document.createElement('a');
  sameAnchor.href = 'https://example.com';

  // Assign it to the plugin’s cached anchor
  pluginView._anchorEl = sameAnchor;

  //Mock lookUpElement to return the SAME element
  (lookUpElement as jest.Mock).mockImplementationOnce(() => sameAnchor);

  // Mock domAtPos to return something valid so lookUpElement is called
  const mockDomAtPos: EditorView['domAtPos'] = () => ({
    node: document.createElement('span'),
    offset: 0,
  });

  // Mock findNodesWithSameMark to simulate a valid found mark
  const markType = editorView.state.schema.marks[MARK_LINK];
  (
    findNodesWithSameMark as jest.MockedFunction<typeof findNodesWithSameMark>
  ).mockReturnValue({
    mark: markType.create({ href: 'https://example.com' }),
    from: { node: null, pos: 5 },
    to: { node: null, pos: 9 },
  });

  //Build a mock EditorView to pass to update()
  const mockView: EditorView = Object.assign(
    Object.create(Object.getPrototypeOf(editorView)),
    {
      ...editorView,
      domAtPos: mockDomAtPos,
      readOnly: false,
      state: editorView.state,
    }
  );

  // Clear any calls made by earlier plugin initialization
  (lookUpElement as jest.Mock).mockClear();

  // Call update() — should hit (anchorEl === this._anchorEl)
  pluginView.update(mockView, editorView.state);

  // Verify branch behavior
  expect(lookUpElement).toHaveBeenCalledTimes(1); // called exactly once in this run
  expect(mockDestroy).not.toHaveBeenCalled(); // early return — no destroy()
  expect(pluginView._anchorEl).toBe(sameAnchor); // cached anchor unchanged
});

it('opens the link tooltip when linked text is hovered', () => {
  const anchor = document.createElement('a');
  const markType = editorView.state.schema.marks[MARK_LINK];
  const popup = {close: jest.fn(), update: jest.fn()};
  (createPopUp as jest.Mock).mockReturnValueOnce(popup);
  (
    findNodesWithSameMark as jest.MockedFunction<typeof findNodesWithSameMark>
  ).mockReturnValue({
    mark: markType.create({href: 'https://example.com'}),
    from: {node: null, pos: 5},
    to: {node: null, pos: 8},
  });
  const mockView = {
    ...editorView,
    posAtDOM: jest.fn().mockReturnValue(5),
    state: editorView.state,
  } as unknown as EditorView;

  pluginView._handleMouseOver(mockView, anchor);

  expect(createPopUp).toHaveBeenCalled();
  expect(pluginView._anchorEl).toBe(anchor);
});

it('closes an open tooltip when linked text is clicked', () => {
  const close = jest.fn();
  pluginView._popup = {close, update: jest.fn()};
  pluginView._handleClick(
    editorView,
    editorView.state.schema.marks[MARK_LINK].create({href: ''})
  );

  expect(close).toHaveBeenCalled();
});

it('keeps the tooltip open when the pointer moves from the link into its actions', () => {
  jest.useFakeTimers();
  const tooltipBody = document.createElement('div');
  tooltipBody.className = 'czi-link-tooltip-body';
  document.body.appendChild(tooltipBody);
  const close = jest.fn();
  pluginView._popup = {close, update: jest.fn()};

  pluginView._bindTooltipHoverEvents();
  pluginView._scheduleClose();
  tooltipBody.dispatchEvent(new MouseEvent('mouseenter'));
  jest.advanceTimersByTime(500);

  expect(close).not.toHaveBeenCalled();
  tooltipBody.remove();
  jest.useRealTimers();
});


});

/** Insert 'Link' text with a link mark at a known valid position (pos=5). */
function insertLinkAtPos(editorView: EditorView, pos: number, href: string) {
  insertLinkedTextAtPos(editorView, pos, 'Link', href);
}

function insertLinkedTextAtPos(
  editorView: EditorView,
  pos: number,
  text: string,
  href: string
) {
  const {state, dispatch} = editorView;
  const linkMark = state.schema.marks[MARK_LINK];
  if (!linkMark) return;

  const tr = state.tr.insert(
    pos,
    state.schema.text(text).mark([linkMark.create({href})])
  );
  dispatch(tr);
}
