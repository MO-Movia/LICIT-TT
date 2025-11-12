import {applyMark,updateMarksAttrs,addMarksToNode,handleTextColorMark,updateToggleMarks} from './index';
import {EditorState} from 'prosemirror-state';
import {Mark, MarkType, Schema, Node, ResolvedPos} from 'prosemirror-model';
import {Transform} from 'prosemirror-transform';
import {doc, p} from 'prosemirror-test-builder';
import {addMarkWithAttributes} from './applyMark';

describe('applyMark', () => {
  let schema;
  let docs;
  let state;

  beforeEach(() => {
    schema = new Schema({
      nodes: {
        doc: {content: 'text*'},
        text: {},
      },
      marks: {
        bold: {},
      },
    });

    docs = schema.node('doc', {}, [schema.text('Hello world')]);
    state = EditorState.create({schema, doc: docs});
  });
  const mySchema = new Schema({
    nodes: {
      doc: {
        attrs: {lineSpacing: {default: 'test'}},
        content: 'block+',
      },
      paragraph: {
        attrs: {lineSpacing: {default: 'test'}},
        content: 'text*',
        group: 'block',
      },
      heading: {
        attrs: {lineSpacing: {default: 'test'}},
        content: 'text*',
        group: 'block',
        defining: true,
      },
      bullet_list: {
        content: 'list_item+',
        group: 'block',
      },
      list_item: {
        attrs: {lineSpacing: {default: 'test'}},
        content: 'paragraph',
        defining: true,
      },
      blockquote: {
        attrs: {lineSpacing: {default: 'test'}},
        content: 'block+',
        group: 'block',
      },
      text: {
        inline: true,
      },
    },
  });

  // Create a dummy document using the defined schema
  const dummyDoc = mySchema.node('doc', null, [
    mySchema.node('heading', {lineSpacing: 'test'}, [
      mySchema.text('Heading 1'),
    ]),
    mySchema.node('paragraph', {lineSpacing: 'test'}, [
      mySchema.text('This is a paragraph'),
    ]),
    mySchema.node('bullet_list', {lineSpacing: 'test'}, [
      mySchema.node('list_item', {lineSpacing: 'test'}, [
        mySchema.node('paragraph', {lineSpacing: 'test'}, [
          mySchema.text('List item 1'),
        ]),
      ]),
      mySchema.node('list_item', {lineSpacing: 'test'}, [
        mySchema.node('paragraph', {lineSpacing: 'test'}, [
          mySchema.text('List item 2'),
        ]),
      ]),
    ]),
    mySchema.node('blockquote', {lineSpacing: 'test'}, [
      mySchema.node('paragraph', {lineSpacing: 'test'}, [
        mySchema.text('This is a blockquote'),
      ]),
    ]),
  ]);
  dummyDoc.rangeHasMark = () => {
    return true;
  };
  dummyDoc.nodeAt = () => {
    return dummyDoc;
  };

  it('should apply a mark to the given range', () => {
    const markType = schema.marks.bold;
    const attrs = {fontWeight: 'bold'};
    const tr = state.tr;
    const transformedTr = applyMark(tr, schema, markType, attrs);

    expect(transformedTr.docChanged).toBe(false);
  });

  it('should remove the mark from the given range if it already exists', () => {
    const markType = schema.marks.bold;
    const attrs = {fontWeight: 'bold'};

    const tr = state.tr
      .addMark(0, 5, markType.create(attrs))
      .addMark(6, 11, markType.create(attrs));

    const transformedTr = applyMark(tr, schema, markType, attrs);

    expect(transformedTr.docChanged).toBe(true);
    expect(transformedTr.steps).toHaveLength(2);
  });

  it('should apply a mark to the given range', () => {
    const markType = schema.marks.bold;
    const attrs = {fontWeight: 'bold'};
    const schema1 = new Schema({
      nodes: {
        doc: {content: 'paragraph+'},
        paragraph: {
          content: 'text*',
          toDOM() {
            return ['p', 0];
          },
        },
        text: {},
      },
    });

    const state = EditorState.create({
      doc: doc(p('hello world')),
      schema: schema1,
    });
    const tr = state.tr;
    const transformedTr = applyMark(tr, schema, markType, attrs, true);
    expect(transformedTr.steps).toStrictEqual([]);
  });
  it('should be check the condition (empty && !$cursor)', () => {
    const markType = schema.marks.bold;
    const attrs = {fontWeight: 'bold'};
    const tr = {
      doc: {
        rangeHasMark: () => {
          return true;
        },
      },
      selection: {empty: {}, ranges: {}},
    } as unknown as Transform;
    const transformedTr = applyMark(tr, schema, markType, attrs, false);
    expect(transformedTr).toBeTruthy();
  });
  it('should be check the condition !markApplies(tr.doc, ranges, markType)', () => {
    const markType = schema.marks.bold;
    const attrs = {fontWeight: 'bold'};
    const tr = {
      doc: dummyDoc,
      selection: {
        $cursor: {},
        ranges: [{$from: {depth: 1, pos: 0}, $to: {depth: 1, pos: 0}}],
      },
    } as unknown as Transform;
    const transformedTr = applyMark(tr, schema, markType, attrs, false);
    expect(transformedTr).toBeTruthy();
  });
  it('should be check the condition !can', () => {
    const markType = schema.marks.bold;
    const attrs = {fontWeight: 'bold'};
    const tr = {
      removeStoredMark: () => {
        return {
          addStoredMark: () => {
            return {};
          },
        };
      },
      addStoredMark: () => {
        return {
          doc: {
            rangeHasMark: () => {
              return true;
            },
          },
        };
      },
      doc: dummyDoc,
      selection: {
        $cursor: {},
        ranges: [{$from: {depth: 1, pos: 1}, $to: {depth: 1, pos: 2}}],
      },
    } as unknown as Transform;
    const transformedTr = applyMark(tr, schema, markType, attrs, false);
    expect(transformedTr).toBeTruthy();
  });
  it('should handle applyMark when isCustomStyleApplied is true ', () => {
    const addMark = () => {
      return {addMark: addMark, doc: dummyDoc};
    };
    const markType = schema.marks.bold;
    const attrs = {fontWeight: 'bold'};
    const tr = {
      addMark: addMark,
      removeStoredMark: () => {
        return {
          addStoredMark: () => {
            return {};
          },
        };
      },
      addStoredMark: () => {
        return {
          doc: {
            rangeHasMark: () => {
              return true;
            },
          },
        };
      },
      doc: dummyDoc,
      selection: {
        $cursor: null,
        ranges: [{$from: {depth: 1, pos: 1}, $to: {depth: 1, pos: 2}}],
      },
    } as unknown as Transform;
    const transformedTr = applyMark(tr, schema, markType, attrs, true);
    expect(transformedTr).toBeTruthy();
  });
  it('should handle applyMark when nodeTr is null', () => {
    const dummyDoc = mySchema.node('doc', null, [
      mySchema.node('heading', {lineSpacing: 'test'}, [
        mySchema.text('Heading 1'),
      ]),
      mySchema.node('paragraph', {lineSpacing: 'test'}, [
        mySchema.text('This is a paragraph'),
      ]),
      mySchema.node('bullet_list', {lineSpacing: 'test'}, [
        mySchema.node('list_item', {lineSpacing: 'test'}, [
          mySchema.node('paragraph', {lineSpacing: 'test'}, [
            mySchema.text('List item 1'),
          ]),
        ]),
        mySchema.node('list_item', {lineSpacing: 'test'}, [
          mySchema.node('paragraph', {lineSpacing: 'test'}, [
            mySchema.text('List item 2'),
          ]),
        ]),
      ]),
      mySchema.node('blockquote', {lineSpacing: 'test'}, [
        mySchema.node('paragraph', {lineSpacing: 'test'}, [
          mySchema.text('This is a blockquote'),
        ]),
      ]),
    ]);
    dummyDoc.rangeHasMark = () => {
      return true;
    };
    dummyDoc.nodeAt = () => {
      return null;
    };
    const addMark = () => {
      return {addMark: addMark};
    };
    const markType = schema.marks.bold;
    const attrs = {fontWeight: 'bold'};
    const tr = {
      addMark: addMark,
      removeStoredMark: () => {
        return {
          addStoredMark: () => {
            return {};
          },
        };
      },
      addStoredMark: () => {
        return {
          doc: {
            rangeHasMark: () => {
              return true;
            },
          },
        };
      },
      doc: dummyDoc,
      selection: {
        $cursor: null,
        ranges: [{$from: {depth: 1, pos: 1}, $to: {depth: 1, pos: 2}}],
      },
    } as unknown as Transform;
    const transformedTr = applyMark(tr, schema, markType, attrs, true);
    expect(transformedTr).toBeTruthy();
  });
  it('should handle applyMark', () => {
    const linkmark = new Mark();
    const mockschema = new Schema({
      nodes: {
        doc: {
          content: 'paragraph+',
        },
        paragraph: {
          content: 'text*',
          attrs: {
            styleName: {default: 'test'},
          },
          toDOM() {
            return ['p', 0];
          },
        },
        heading: {
          attrs: {level: {default: 1}, styleName: {default: ''}},
          content: 'inline*',
          marks: '',
          toDOM(node) {
            return [
              'h' + node.attrs.level,
              {'data-style-name': node.attrs.styleName},
              0,
            ];
          },
        },
        text: {
          group: 'inline',
        },
      },
      marks: {
        link: linkmark,
      },
    });
    const mockdoc = mockschema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: {level: 1, styleName: 'Normal'},
          content: [
            {
              type: 'text',
              text: 'Hello, ProseMirror!',
            },
          ],
          marks: [{type: 'link', attrs: {['overridden']: true}}],
        },
      ],
    });
    const addMark = () => {
      return {addMark: addMark};
    };
    const markType = schema.marks.bold;
    const attrs = {fontWeight: 'bold'};
    const tr = {
      addMark: addMark,
      removeStoredMark: () => {
        return {
          addStoredMark: () => {
            return {};
          },
        };
      },
      addStoredMark: () => {
        return {
          doc: {
            rangeHasMark: () => {
              return true;
            },
          },
        };
      },
      doc: mockdoc,
      selection: {
        $cursor: null,
        ranges: [{$from: {depth: 1, pos: 1}, $to: {depth: 1, pos: 2}}],
      },
    } as unknown as Transform;
    const transformedTr = applyMark(tr, schema, markType, attrs, true);
    expect(transformedTr).toBeTruthy();
  });

  it('should handle applyMark when has is null', () => {
    const dummyDoc = mySchema.node('doc', null, [
      mySchema.node('heading', {lineSpacing: 'test'}, [
        mySchema.text('Heading 1'),
      ]),
      mySchema.node('paragraph', {lineSpacing: 'test'}, [
        mySchema.text('This is a paragraph'),
      ]),
      mySchema.node('bullet_list', {lineSpacing: 'test'}, [
        mySchema.node('list_item', {lineSpacing: 'test'}, [
          mySchema.node('paragraph', {lineSpacing: 'test'}, [
            mySchema.text('List item 1'),
          ]),
        ]),
        mySchema.node('list_item', {lineSpacing: 'test'}, [
          mySchema.node('paragraph', {lineSpacing: 'test'}, [
            mySchema.text('List item 2'),
          ]),
        ]),
      ]),
      mySchema.node('blockquote', {lineSpacing: 'test'}, [
        mySchema.node('paragraph', {lineSpacing: 'test'}, [
          mySchema.text('This is a blockquote'),
        ]),
      ]),
    ]);
    dummyDoc.rangeHasMark = () => {
      return false;
    };
    dummyDoc.nodeAt = () => {
      return {
        marks: [{type: {name: {name: 'link'} as unknown as MarkType}}],
      } as unknown as Node;
    };
    const addMark = () => {
      return {addMark: addMark};
    };
    const markType = {
      name: 'link',
      create: () => {
        return {};
      },
    } as unknown as MarkType;
    const attrs = {fontWeight: 'bold'};
    const tr = {
      addMark: addMark,
      removeStoredMark: () => {
        return {
          addStoredMark: () => {
            return {};
          },
        };
      },
      addStoredMark: () => {
        return {
          doc: {
            rangeHasMark: () => {
              return {};
            },
          },
        };
      },
      doc: dummyDoc,
      selection: {
        $cursor: null,
        ranges: [{$from: {depth: 1, pos: 1}, $to: {depth: 1, pos: 2}}],
      },
    } as unknown as Transform;
    const transformedTr = applyMark(tr, schema, markType, attrs, true);
    expect(transformedTr).toBeTruthy();
  });


  it('should handle addMarkWithAttributes',()=>{
expect(addMarkWithAttributes({addMark:()=>{return {};},removeMark:()=>{return {addMark:()=>{return {};}};},doc:{nodeAt:()=>{return {marks:[{type:{name:'mark-text-color'}}]};}}} as unknown as Transform,{marks:{'mark-text-color':{}}} as unknown as Schema,{pos:0} as unknown as ResolvedPos,
  {pos:1} as unknown as ResolvedPos,{create:()=>{},name:'link'} as unknown as MarkType,{},true)).toStrictEqual({});
  });
  it('should handle addMarkWithAttributes',()=>{
    expect(addMarkWithAttributes({addMark:()=>{return {};},removeMark:()=>{return {addMark:()=>{return {};}};},doc:{nodeAt:()=>{return {marks:[{type:{name:'mark-text-color'}}]};}}} as unknown as Transform,{marks:{'mark-text-color':{}}} as unknown as Schema,{pos:0} as unknown as ResolvedPos,
      {pos:1} as unknown as ResolvedPos,{create:()=>{},name:'mark-text-color'} as unknown as MarkType,{},true)).toStrictEqual({});
      });
      it('should handle addMarkWithAttributes',()=>{
        expect(addMarkWithAttributes({addMark:()=>{return {};},removeMark:()=>{return {addMark:()=>{return {};}};},doc:{nodeAt:()=>{return {marks:[{type:{name:'mark-text-color'}}]};}}} as unknown as Transform,{marks:{'mark-text-color':{}}} as unknown as Schema,{pos:0} as unknown as ResolvedPos,
          {pos:1} as unknown as ResolvedPos,{create:()=>{},name:'test'} as unknown as MarkType,{},true)).toStrictEqual({});
          });
});
describe('updateMarksAttrs',()=>{
  it('should handle updateMarksAttrs',()=>{
    const schema = new Schema({
      nodes: {
        doc: {
          content: 'block+',
        },
        paragraph: {
          content: 'text*',
          group: 'block',
          parseDOM: [{ tag: 'p' }],
          toDOM() {
            return ['p', 0];
          },
        },
        text: {
          group: 'inline',
        },
      },
      marks: {
        'mark-text-color': {
          attrs: { color: {} },
          parseDOM: [{ style: 'color', getAttrs: (value) => ({ color: value }) }],
          toDOM(mark) {
            return ['span', { style: `color: ${mark.attrs.color}` }, 0];
          },
        },
      },
    });

    // Dummy JSON representation of a ProseMirror document with multiple marks
    const docJson = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Hello, ',
            },
            {
              type: 'text',
              text: 'ProseMirror!',
              marks: [
              ],
            },
          ],
          marks: [
            { type: 'mark-text-color', attrs: { color: 'red' } },
          ],
        },
      ],
    };

    // Create a document node from JSON
    const docNode = schema.nodeFromJSON(docJson);
    const test = updateMarksAttrs({name:'mark-text-color',create:()=>{}} as unknown as MarkType,{doc:docNode,addMark:()=>{}} as unknown as Transform,{selection:{from:0,to:1}} as unknown as EditorState,'test');
    expect(test).toBeUndefined();
    const test1 = updateMarksAttrs({name:'mark-text-color',create:()=>{}} as unknown as MarkType,{doc:docNode,addMark:()=>{}} as unknown as Transform,{selection:{from:0,to:1}} as unknown as EditorState,'#000000');
    expect(test1).toBeUndefined();
  });
  it('should handle updateMarksAttrs',()=>{
    const schema = new Schema({
      nodes: {
        doc: {
          content: 'block+',
        },
        paragraph: {
          content: 'text*',
          group: 'block',
          parseDOM: [{ tag: 'p' }],
          toDOM() {
            return ['p', 0];
          },
        },
        text: {
          group: 'inline',
        },
      },
      marks: {
        'mark-text-color': {
          attrs: { color: {} },
          parseDOM: [{ style: 'color', getAttrs: (value) => ({ color: value }) }],
          toDOM(mark) {
            return ['span', { style: `color: ${mark.attrs.color}` }, 0];
          },
        },
      },
    });

    // Dummy JSON representation of a ProseMirror document with multiple marks
    const docJson = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Hello, ',
            },
            {
              type: 'text',
              text: 'ProseMirror!',
              marks: [
              ],
            },
          ],
          marks: [
            { type: 'mark-text-color', attrs: { color: 'red' } },
          ],
        },
      ],
    };

    // Create a document node from JSON
    const docNode = schema.nodeFromJSON(docJson);
    const test1 = updateMarksAttrs({name:'mark-text-color',create:()=>{}} as unknown as MarkType,{doc:docNode,addMark:()=>{}} as unknown as Transform,{selection:{from:0,to:1}} as unknown as EditorState,'#000000');
    expect(test1).toBeUndefined();
  });
  it('should handle updateMarksAttrs',()=>{
    const schema = new Schema({
      nodes: {
        doc: {
          content: 'block+',
        },
        paragraph: {
          content: 'text*',
          group: 'block',
          parseDOM: [{ tag: 'p' }],
          toDOM() {
            return ['p', 0];
          },
        },
        text: {
          group: 'inline',
        },
      },
      marks: {
        'mark-font-size': {
          attrs: { color: {} },
          parseDOM: [{ style: 'color', getAttrs: (value) => ({ color: value }) }],
          toDOM(mark) {
            return ['span', { style: `color: ${mark.attrs.color}` }, 0];
          },
        },
      },
    });

    // Dummy JSON representation of a ProseMirror document with multiple marks
    const docJson = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Hello, ',
            },
            {
              type: 'text',
              text: 'ProseMirror!',
              marks: [
              ],
            },
          ],
          marks: [
            { type: 'mark-font-size', attrs: { color: 'red' } },
          ],
        },
      ],
    };

    // Create a document node from JSON
    const docNode = schema.nodeFromJSON(docJson);
    const test = updateMarksAttrs({name:'mark-font-size',create:()=>{}} as unknown as MarkType,{doc:docNode,addMark:()=>{}} as unknown as Transform,{selection:{from:0,to:1}} as unknown as EditorState,'test');
    expect(test).toBeUndefined();
    const test1 = updateMarksAttrs({name:'mark-font-size',create:()=>{}} as unknown as MarkType,{doc:docNode,addMark:()=>{}} as unknown as Transform,{selection:{from:0,to:1}} as unknown as EditorState,'#000000');
    expect(test1).toBeUndefined();
  });
  it('should handle updateMarksAttrs',()=>{
    const schema = new Schema({
      nodes: {
        doc: {
          content: 'block+',
        },
        paragraph: {
          content: 'text*',
          group: 'block',
          parseDOM: [{ tag: 'p' }],
          toDOM() {
            return ['p', 0];
          },
        },
        text: {
          group: 'inline',
        },
      },
      marks: {
        'mark-font-size': {
          attrs: { color: {} },
          parseDOM: [{ style: 'color', getAttrs: (value) => ({ color: value }) }],
          toDOM(mark) {
            return ['span', { style: `color: ${mark.attrs.color}` }, 0];
          },
        },
      },
    });

    // Dummy JSON representation of a ProseMirror document with multiple marks
    const docJson = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Hello, ',
            },
            {
              type: 'text',
              text: 'ProseMirror!',
              marks: [
              ],
            },
          ],
          marks: [
            { type: 'mark-font-size', attrs: { color: 'red' } },
          ],
        },
      ],
    };

    // Create a document node from JSON
    const docNode = schema.nodeFromJSON(docJson);
    const test1 = updateMarksAttrs({name:'mark-font-size',create:()=>{}} as unknown as MarkType,{doc:docNode,addMark:()=>{}} as unknown as Transform,{selection:{from:0,to:1}} as unknown as EditorState,undefined as unknown as string | number);
    expect(test1).toBeUndefined();
  });
  it('should handle updateMarksAttrs',()=>{
    const schema = new Schema({
      nodes: {
        doc: {
          content: 'block+',
        },
        paragraph: {
          content: 'text*',
          group: 'block',
          parseDOM: [{ tag: 'p' }],
          toDOM() {
            return ['p', 0];
          },
        },
        text: {
          group: 'inline',
        },
      },
      marks: {
        'mark-font-type': {
          attrs: { color: {} },
          parseDOM: [{ style: 'color', getAttrs: (value) => ({ color: value }) }],
          toDOM(mark) {
            return ['span', { style: `color: ${mark.attrs.color}` }, 0];
          },
        },
      },
    });

    // Dummy JSON representation of a ProseMirror document with multiple marks
    const docJson = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Hello, ',
            },
            {
              type: 'text',
              text: 'ProseMirror!',
              marks: [
              ],
            },
          ],
          marks: [
            { type: 'mark-font-type', attrs: { color: 'red' } },
          ],
        },
      ],
    };

    // Create a document node from JSON
    const docNode = schema.nodeFromJSON(docJson);
    const test = updateMarksAttrs({name:'mark-font-type',create:()=>{}} as unknown as MarkType,{doc:docNode,addMark:()=>{}} as unknown as Transform,{selection:{from:0,to:1}} as unknown as EditorState,'test');
    expect(test).toBeUndefined();
    const test1 = updateMarksAttrs({name:'mark-font-type',create:()=>{}} as unknown as MarkType,{doc:docNode,addMark:()=>{}} as unknown as Transform,{selection:{from:0,to:1}} as unknown as EditorState,undefined as unknown as string | number);
    expect(test1).toBeUndefined();
  });
  it('should handle updateMarksAttrs',()=>{
    const schema = new Schema({
      nodes: {
        doc: {
          content: 'block+',
        },
        paragraph: {
          content: 'text*',
          group: 'block',
          parseDOM: [{ tag: 'p' }],
          toDOM() {
            return ['p', 0];
          },
        },
        text: {
          group: 'inline',
        },
      },
      marks: {
        'mark-text-highlight': {
          attrs: { color: {} },
          parseDOM: [{ style: 'color', getAttrs: (value) => ({ color: value }) }],
          toDOM(mark) {
            return ['span', { style: `color: ${mark.attrs.color}` }, 0];
          },
        },
      },
    });

    // Dummy JSON representation of a ProseMirror document with multiple marks
    const docJson = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Hello, ',
            },
            {
              type: 'text',
              text: 'ProseMirror!',
              marks: [
              ],
            },
          ],
          marks: [
            { type: 'mark-text-highlight', attrs: { color: 'red' } },
          ],
        },
      ],
    };

    // Create a document node from JSON
    const docNode = schema.nodeFromJSON(docJson);
    const test = updateMarksAttrs({name:'mark-text-highlight',create:()=>{}} as unknown as MarkType,{doc:docNode,addMark:()=>{}} as unknown as Transform,{selection:{from:0,to:1}} as unknown as EditorState,'test');
    expect(test).toBeUndefined();
    const test1 = updateMarksAttrs({name:'mark-text-highlight',create:()=>{}} as unknown as MarkType,{doc:docNode,addMark:()=>{}} as unknown as Transform,{selection:{from:0,to:1}} as unknown as EditorState,'#ffffff');
    expect(test1).toBeUndefined();
  });
  it('should handle updateMarksAttrs',()=>{
    const mySchema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        paragraph: {
          content: 'text*',
          group: 'block',
          attrs: { styleName: { default: null } },
          parseDOM: [{ tag: 'p', getAttrs: (dom) => ({ styleName: dom.getAttribute('styleName') }) }],
          toDOM: (node) => ['p', node.attrs.styleName ? { styleName: node.attrs.styleName } : {}, 0],
        },
        text: { group: 'inline' },
      },
      marks: {
        strong: {
          parseDOM: [{ tag: 'strong' }],
          toDOM: () => ['strong'],
        },
        em: {
          parseDOM: [{ tag: 'em' }],
          toDOM: () => ['em'],
        },
        underline: {
          parseDOM: [{ tag: 'u' }],
          toDOM: () => ['u'],
        },
        strike: {
          parseDOM: [{ tag: 's' }],
          toDOM: () => ['s'],
        },
        overrideMark: {
          parseDOM: [{ tag: 'span', getAttrs: (dom) => ({ class: dom.classList.contains('override') ? 'override' : null }) }],
          toDOM: () => ['span', { class: 'override' }],
        },
      },
    });

    // JSON structure representing a ProseMirror document
    const jsonDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { styleName: 'header1' },
          content: [{ type: 'text', text: 'Heading Text', marks: [{ type: 'strong' }] }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Some emphasized text', marks: [{ type: 'em' }] }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Underlined text', marks: [{ type: 'underline' }] }],
        },
        {
          type: 'paragraph',
          attrs: { styleName: 'customStyle' },
          content: [{ type: 'text', text: 'Styled paragraph with strike', marks: [{ type: 'strike' }] }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Text with overridden mark', marks: [{ type: 'overrideMark' }] }],
        },
      ],
    };

    // Create a document node from JSON
    const docNode = mySchema.nodeFromJSON(jsonDoc);
    const test = updateMarksAttrs({name:'mark-text-highlight',create:()=>{}} as unknown as MarkType,{doc:docNode,addMark:()=>{}} as unknown as Transform,{selection:{from:0,to:1}} as unknown as EditorState,'test');
    expect(test).toBeUndefined();
  });
});
describe('addMarksToNode',()=>{
  it('should handle addMarksToNode',()=>{
    const test = addMarksToNode({addMark:()=>{}} as unknown as Transform,0,1,{create:()=>{}} as unknown as MarkType,
      {} as unknown as Record<string, unknown>,{} as unknown as Node | null,true);
      expect(test).toBeUndefined();
      const test1 = addMarksToNode({addMark:()=>{}} as unknown as Transform,0,1,{create:()=>{}} as unknown as MarkType,
      {} as unknown as Record<string, unknown>,{} as unknown as Node | null,undefined);
      expect(test1).toBeUndefined();
  });
  it('should handle addMarksToNode',()=>{
    const schema = new Schema({
      nodes: {
        doc: {
          content: 'block+',
        },
        paragraph: {
          content: 'text*',
          group: 'block',
          parseDOM: [{ tag: 'p' }],
          toDOM() {
            return ['p', 0];
          },
        },
        text: {
          group: 'inline',
        },
      },
      marks: {},
    });

    // Dummy JSON representation of a ProseMirror document
    const docJson = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
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
              text: 'This is another paragraph.',
            },
          ],
        },
      ],
    };

    // Create a document node from JSON
    const docNode = schema.nodeFromJSON(docJson);
    const test = addMarksToNode({addMark:()=>{return {addMark:()=>{return {addMark:()=>{}};}};}} as unknown as Transform,0,1,{create:()=>{}} as unknown as MarkType,
      {} as unknown as Record<string, unknown>,docNode,false);
      expect(test).toBeUndefined();
  });
  it('should handle addMarksToNode',()=>{
    const schema = new Schema({
      nodes: {
        doc: {
          content: 'block+',
        },
        paragraph: {
          content: 'text*',
          group: 'block',
          parseDOM: [{ tag: 'p' }],
          toDOM() {
            return ['p', 0];
          },
        },
        text: {
          group: 'inline',
        },
      },
      marks: {},
    });

    // Dummy JSON representation of a ProseMirror document
    const docJson = {
      type: 'doc',
      content: [
      ],
    };

    // Create a document node from JSON
    const docNode = schema.nodeFromJSON(docJson);
    const test = addMarksToNode({addMark:()=>{return {addMark:()=>{return {addMark:()=>{}};}};}} as unknown as Transform,0,1,{create:()=>{}} as unknown as MarkType,
      {} as unknown as Record<string, unknown>,docNode,false);
      expect(test).toBeDefined();
  });
  it('should handle handleTextColorMark',()=>{
    const schema = new Schema({
      nodes: {
        doc: {
          content: 'block+',
        },
        paragraph: {
          content: 'text*',
          group: 'block',
          parseDOM: [{ tag: 'p' }],
          toDOM() {
            return ['p', 0];
          },
        },
        text: {
          group: 'inline',
        },
      },
      marks: {},
    });

    // Dummy JSON representation of a ProseMirror document
    const docJson = {
      type: 'doc',
      content: [
      ],
    };

    // Create a document node from JSON
    const docNode = schema.nodeFromJSON(docJson);
    const test = handleTextColorMark({addMark:()=>{}} as unknown as Transform,{pos:0} as unknown as ResolvedPos,{create:()=>{}} as unknown as MarkType,
      {} as unknown as Record<string, unknown>,docNode,{pos:1} as unknown as ResolvedPos);
      expect(test).toBeUndefined();
      const test1 = handleTextColorMark({addMark:()=>{}} as unknown as Transform,{pos:0} as unknown as ResolvedPos,{create:()=>{}} as unknown as MarkType,
      {} as unknown as Record<string, unknown>,docNode,{pos:1} as unknown as ResolvedPos);
      expect(test1).toBeUndefined();
  });
  it('should handle handleTextColorMark',()=>{
    const schema = new Schema({
      nodes: {
        doc: {
          content: 'block+',
        },
        paragraph: {
          content: 'text*',
          group: 'block',
          parseDOM: [{ tag: 'p' }],
          toDOM() {
            return ['p', 0];
          },
        },
        text: {
          group: 'inline',
        },
      },
      marks: {},
    });

    // Dummy JSON representation of a ProseMirror document
    const docJson = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
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
              text: 'This is another paragraph.',
            },
          ],
        },
      ],
    };

    // Create a document node from JSON
    const docNode = schema.nodeFromJSON(docJson);
    const test = handleTextColorMark({addMark:()=>{}} as unknown as Transform,{pos:0} as unknown as ResolvedPos,{create:()=>{}} as unknown as MarkType,
      {} as unknown as Record<string, unknown>,docNode,{pos:1} as unknown as ResolvedPos);
      expect(test).toBeUndefined();
      const test1 = handleTextColorMark({addMark:()=>{}} as unknown as Transform,{pos:0} as unknown as ResolvedPos,{create:()=>{}} as unknown as MarkType,
      {} as unknown as Record<string, unknown>,docNode,{pos:1} as unknown as ResolvedPos);
      expect(test1).toBeUndefined();
  });
  it('should handle handleTextColorMark',()=>{
    const schema = new Schema({
      nodes: {
        doc: {
          content: 'block+',
        },
        paragraph: {
          content: 'text*',
          group: 'block',
          parseDOM: [{ tag: 'p' }],
          toDOM() {
            return ['p', 0];
          },
        },
        text: {
          group: 'inline',
        },
      },
      marks: {},
    });

    // Dummy JSON representation of a ProseMirror document
    const docJson = {
      type: 'doc',
      content: [
      ],
    };

    // Create a document node from JSON
    const docNode = schema.nodeFromJSON(docJson);
    const test = handleTextColorMark({addMark:()=>{}} as unknown as Transform,{pos:0} as unknown as ResolvedPos,{create:()=>{}} as unknown as MarkType,
      {} as unknown as Record<string, unknown>,docNode,{pos:1} as unknown as ResolvedPos);
      expect(test).toBeUndefined();
      const test1 = handleTextColorMark({addMark:()=>{}} as unknown as Transform,{pos:0} as unknown as ResolvedPos,{create:()=>{}} as unknown as MarkType,
      {} as unknown as Record<string, unknown>,docNode,{pos:1} as unknown as ResolvedPos,true);
      expect(test1).toBeUndefined();
  });
});
describe('updateToggleMarks',()=>{
  it('should handle updateToggleMarks',()=>{
    const mySchema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        paragraph: {
          content: 'text*',
          group: 'block',
          attrs: { styleName: { default: null } },
          parseDOM: [{ tag: 'p', getAttrs: (dom) => ({ styleName: dom.getAttribute('styleName') }) }],
          toDOM: (node) => ['p', node.attrs.styleName ? { styleName: node.attrs.styleName } : {}, 0],
        },
        text: { group: 'inline' },
      },
      marks: {
        strong: {
          parseDOM: [{ tag: 'strong' }],
          toDOM: () => ['strong'],
        },
        em: {
          parseDOM: [{ tag: 'em' }],
          toDOM: () => ['em'],
        },
        underline: {
          parseDOM: [{ tag: 'u' }],
          toDOM: () => ['u'],
        },
        strike: {
          parseDOM: [{ tag: 's' }],
          toDOM: () => ['s'],
        },
        overrideMark: {
          parseDOM: [{ tag: 'span', getAttrs: (dom) => ({ class: dom.classList.contains('override') ? 'override' : null }) }],
          toDOM: () => ['span', { class: 'override' }],
        },
      },
    });

    // JSON structure representing a ProseMirror document
    const jsonDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { styleName: 'header1' },
          content: [{ type: 'text', text: 'Heading Text', marks: [{ type: 'strong' }] }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Some emphasized text', marks: [{ type: 'em' }] }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Underlined text', marks: [{ type: 'underline' }] }],
        },
        {
          type: 'paragraph',
          attrs: { styleName: 'customStyle' },
          content: [{ type: 'text', text: 'Styled paragraph with strike', marks: [{ type: 'strike' }] }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Text with overridden mark', marks: [{ type: 'overrideMark' }] }],
        },
      ],
    };

    // Convert JSON into a ProseMirror document using the schema
    const docNode = mySchema.nodeFromJSON(jsonDoc);
    const test = updateToggleMarks({} as unknown as MarkType,{doc:docNode} as unknown as Transform,{selection:{from:0,to:1}} as unknown as EditorState);
    expect(test).toBeUndefined();
  });
  it('should handle updateToggleMarks',()=>{
    const mySchema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        paragraph: {
          content: 'text*',
          group: 'block',
          attrs: { lineSpacing: { default: '1.5' } },
          parseDOM: [{ tag: 'p', getAttrs: (dom) => ({ lineSpacing: dom.getAttribute('lineSpacing') || '1.5' }) }],
          toDOM: (node) => ['p', { lineSpacing: node.attrs.lineSpacing }, 0],
        },
        heading: {
          content: 'text*',
          group: 'block',
          attrs: { level: { default: 1 }, lineSpacing: { default: '2.0' } },
          parseDOM: [{ tag: 'h1', getAttrs: (dom) => ({ lineSpacing: dom.getAttribute('lineSpacing') || '2.0' }) }],
          toDOM: (node) => ['h1', { lineSpacing: node.attrs.lineSpacing }, 0],
        },
        text: { group: 'inline' },
      },
      marks: {
        override: {
          parseDOM: [{ tag: 'span', getAttrs: (dom) => ({ class: dom.classList.contains('override') ? 'override' : null }) }],
          toDOM: () => ['span', { class: 'override' }],
        },
        strong: {
          parseDOM: [{ tag: 'strong' }],
          toDOM: () => ['strong'],
        },
        em: {
          parseDOM: [{ tag: 'em' }],
          toDOM: () => ['em'],
        },
        underline: {
          parseDOM: [{ tag: 'u' }],
          toDOM: () => ['u'],
        },
        strike: {
          parseDOM: [{ tag: 's' }],
          toDOM: () => ['s'],
        },
      },
    });

    const jsonDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { lineSpacing: '1.5' },
          content: [{ type: 'text', text: 'First paragraph', marks: [{ type: 'em' }] }],
        },
        {
          type: 'heading',
          attrs: { level: 1, lineSpacing: '2.0' },
          content: [{ type: 'text', text: 'Heading with correct lineSpacing', marks: [{ type: 'override' }] }],
        },
        {
          type: 'paragraph',
          attrs: { lineSpacing: '2.0' },
          content: [
            { type: 'text', text: 'Strong and underlined text', marks: [{ type: 'strong' }, { type: 'underline' }] },
          ],
        },
      ],
    };

    // Convert JSON into a ProseMirror Node
    const docNode = mySchema.nodeFromJSON(jsonDoc);
    const test = updateToggleMarks({name:'strong'} as unknown as MarkType,{doc:docNode,addMark:()=>{return {};},removeMark:()=>{return {};}} as unknown as Transform,{selection:{from:15,to:20},schema:mySchema} as unknown as EditorState);
    expect(test).toBeUndefined();
    const test1 = updateToggleMarks({name:'em'} as unknown as MarkType,{doc:docNode,addMark:()=>{return {};},removeMark:()=>{return {};}} as unknown as Transform,{selection:{from:15,to:20},schema:mySchema} as unknown as EditorState);
    expect(test1).toBeUndefined();
    const test2 = updateToggleMarks({name:'underline'} as unknown as MarkType,{doc:docNode,addMark:()=>{return {};},removeMark:()=>{return {};}} as unknown as Transform,{selection:{from:15,to:20},schema:mySchema} as unknown as EditorState);
    expect(test2).toBeUndefined();
    const test3 = updateToggleMarks({name:'strike'} as unknown as MarkType,{doc:docNode,addMark:()=>{return {};},removeMark:()=>{return {};}} as unknown as Transform,{selection:{from:15,to:20},schema:mySchema} as unknown as EditorState);
    expect(test3).toBeUndefined();
  });





  it('should handle updateToggleMarks',()=>{
    const mySchema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        paragraph: {
          content: 'text*',
          group: 'block',
          attrs: { styleName: { default: null } },
          parseDOM: [{ tag: 'p', getAttrs: (dom) => ({ styleName: dom.getAttribute('styleName') }) }],
          toDOM: (node) => ['p', node.attrs.styleName ? { styleName: node.attrs.styleName } : {}, 0],
        },
        text: { group: 'inline' },
      },
      marks: {
        strong: {
          parseDOM: [{ tag: 'strong' }],
          toDOM: () => ['strong'],
        },
        em: {
          parseDOM: [{ tag: 'em' }],
          toDOM: () => ['em'],
        },
        underline: {
          parseDOM: [{ tag: 'u' }],
          toDOM: () => ['u'],
        },
        strike: {
          parseDOM: [{ tag: 's' }],
          toDOM: () => ['s'],
        },
        overrideMark: {
          parseDOM: [{ tag: 'span', getAttrs: (dom) => ({ class: dom.classList.contains('override') ? 'override' : null }) }],
          toDOM: () => ['span', { class: 'override' }],
        },
      },
    });

    // JSON structure representing a ProseMirror document
    const jsonDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { styleName: 'header1' },
          content: [{ type: 'text', text: 'Heading Text', marks: [{ type: 'strong' }] }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Some emphasized text', marks: [{ type: 'em' }] }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Underlined text', marks: [{ type: 'underline' }] }],
        },
        {
          type: 'paragraph',
          attrs: { styleName: 'customStyle' },
          content: [{ type: 'text', text: 'Styled paragraph with strike', marks: [{ type: 'strike' }] }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Text with overridden mark', marks: [{ type: 'overrideMark' }] }],
        },
      ],
    };

    // Convert JSON into a ProseMirror document using the schema
    const docNode = mySchema.nodeFromJSON(jsonDoc);
    const test = updateToggleMarks({} as unknown as MarkType,{doc:docNode} as unknown as Transform,{selection:{from:0,to:1}} as unknown as EditorState);
    expect(test).toBeUndefined();
  });
  it('should handle updateToggleMarks when node is not paragraph',()=>{
    const mySchema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        blockText: {
          content: 'text*',
          group: 'block',
          attrs: { styleName: { default: null } },
          parseDOM: [{ tag: 'div', getAttrs: (dom) => ({ styleName: dom.getAttribute('styleName') }) }],
          toDOM: (node) => ['div', node.attrs.styleName ? { styleName: node.attrs.styleName } : {}, 0],
        },
        text: { group: 'inline' },
      },
      marks: {
        strong: {
          parseDOM: [{ tag: 'strong' }],
          toDOM: () => ['strong'],
        },
        em: {
          parseDOM: [{ tag: 'em' }],
          toDOM: () => ['em'],
        },
        underline: {
          parseDOM: [{ tag: 'u' }],
          toDOM: () => ['u'],
        },
        strike: {
          parseDOM: [{ tag: 's' }],
          toDOM: () => ['s'],
        },
        overrideMark: {
          parseDOM: [{ tag: 'span', getAttrs: (dom) => ({ class: dom.classList.contains('override') ? 'override' : null }) }],
          toDOM: () => ['span', { class: 'override' }],
        },
      },
    });

    // JSON structure representing a ProseMirror document without paragraphs
    const jsonDoc = {
      type: 'doc',
      content: [
        {
          type: 'blockText',
          attrs: { styleName: 'header1' },
          content: [{ type: 'text', text: 'Heading Text', marks: [{ type: 'strong' }] }],
        },
        {
          type: 'blockText',
          content: [{ type: 'text', text: 'Some emphasized text', marks: [{ type: 'em' }] }],
        },
        {
          type: 'blockText',
          content: [{ type: 'text', text: 'Underlined text', marks: [{ type: 'underline' }] }],
        },
        {
          type: 'blockText',
          attrs: { styleName: 'customStyle' },
          content: [{ type: 'text', text: 'Styled block with strike', marks: [{ type: 'strike' }] }],
        },
        {
          type: 'blockText',
          content: [{ type: 'text', text: 'Text with overridden mark', marks: [{ type: 'overrideMark' }] }],
        },
      ],
    };

    // Convert JSON into a ProseMirror document using the schema
    const docNode = mySchema.nodeFromJSON(jsonDoc);
    const test = updateToggleMarks({name:'strong'} as unknown as MarkType,{doc:docNode,addMark:()=>{}} as unknown as Transform,{schema:mySchema,selection:{from:0,to:1}} as unknown as EditorState);
    expect(test).toBeUndefined();
    const test1 = updateToggleMarks({name:'em'} as unknown as MarkType,{doc:docNode,addMark:()=>{}} as unknown as Transform,{schema:mySchema,selection:{from:0,to:1}} as unknown as EditorState);
    expect(test1).toBeUndefined();
    const test2 = updateToggleMarks({name:'underline'} as unknown as MarkType,{doc:docNode,addMark:()=>{}} as unknown as Transform,{schema:mySchema,selection:{from:0,to:1}} as unknown as EditorState);
    expect(test2).toBeUndefined();
    const test3 = updateToggleMarks({name:'strike'} as unknown as MarkType,{doc:docNode,addMark:()=>{}} as unknown as Transform,{schema:mySchema,selection:{from:0,to:1}} as unknown as EditorState);
    expect(test3).toBeUndefined();
  });
});
