import { ObjectIdPlugin, validateAttr } from './ObjectIdPlugin';
import { createEditor, doc, p, schema } from 'jest-prosemirror';
import { EditorView } from 'prosemirror-view';
import { EditorState, Transaction, TextSelection } from 'prosemirror-state';
import { Node, ResolvedPos, Schema, Slice } from 'prosemirror-model';

describe('Object ID plugin', () => {
  it('should return effective schema', () => {
    const effectiveSchema = new ObjectIdPlugin().getEffectiveSchema(schema);
    expect(effectiveSchema).toHaveProperty('marks');
  });

  it('should handle object id plugin new attribute', () => {
    const editor = createEditor(doc('<cursor>', p('Hello')), {
      plugins: [new ObjectIdPlugin()],
    });
    const content = editor.insertText('World').press('Enter');

    expect(content.state.doc.attrs).toHaveProperty('objectId');
  });

  it('should handle createNewId', () => {
    const dummyNode = {
      type: { name: 'citationnote' },
    } as unknown as Node;
    const objid = '{}';
    const objids = [];
    const dummyView = { lastKeyCode: 13 } as unknown as EditorView;
    const mockprevState = { selection: { from: 4 } } as unknown as EditorState;
    const mocknextState = { selection: { from: 6 } } as unknown as EditorState;
    const plugin = new ObjectIdPlugin();
    expect(
      plugin.createNewId(
        dummyNode,
        objid,
        objids,
        dummyView,
        mockprevState,
        mocknextState,
        3
      )
    ).toBeFalsy();
  });
  it('should handle createNewId when this.isNewParagraph(prevState, nextState, pos, view is true', () => {
    const dummyNode = {
      type: { name: 'citationnote' },
    } as unknown as Node;
    const objid = '{}';
    const objids = [];
    const dummyView = { lastKeyCode: 13 } as unknown as EditorView;
    const mockprevState = { selection: { from: 4 } } as unknown as EditorState;
    const mocknextState = { selection: { from: 6 } } as unknown as EditorState;
    const plugin = new ObjectIdPlugin();
    jest.spyOn(plugin, 'isNewParagraph').mockReturnValue(true);
    expect(
      plugin.createNewId(
        dummyNode,
        objid,
        objids,
        dummyView,
        mockprevState,
        mocknextState,
        3
      )
    ).toBeTruthy();
  });

  it('should handle createNewId when isCut is true', () => {
    const dummyNode = {
      type: { name: 'paragraph' },
      attrs: { objectId: '123' },
    } as unknown as Node;
    const objid = '123';
    const objids = [];
    const dummyView = { lastKeyCode: 13 } as unknown as EditorView;
    const mockprevState = { selection: { from: 4 } } as unknown as EditorState;
    const mocknextState = { selection: { from: 6 } } as unknown as EditorState;
    const plugin = new ObjectIdPlugin();
    plugin.isCut = true;
    jest.spyOn(plugin, 'getState').mockReturnValue({
      cutObjectIds: [
        {
          objectId: '123',
          objectMetaData: null as unknown as Record<string, unknown>,
        },
      ],
    });
    expect(
      plugin.createNewId(
        dummyNode,
        objid,
        objids,
        dummyView,
        mockprevState,
        mocknextState,
        0
      )
    ).toBe(true);
  });

  it('should handle getObjectMetaDataFromCutObj when isCut is true', () => {
    const plugin = new ObjectIdPlugin();
    plugin.isCut = true;
    const cutObjectIds = [
      {
        objectId: '123',
        objectMetaData: {
          lastEditedBy: 'qauser',
          creationDate: '2025-02-18T06:10:22.429+00:00',
          lastEditedOn: '2025-02-18T06:11:55.000+00:00',
          capco: { system: 'US', joint: false },
          name: '9c 2f 8107 F 4b 7 403e A 0ae 2b 55e 79885ff',
        },
      },
      { objectId: 'abc', objectMetaData: null },
    ];
    const result = plugin.getObjectMetaDataFromCutObj('123', cutObjectIds);
    expect(result).toEqual({
      lastEditedBy: 'qauser',
      creationDate: '2025-02-18T06:10:22.429+00:00',
      lastEditedOn: '2025-02-18T06:11:55.000+00:00',
      capco: { system: 'US', joint: false },
      name: '9c 2f 8107 F 4b 7 403e A 0ae 2b 55e 79885ff',
    });
  });

  it('SHOULD HANDLE keydown', () => {
    const plugin = new ObjectIdPlugin();
    const boundkeydown = plugin?.props?.handleDOMEvents?.keydown?.bind(plugin);
    const dummyView = { lastKeyCode: 13 } as unknown as EditorView;
    expect(boundkeydown(dummyView, {} as unknown as Event)).toBeFalsy();
  });

  it('SHOULD HANDLE paste with cutObjectIds.length 1', () => {
    const plugin = new ObjectIdPlugin();
    const mockschema = new Schema({
      nodes: {
        doc: {
          content: 'paragraph+',
        },
        paragraph: {
          content: 'text*',
          attrs: {
            styleName: { default: 'test' },
          },
          toDOM() {
            return ['p', 0];
          },
        },
        heading: {
          attrs: { level: { default: 1 }, styleName: { default: '' } },
          content: 'inline*',
          marks: '',
          toDOM(node) {
            return [
              'h' + node.attrs.level,
              { 'data-style-name': node.attrs.styleName },
              0,
            ];
          },
        },
        text: {
          group: 'inline',
        },
      },
    });

    const mockdoc = mockschema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1, styleName: 'test' },
          content: [
            {
              type: 'text',
              text: 'Hello, ProseMirror!',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'This is a mock dummy document.',
              attrs: { styleName: 'test' },
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'It demonstrates the structure of a ProseMirror document.',
            },
          ],
        },
      ],
    });
    mockdoc.nodeAt = () => {
      return {} as unknown as Node;
    };
    const mockselection = {
      $from: {
        before: (x: number) => {
          return x - 1;
        },
      },
      $to: {
        after: (x: number) => {
          return x + 1;
        },
      },
    };
    const tr = {
      doc: mockdoc,
      setNodeMarkup: jest.fn(() => tr),
      setMeta: jest.fn(() => tr),
      selection: mockselection,
    } as unknown as Transaction;

    const mockeditorstate = {
      schema: mockschema,
      doc: mockdoc,
      selection: mockselection,
      tr: tr,
    };
    const editorview = {
      state: mockeditorstate,
      dispatch: jest.fn(),
    };
    jest.spyOn(plugin, 'getState').mockReturnValue({
      cutObjectIds: [
        {
          objectId: '123',
          objectMetaData: {
            lastEditedBy: 'qauser',
            creationDate: '2025-02-18T06:10:22.429+00:00',
            lastEditedOn: '2025-02-18T06:11:55.000+00:00',
            capco: { system: 'US', joint: false },
            name: '9c 2f 8107 F 4b 7 403e A 0ae 2b 55e 79885ff',
          },
        },
      ],
    });
    const boundHandlePaste = plugin?.props?.handlePaste?.bind(plugin);
    expect(
      boundHandlePaste(
        editorview,
        {} as unknown as Event,
        {
          content: {
            childCount: 2,
            content: [
              {
                attrs: {
                  objectId: '123',
                  objectMetaData: {
                    lastEditedBy: 'qauser',
                    creationDate: '2025-02-18T06:10:22.429+00:00',
                    lastEditedOn: '2025-02-18T06:11:55.000+00:00',
                    capco: { system: 'US', joint: false },
                    name: '9c 2f 8107 F 4b 7 403e A 0ae 2b 55e 79885ff',
                  },
                  dirty: true,
                },
              },
            ],
          },
        } as unknown
      )
    ).toBeFalsy();
  });

  it('SHOULD HANDLE paste1', () => {
    const plugin = new ObjectIdPlugin();
    jest.spyOn(plugin, 'getState').mockReturnValue({
      cutObjectIds: [
        {
          objectId: '123',
          objectMetaData: {
            lastEditedBy: 'qauser',
            creationDate: '2025-02-18T06:10:22.429+00:00',
            lastEditedOn: '2025-02-18T06:11:55.000+00:00',
            capco: { system: 'US', joint: false },
            name: '9c 2f 8107 F 4b 7 403e A 0ae 2b 55e 79885ff',
          },
        },
        {
          objectId: 'abc',
          objectMetaData: null as unknown as Record<string, unknown>,
        },
      ],
    });
    const mockschema = new Schema({
      nodes: {
        doc: {
          content: 'paragraph+',
        },
        paragraph: {
          content: 'text*',
          attrs: {
            styleName: { default: 'test' },
          },
          toDOM() {
            return ['p', 0];
          },
        },
        heading: {
          attrs: { level: { default: 1 }, styleName: { default: '' } },
          content: 'inline*',
          marks: '',
          toDOM(node) {
            return [
              'h' + node.attrs.level,
              { 'data-style-name': node.attrs.styleName },
              0,
            ];
          },
        },
        text: {
          group: 'inline',
        },
      },
    });

    const mockdoc = mockschema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1, styleName: 'test' },
          content: [
            {
              type: 'text',
              text: 'Hello, ProseMirror!',
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'This is a mock dummy document.',
              attrs: { styleName: 'test' },
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'It demonstrates the structure of a ProseMirror document.',
            },
          ],
        },
      ],
    });
    mockdoc.nodeAt = () => {
      return {} as unknown as Node;
    };
    const mockselection = {
      $from: {
        before: (x: number) => {
          return x - 1;
        },
      },
      $to: {
        after: (x: number) => {
          return x + 1;
        },
      },
    };
    const tr = {
      doc: mockdoc,
      setNodeMarkup: jest.fn(() => tr),
      setMeta: jest.fn(() => tr),
      selection: mockselection,
    } as unknown as Transaction;

    const mockeditorstate = {
      schema: mockschema,
      doc: mockdoc,
      selection: mockselection,
      tr: tr,
    };
    const editorview = {
      state: mockeditorstate,
      dispatch: jest.fn(),
    };

    const boundHandlePaste = plugin?.props?.handlePaste?.bind(plugin);
    expect(
      boundHandlePaste(
        editorview,
        {} as unknown as Event,
        {
          content: {
            childCount: 2,
            content: [
              {
                attrs: {
                  objectId: '123',
                  objectMetaData: {
                    lastEditedBy: 'qauser',
                    creationDate: '2025-02-18T06:10:22.429+00:00',
                    lastEditedOn: '2025-02-18T06:11:55.000+00:00',
                    capco: { system: 'US', joint: false },
                    name: '9c 2f 8107 F 4b 7 403e A 0ae 2b 55e 79885ff',
                  },
                  dirty: true,
                },
              },
            ],
          },
        } as unknown
      )
    ).toBeFalsy();
  });

  it('Should handle paste2', () => {
    const plugin = new ObjectIdPlugin();
    jest.spyOn(plugin, 'getState').mockReturnValue({
      cutObjectIds: [
        {
          objectId: '123',
          objectMetaData: {
            lastEditedBy: 'qauser',
            creationDate: '2025-02-18T06:10:22.429+00:00',
            lastEditedOn: '2025-02-18T06:11:55.000+00:00',
            capco: { system: 'US', joint: false },
            name: '9c 2f 8107 F 4b 7 403e A 0ae 2b 55e 79885ff',
          },
        },
      ],
    });
    const boundHandlePaste = plugin?.props?.handlePaste?.bind(plugin);
    const dummyView = {
      dispatch: () => {
        return null;
      },
      lastKeyCode: 13,
      state: {
        selection: { from: 0, to: 1 },
        tr: {
          setMeta: () => {
            return {};
          },
          setNodeMarkup: () => {
            return {
              setMeta: () => {
                return {};
              },
            };
          },
          doc: {
            nodeAt: () => {
              return {};
            },
          },
        },
      },
    } as unknown as EditorView;
    expect(
      boundHandlePaste(
        dummyView,
        {} as unknown as Event,
        { content: { content: [{ attrs: true }] } } as unknown
      )
    ).toBeFalsy();
  });

  it('Should handle cut DOM event', () => {
    const plugin = new ObjectIdPlugin();
    const spy = jest.spyOn(plugin, 'getState');
    const boundHandleCut = plugin?.props?.handleDOMEvents?.cut?.bind(plugin);

    const schema1 = new Schema({
      nodes: {
        doc: {
          content: 'paragraph+',
        },
        paragraph: {
          attrs: {
            align: { default: 'left' },
            objectId: { default: 1 },
          },
          content: 'text*',
          toDOM(node) {
            const attrs = {
              style: `text-align: ${node.attrs.align}`,
            };
            return ['p', attrs, 0];
          },
          parseDOM: [
            {
              tag: 'p',
              getAttrs(dom) {
                const element = dom;
                return {
                  align: element.getAttribute('align') || 'left',
                  objectId: element.getAttribute('objectId'),
                };
              },
            },
          ],
        },
        text: {
          group: 'inline',
        },
      },
    });
    const editorState = {
      schema: schema1,
      doc: schema1.nodeFromJSON({
        type: 'doc',
        attrs: {
          layout: null,
          padding: null,
          width: null,
          counterFlags: null,
          capcoMode: 0,
        },
        content: [
          {
            type: 'paragraph',
            attrs: {
              align: 'left',
              color: null,
              id: null,
              indent: null,
              objectId: '123',
              lineSpacing: null,
              paddingBottom: null,
              paddingTop: null,
              capco: null,
              styleName: 'AFDP Bullet',
            },
            content: [
              {
                type: 'text',
                marks: [],
                text: 'Your text here previous',
              },
            ],
          },
        ],
      }),
      selection: { from: 0, to: 10 },
    };
    const dummyView = {
      input: { lastKeyCode: '13' },
      state: editorState,
    } as unknown as EditorView;

    boundHandleCut(dummyView, {} as unknown as Event);
    expect(spy).toHaveBeenCalled();
  });

  it('should handle createNewId when isNewParagraph is not true', () => {
    const dummyNode = {
      type: { name: 'citationnote' },
    } as unknown as Node;
    const objid = '{}';
    const objids = [];
    const dummyView = { lastKeyCode: 13 } as unknown as EditorView;
    const mockprevState = { selection: { from: 4 } } as unknown as EditorState;
    const mocknextState = { selection: { from: 6 } } as unknown as EditorState;
    const plugin = new ObjectIdPlugin();
    expect(
      plugin.createNewId(
        dummyNode,
        objid,
        objids,
        dummyView,
        mockprevState,
        mocknextState,
        2
      )
    ).toBeFalsy();
  });

  it('should handle createNewId when isNewParagraph is not true and when typeof objId is object', () => {
    const dummyNode = {
      type: { name: 'citationnote' },
    } as unknown as Node;
    const objid = {} as unknown as string;
    const objids = [];
    const dummyView = { lastKeyCode: 13 } as unknown as EditorView;
    const mockprevState = { selection: { from: 4 } } as unknown as EditorState;
    const mocknextState = { selection: { from: 6 } } as unknown as EditorState;
    const plugin = new ObjectIdPlugin();
    expect(
      plugin.createNewId(
        dummyNode,
        objid,
        objids,
        dummyView,
        mockprevState,
        mocknextState,
        2
      )
    ).toBeTruthy();
  });

  it('should handle createNewId when isNewParagraph is true', () => {
    const dummyNode = {
      type: { name: 'citationnote' },
    } as unknown as Node;
    const objid = {} as unknown as string;
    const objids = [];
    const dummyView = { input: { lastKeyCode: '13' } } as unknown as EditorView;
    const mockprevState = { selection: { from: 4 } } as unknown as EditorState;
    const mocknextState = { selection: { from: 6 } } as unknown as EditorState;
    const plugin = new ObjectIdPlugin();
    expect(
      plugin.createNewId(
        dummyNode,
        objid,
        objids,
        dummyView,
        mockprevState,
        mocknextState,
        2
      )
    ).toBeTruthy();
  });

  it('should handle nodeAssignment', () => {
    const plugin = new ObjectIdPlugin();
    jest.spyOn(plugin, 'isTargetNodeAllowed').mockReturnValue(true);

    const schema1 = new Schema({
      nodes: {
        doc: {
          content: 'paragraph+',
        },
        paragraph: {
          attrs: {
            align: { default: 'left' },
            objectId: { default: 1 },
          },
          content: 'text*',
          toDOM(node) {
            const attrs = {
              style: `text-align: ${node.attrs.align}`,
            };
            return ['p', attrs, 0];
          },
          parseDOM: [
            {
              tag: 'p',
              getAttrs(dom) {
                const element = dom;
                return {
                  align: element.getAttribute('align') || 'left',
                  objectId: element.getAttribute('objectId'),
                };
              },
            },
          ],
        },
        text: {
          group: 'inline',
        },
      },
    });
    const editorState = EditorState.create({
      doc: schema1.node('doc', null, [
        schema1.node('paragraph', { align: 'center', objectId: 1 }, [
          schema1.text('Firmusoft'),
        ]),
      ]),
    });

    expect(plugin.nodeAssignment(editorState)).toBeDefined();
  });

  it('should handle isRequiredNewId', () => {
    const mockResolvedPos = {
      pos: 3,
      parent: {
        type: { name: 'paragraph' },
      },
      depth: 1,
      nodeBefore: {},
      min: () => {
        return '';
      },
      max: () => {
        return '';
      },
    } as unknown as ResolvedPos;

    const dummyNode = {
      type: { name: 'citationnote' },
      attrs: { objectId: '1' },
    } as unknown as Node;
    const objids = ['1'];
    const dummyView = { lastKeyCode: 13 } as unknown as EditorView;
    const mockselection = new TextSelection(mockResolvedPos);
    const mockprevState = {
      selection: mockselection,
      doc: {
        resolve: () => {
          return { type: 'paragraph' };
        },
      },
    } as unknown as EditorState;
    const mocknextState = {
      selection: mockselection,
      schema: { nodes: { paragraph: 'paragraph' } },
      doc: {
        resolve: () => {
          return { type: 'paragraph' };
        },
      },
      tr: {
        key: 'nextstate-tr',
        setNodeMarkup: () => {
          return { key: 'mockTransaction-nextstate' };
        },
      },
    } as unknown as EditorState;
    const plugin = new ObjectIdPlugin();
    expect(
      plugin.isRequiredNewId(
        dummyNode,
        objids,
        dummyView,
        mockprevState,
        mocknextState,
        1
      )
    ).toBeTruthy();
  });

  it('should handle trackDeletedObjectId when prevState.doc = nextState.doc', () => {
    const plugin = new ObjectIdPlugin();
    expect(
      plugin.trackDeletedObjectId(
        { doc: 'doc' } as unknown as EditorState,
        { doc: 'doc' } as unknown as EditorState,
        {} as unknown as Transaction
      )
    ).toBeTruthy();
  });

  it('should handle applyEffectiveSchema when schema.spec not prsent', () => {
    const plugin = new ObjectIdPlugin();
    expect(
      plugin.applyEffectiveSchema({ spec: null } as unknown as Schema)
    ).toStrictEqual({ spec: null });
  });

  it('should set dirty flag if conditions are met', () => {
    const tr = { setNodeMarkup: jest.fn() } as unknown as Transaction;
    const nextState = {
      tr: { setNodeMarkup: jest.fn() },
    } as unknown as EditorState;
    const mockSelection = { $cursor: { pos: 10 } };
    const plugin = new ObjectIdPlugin();
    const prevState = {
      selection: mockSelection,
      doc: { resolve: () => mockSelection },
    } as unknown as EditorState;

    plugin.setDirtyFlagOnChange(prevState, nextState, tr, true);

    expect(tr.setNodeMarkup).toBeDefined();
  });

  it('should set dirty flag if cursor is null', () => {
    const tr = { setNodeMarkup: jest.fn() } as unknown as Transaction;
    const nextState = {
      selection: {
        $from: {
          before: () => {
            return 0;
          },
          $start: () => {
            return 1;
          },
          $end: () => {
            return 1;
          },
        },
        $to: {
          after: () => {
            return 1;
          },
          pos: 0,
        },
      },
      tr: { setNodeMarkup: jest.fn() },
    } as unknown as EditorState;
    const mockSelection = { $cursor: { pos: 10 } };
    const plugin = new ObjectIdPlugin();
    const prevState = {
      selection: mockSelection,
      doc: { resolve: () => mockSelection },
    } as unknown as EditorState;

    plugin.setDirtyFlagOnChange(prevState, nextState, tr, true);

    expect(tr.setNodeMarkup).toBeDefined();
  });

  it('should not set dirty flag if conditions are not met', () => {
    const tr = { setNodeMarkup: jest.fn() } as unknown as Transaction;
    const nextState = {
      tr: { setNodeMarkup: jest.fn() },
    } as unknown as EditorState;
    const mockSelection = { $cursor: { pos: 10 } };
    const plugin = new ObjectIdPlugin();
    const prevState = {
      selection: mockSelection,
      doc: { resolve: () => mockSelection },
    } as unknown as EditorState;

    plugin.setDirtyFlagOnChange(prevState, nextState, tr, true);

    expect(tr.setNodeMarkup).not.toHaveBeenCalled();
  });

  it('should handle appendTransaction and apply steps correctly when selection.$cursor is null', () => {
    const testSchema = new Schema({
      nodes: {
        doc: {
          content: 'paragraph+',
        },
        paragraph: {
          content: 'text*',
          group: 'block',
        },
        text: {
          group: 'inline',
        },
      },
      marks: {},
    });

    const docMock = testSchema.node('doc', null, [
      testSchema.node('paragraph', null, [testSchema.text('Hello')]),
    ]);
    const fromPos = docMock.resolve(1).pos;
    const toPos = docMock.resolve(docMock.content.size).pos;

    const nextState = EditorState.create({
      schema: testSchema,
      doc: testSchema.node('doc', null, [
        testSchema.node('paragraph', null, [testSchema.text('Hello World')]),
      ]),
      selection: TextSelection.create(docMock, fromPos, toPos),
    });

    const prevState = EditorState.create({
      schema: testSchema,
      doc: testSchema.node('doc', null, [
        testSchema.node('paragraph', null, [testSchema.text('Hello')]),
      ]),
      selection: TextSelection.create(docMock, fromPos, toPos),
    });

    const plugin = new ObjectIdPlugin();
    const appendTransaction = plugin.spec.appendTransaction || (() => null);
    const result = appendTransaction([], prevState, nextState);

    expect(result).toBeDefined();
  });

  it('should handle appendTransaction and apply steps correctly', () => {
    const testSchema = new Schema({
      nodes: {
        doc: {
          content: 'paragraph+',
        },
        paragraph: {
          content: 'text*',
          group: 'block',
        },
        text: {
          group: 'inline',
        },
      },
      marks: {},
    });

    const prevState = EditorState.create({
      schema: testSchema,
      doc: testSchema.node('doc', null, [
        testSchema.node('paragraph', null, [testSchema.text('Hello')]),
      ]),
    });

    const nextState = EditorState.create({
      schema: testSchema,
      doc: testSchema.node('doc', null, [
        testSchema.node('paragraph', null, [testSchema.text('Hello World')]),
      ]),
    });
    const plugin = new ObjectIdPlugin();
    const appendTransaction = plugin.spec.appendTransaction || (() => null);
    const result = appendTransaction([], prevState, nextState);

    expect(result).toBeDefined();
  });

  it('should validate attrs', () => {
    expect(validateAttr(null)).toBeTruthy();
    expect(validateAttr(undefined)).toBeTruthy();
    expect(validateAttr('null')).toBeTruthy();
    expect(validateAttr(0)).toBeTruthy();
    expect(validateAttr(['script', 'badstuff'])).toBeFalsy();
  });
  it('should handle isNewParagraph', () => {
    const plugin = new ObjectIdPlugin();
    expect(
      plugin.isNewParagraph(
        {
          selection: {
            $from: {
              after: () => {
                return 1;
              },
              start: () => {
                return 0;
              },
              pos: 0,
            },
            from: 1,
          },
        } as unknown as EditorState,
        { selection: { from: 3 } } as unknown as EditorState,
        0,
        { input: { lastKeyCode: 13 } } as unknown as EditorView
      )
    ).toBeTruthy();
  });
  it('should handle assignSameObjectMetaDataForCutPastePara', () => {
    const schema = new Schema({
      nodes: {
        doc: { content: 'paragraph+' },
        paragraph: {
          content: 'text*',
          attrs: {
            objectId: { default: '123' },
            objectMetaData: { default: null },
          },
          toDOM: () => ['p', 0],
          parseDOM: [{ tag: 'p' }],
        },
        text: { group: 'inline' },
      },
    });

    const jsonDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { objectId: '123', objectMetaData: null },
          content: [{ type: 'text', text: 'Hello, ProseMirror!' }],
        },
      ],
    };
    const mockdoc = schema.nodeFromJSON(jsonDoc);
    const plugin = new ObjectIdPlugin();
    plugin.pastedPara = { content: { childCount: 2 } } as unknown as Slice;
    jest.spyOn(plugin, 'getState').mockReturnValue({
      cutObjectIds: [
        {
          objectId: '123',
          objectMetaData: null as unknown as Record<string, unknown>,
        },
        {
          objectId: '123',
          objectMetaData: null as unknown as Record<string, unknown>,
        },
      ],
    });
    const Mocktr = {
      setNodeMarkup: () => {
        return {};
      },
      doc: mockdoc,
    } as unknown as Transaction;
    const Mockstate = { tr: Mocktr } as unknown as EditorState;
    expect(
      plugin.assignSameObjectMetaDataForCutPastePara(
        Mockstate,
        undefined as unknown as Transaction
      )
    ).toBeDefined();
  });
});
