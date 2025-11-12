import { Mark, Node, Schema } from 'prosemirror-model';
import { clearHeading, clearMarks, comapreMarks, extractParagraphs } from './clearMarks';
import { EditorState, TextSelection } from 'prosemirror-state';
import { doc, p } from 'prosemirror-test-builder';
import { Transform } from 'prosemirror-transform';
import { MARK_EM, MARK_FONT_SIZE, MARK_STRONG } from './MarkNames';
import { BLOCKQUOTE, HEADING, LIST_ITEM, PARAGRAPH } from './NodeNames';
import { Style } from './runtime.service';

describe('clearMarks', () => {
  const mySchema = new Schema({
    nodes: {
      doc: {
        attrs: { lineSpacing: { default: 'test' } },
        content: 'block+',
      },
      paragraph: {
        attrs: { lineSpacing: { default: 'test' } },
        content: 'text*',
        group: 'block',
      },
      heading: {
        attrs: { lineSpacing: { default: 'test' } },
        content: 'text*',
        group: 'block',
        defining: true,
      },
      bullet_list: {
        content: 'list_item+',
        group: 'block',
      },
      list_item: {
        attrs: { lineSpacing: { default: 'test' } },
        content: 'paragraph',
        defining: true,
      },
      blockquote: {
        attrs: { lineSpacing: { default: 'test' } },
        content: 'block+',
        group: 'block',
      },
      text: {
        inline: true,
      },
    },
  });
  const dummyDoc = mySchema.node('doc', null, [
    mySchema.node('heading', { marks: [] }, [mySchema.text('Heading 1')]),
    mySchema.node('paragraph', { marks: [] }, [
      mySchema.text('This is a paragraph'),
    ]),
    mySchema.node('bullet_list', { marks: [] }, [
      mySchema.node('list_item', { marks: [] }, [
        mySchema.node('paragraph', { marks: [] }, [mySchema.text('List item 1')]),
      ]),
      mySchema.node('list_item', { marks: [] }, [
        mySchema.node('paragraph', { marks: [] }, [mySchema.text('List item 2')]),
      ]),
    ]),
    mySchema.node('blockquote', { marks: [] }, [
      mySchema.node('paragraph', { marks: [] }, [
        mySchema.text('This is a blockquote'),
      ]),
    ]),
  ]);
  it('should push nodes with specific marks into tasks array', () => {
    const tr = {
      doc: dummyDoc,
      selection: { from: 0, to: 1 },
    } as unknown as Transform;
    const clearmarks = clearMarks(tr, mySchema);
    expect(clearmarks).toBe(tr);
  });
  it('should push nodes with specific marks into tasks array', () => {
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

    // JSON structure representing a ProseMirror document
    const jsonDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { styleName: 'header1' },
          content: [{ type: 'text', text: 'Text with overridden mark', marks: [{ type: 'strong' }] }],
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
          content: [{ type: 'text', text: 'Text with overridden mark', marks: [{ type: 'override' }] }],
        },
      ],
    };
    const docNode = mySchema.nodeFromJSON(jsonDoc);
    const tr = {
      doc: docNode,
      selection: { from: 3, to: 4 },
      removeMark: () => { return {}; }
    } as unknown as Transform;
    const clearmarks = clearMarks(tr, mySchema);
    expect(clearmarks).toBe(tr);
  });
  it('should push nodes with specific marks into tasks array', () => {
    const mySchema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        paragraph: {
          content: 'text*',
          group: 'block',
          attrs: { styleName: { default: null } },
          parseDOM: [
            {
              tag: 'p',
              getAttrs: (dom) => ({ styleName: dom.getAttribute('styleName') }),
            },
          ],
          toDOM: (node) => [
            'p',
            node.attrs.styleName ? { styleName: node.attrs.styleName } : {},
            0,
          ],
        },
        text: { group: 'inline' },
      },
      marks: {
        override: {
          parseDOM: [
            {
              tag: 'span',
              getAttrs: (dom) => ({
                class: dom.classList.contains('override') ? 'override' : null,
              }),
            },
          ],
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

    // JSON structure representing a ProseMirror document
    const jsonDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { styleName: 'header1' },
          content: [
            {
              type: 'text',
              text: 'Text with overridden mark',
              marks: [{ type: 'strong' }],
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Some emphasized text',
              marks: [{ type: 'em' }],
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Underlined text',
              marks: [{ type: 'underline' }],
            },
          ],
        },
        {
          type: 'paragraph',
          attrs: { styleName: 'customStyle' },
          content: [
            {
              type: 'text',
              text: 'Styled paragraph with strike',
              marks: [{ type: 'strike' }],
            },
          ],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Text with overridden mark',
              marks: [{ type: 'override' }],
            },
          ],
        },
      ],
    };

    // Create the document node from JSON
    const docNode = mySchema.nodeFromJSON(jsonDoc);
    const tr = {
      doc: docNode,
      selection: { from: 0, to: 20 },
      removeMark: () => { return {}; }
    } as unknown as Transform;
    const clearmarks = clearMarks(tr, mySchema);
    expect(clearmarks).toBe(tr);
  });

  it('it should return a transform when doc and selection are not present', () => {
    const schema1 = new Schema({
      nodes: {
        doc: { content: 'paragraph+' },
        paragraph: {
          content: 'text*',
          toDOM() {
            return ['p', 0];
          },
        },
        text: {},
      },
    });
    const tr = {} as unknown as Transform;
    const clearmarks = clearMarks(tr, schema1);
    expect(clearmarks).toBe(tr);
  });

  it('it should return a transform', () => {
    const schema1 = new Schema({
      nodes: {
        doc: { content: 'paragraph+' },
        paragraph: {
          content: 'text*',
          toDOM() {
            return ['p', 0];
          },
        },
        text: {},
      },
    });
    const tr = { doc: {}, selection: { from: 0, to: 1 } } as unknown as Transform;
    const clearmarks = clearMarks(tr, schema1);
    expect(clearmarks).toBe(tr);
  });

  describe('clearHeading', () => {
    it('should return the original transform if both selection and doc are null', () => {
      const schema1 = new Schema({
        nodes: {
          doc: { content: 'paragraph+' },
          paragraph: {
            content: 'text*',
            toDOM() {
              return ['p', 0];
            },
          },
          text: {},
        },
      });

      const tr = {} as unknown as Transform;
      const transformedTr = clearHeading(tr, schema1);
      expect(transformedTr).toBe(tr);
    });

    it('should return the original transform if selection is empty', () => {
      const schema1 = new Schema({
        nodes: {
          doc: { content: 'paragraph+' },
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
      const transformedTr = clearHeading(tr, schema1);
      expect(transformedTr).toBe(tr);
    });

    it('should return the original transform if selection is not empty', () => {
      const schema1 = new Schema({
        nodes: {
          doc: { content: 'paragraph+' },
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
      tr.setSelection(TextSelection.create(state.doc, 0, 5));
      const transformedTr = clearHeading(tr, schema1);

      expect(transformedTr).toBe(tr);
    });
    it('should push nodes of specified type into tasks array', () => {
      const tr = {
        doc: dummyDoc,
        selection: { from: 0, to: 1 },
        setNodeMarkup: () => {
          return { key: 'mockTransaction' };
        },
      } as unknown as Transform;
      const clearheading = clearHeading(tr, mySchema);
      expect(clearheading).toStrictEqual({ key: 'mockTransaction' });
    });

    it('should check the condition !tasks.length', () => {
      const tr = {
        doc: dummyDoc,
        selection: { from: 1, to: 2 },
      } as unknown as Transform;

      const sc = {
        marks: { 'mark-font-size': MARK_FONT_SIZE },
        nodes: {
          blockquote: BLOCKQUOTE,
          heading: HEADING,
          paragraph: PARAGRAPH,
          list_item: LIST_ITEM,
        },
      } as unknown as Schema;
      const clearmarks = clearMarks(tr, sc);
      expect(clearmarks).toBeTruthy();
    });

    it('should check the condition markTypesToRemove.has(mark.type) == false', () => {
      const mySchema = new Schema({
        nodes: {
          doc: {
            content: 'block+',
          },
          paragraph: {
            content: 'text*',
            group: 'block',
          },
          heading: {
            attrs: { level: { default: 1 } },
            content: 'text*',
            group: 'block',
            defining: true,
          },
          bullet_list: {
            content: 'list_item+',
            group: 'block',
          },
          list_item: {
            content: 'paragraph',
            defining: true,
          },
          blockquote: {
            content: 'block+',
            group: 'block',
          },
          text: {
            inline: true,
          },
        },
        marks: {
          strong: {},
          em: {},
        },
      });

      const docStructure = mySchema.node('doc', null, [
        mySchema.node('heading', { level: 1 }, [
          mySchema.text('Heading 1', [mySchema.marks.strong.create()]),
        ]),
        mySchema.node('paragraph', null, [
          mySchema.text('This is a paragraph', [mySchema.marks.em.create()]),
        ]),
        mySchema.node('bullet_list', null, [
          mySchema.node('list_item', null, [
            mySchema.node('paragraph', null, [
              mySchema.text('List item 1', [
                mySchema.marks.strong.create(),
                mySchema.marks.em.create(),
              ]),
            ]),
          ]),
          mySchema.node('list_item', null, [
            mySchema.node('paragraph', null, [mySchema.text('List item 2')]),
          ]),
        ]),
        mySchema.node('blockquote', null, [
          mySchema.node('paragraph', null, [
            mySchema.text('This is a blockquote', [
              mySchema.marks.strong.create(),
            ]),
          ]),
        ]),
      ]);

      const tr = {
        doc: docStructure,
        selection: { from: 1, to: 2 },
      } as unknown as Transform;

      const sc = {
        marks: {
          'mark-font-size': MARK_FONT_SIZE,
          strong: MARK_STRONG,
          em: MARK_EM,
        },
        nodes: {
          blockquote: BLOCKQUOTE,
          heading: HEADING,
          paragraph: PARAGRAPH,
          list_item: LIST_ITEM,
        },
      } as unknown as Schema;
      const clearmarks = clearMarks(tr, sc);
      expect(clearmarks).toBeTruthy();
    });
  });
});
describe('comapreMarks', () => {
  it('should handle comapreMarks', () => {
    const test = comapreMarks({ styles: { 'em': [] } } as unknown as Style, { attrs: {}, type: { name: 'em' } } as unknown as Mark, {}, 0, {} as unknown as Node, {} as unknown as Schema);
    expect(test).toBeDefined();
    const test9 = comapreMarks({ styles: { 'em': false } } as unknown as Style, { attrs: {}, type: { name: 'em' } } as unknown as Mark, {}, 0, {} as unknown as Node, {} as unknown as Schema);
    expect(test9).toBeDefined();
    const test1 = comapreMarks({ styles: { 'mark-text-color': [] } } as unknown as Style, { attrs: {}, type: { name: 'mark-text-color' } } as unknown as Mark, {}, 0, {} as unknown as Node, {} as unknown as Schema);
    expect(test1).toBeDefined();
    const test1a = comapreMarks({ styles: { 'mark-text-color': [], 'color': true } } as unknown as Style, { attrs: {}, type: { name: 'mark-text-color' } } as unknown as Mark, {}, 0, {} as unknown as Node, {} as unknown as Schema);
    expect(test1a).toBeDefined();
    const test2 = comapreMarks({ styles: { 'mark-font-size': [] } } as unknown as Style, { attrs: {}, type: { name: 'mark-font-size' } } as unknown as Mark, {}, 0, {} as unknown as Node, {} as unknown as Schema);
    expect(test2).toBeDefined();
    const test2a = comapreMarks({ styles: { 'mark-font-size': [], 'fontSize': true } } as unknown as Style, { attrs: {}, type: { name: 'mark-font-size' } } as unknown as Mark, {}, 0, {} as unknown as Node, {} as unknown as Schema);
    expect(test2a).toBeDefined();
    const test3 = comapreMarks({ styles: { 'mark-font-type': [] } } as unknown as Style, { attrs: {}, type: { name: 'mark-font-type' } } as unknown as Mark, {}, 0, {} as unknown as Node, {} as unknown as Schema);
    expect(test3).toBeDefined();
    const test3a = comapreMarks({ styles: { 'mark-font-type': [], 'fontName': true } } as unknown as Style, { attrs: {}, type: { name: 'mark-font-type' } } as unknown as Mark, {}, 0, {} as unknown as Node, {} as unknown as Schema);
    expect(test3a).toBeDefined();
    const test4 = comapreMarks({ styles: { 'strike': [] } } as unknown as Style, { attrs: {}, type: { name: 'strike' } } as unknown as Mark, {}, 0, {} as unknown as Node, {} as unknown as Schema);
    expect(test4).toBeDefined();
    const test5 = comapreMarks({ styles: { 'super': [] } } as unknown as Style, { attrs: {}, type: { name: 'super' } } as unknown as Mark, {}, 0, {} as unknown as Node, {} as unknown as Schema);
    expect(test5).toBeDefined();
    const test6 = comapreMarks({ styles: { 'mark-text-highlight': [] } } as unknown as Style, { attrs: {}, type: { name: 'mark-text-highlight' } } as unknown as Mark, {}, 0, {} as unknown as Node, {} as unknown as Schema);
    expect(test6).toBeDefined();
    const test6a = comapreMarks({ styles: { 'mark-text-highlight': [], 'textHighlight': true } } as unknown as Style, { attrs: {}, type: { name: 'mark-text-highlight' } } as unknown as Mark, {}, 0, {} as unknown as Node, {} as unknown as Schema);
    expect(test6a).toBeDefined();
    const test7 = comapreMarks({ styles: { 'underline': [] } } as unknown as Style, { attrs: {}, type: { name: 'underline' } } as unknown as Mark, {}, 0, {} as unknown as Node, {} as unknown as Schema);
    expect(test7).toBeDefined();
    const test8 = comapreMarks({ styles: { 'test': [] } } as unknown as Style, { attrs: {}, type: { name: 'test' } } as unknown as Mark, {}, 0, {} as unknown as Node, {} as unknown as Schema);
    expect(test8).toBeDefined();
  });
  it('should handle comapreMarks', () => {
    const test = comapreMarks({ styles: { 'em': [] } } as unknown as Style, { attrs: { overridden: true }, type: { name: 'em' } } as unknown as Mark, [], 0, {} as unknown as Node, { marks: {} } as unknown as Schema);
    expect(test).toBeDefined();
    const test1 = comapreMarks({ styles: { '': [] } } as unknown as Style, { attrs: { overridden: true }, type: { name: 'mark-text-color' } } as unknown as Mark, [], 0, {} as unknown as Node, { marks: {} } as unknown as Schema);
    expect(test1).toBeDefined();
    const test2 = comapreMarks({ styles: { '': [] } } as unknown as Style, { attrs: { overridden: true }, type: { name: 'mark-font-size' } } as unknown as Mark, [], 0, {} as unknown as Node, { marks: {} } as unknown as Schema);
    expect(test2).toBeDefined();
    const test3 = comapreMarks({ styles: { '': [] } } as unknown as Style, { attrs: { overridden: true }, type: { name: 'mark-font-type' } } as unknown as Mark, [], 0, {} as unknown as Node, { marks: {} } as unknown as Schema);
    expect(test3).toBeDefined();
    const test4 = comapreMarks({ styles: { '': [] } } as unknown as Style, { attrs: { overridden: true }, type: { name: 'strike' } } as unknown as Mark, [], 0, {} as unknown as Node, { marks: {} } as unknown as Schema);
    expect(test4).toBeDefined();
    const test5 = comapreMarks({ styles: { '': [] } } as unknown as Style, { attrs: { overridden: true }, type: { name: 'super' } } as unknown as Mark, [], 0, {} as unknown as Node, { marks: {} } as unknown as Schema);
    expect(test5).toBeDefined();
    const test6 = comapreMarks({ styles: { '': [] } } as unknown as Style, { attrs: { overridden: true }, type: { name: 'mark-text-highlight' } } as unknown as Mark, [], 0, {} as unknown as Node, { marks: {} } as unknown as Schema);
    expect(test6).toBeDefined();
    const test7 = comapreMarks({ styles: { '': [] } } as unknown as Style, { attrs: { overridden: true }, type: { name: 'underline' } } as unknown as Mark, [], 0, {} as unknown as Node, { marks: {} } as unknown as Schema);
    expect(test7).toBeDefined();
    const test8 = comapreMarks({ styles: { '': [] } } as unknown as Style, { attrs: { overridden: true }, type: { name: 'test' } } as unknown as Mark, [], 0, {} as unknown as Node, { marks: {} } as unknown as Schema);
    expect(test8).toBeDefined();
  });
  // it('should handle extractParagraphs',()=>{
  //   expect(extractParagraphs({attrs:{styleName:null},type:{name:'paragraph'}},[],[])).toBeUndefined();
  // })
  // it('should handle extractParagraphs when styleName is not null or normal',()=>{
  //   expect(extractParagraphs({attrs:{styleName:'test'},type:{name:'paragraph'}},[],[])).toBeUndefined();
  // })
  // it('should handle extractParagraphs when node.type.name is not paragraph',()=>{
  //   expect(extractParagraphs({content:[],attrs:{styleName:'test'},type:{name:'heading'}},[],[])).toBeUndefined();
  // })



  // describe('extractParagraphs', () => {
  it('should add paragraph to normalParagraphs when styleName is null', () => {
    const normalParagraphs= [];
    const otherParagraphs= [];
    extractParagraphs(
      { attrs: { styleName: null }, type: { name: 'paragraph' } } as unknown as Node,
      normalParagraphs,
      otherParagraphs
    );

    expect(normalParagraphs).toHaveLength(1);
    expect(otherParagraphs).toHaveLength(0);
  });

  it('should add paragraph to normalParagraphs when styleName is "Normal"', () => {
    const normalParagraphs= [];
    const otherParagraphs= [];
    extractParagraphs(
      { attrs: { styleName: 'Normal' }, type: { name: 'paragraph' } } as unknown as Node,
      normalParagraphs,
      otherParagraphs
    );

    expect(normalParagraphs).toHaveLength(1);
    expect(otherParagraphs).toHaveLength(0);
  });

  it('should add paragraph to otherParagraphs when styleName is not "Normal" or null', () => {
    const normalParagraphs = [];
    const otherParagraphs = [];
    extractParagraphs(
      { attrs: { styleName: 'test' }, type: { name: 'paragraph' } } as unknown as Node,
      normalParagraphs,
      otherParagraphs
    );

    expect(normalParagraphs).toHaveLength(0);
    expect(otherParagraphs).toHaveLength(1);
  });

  it('should recursively extract paragraphs from child nodes', () => {
    const normalParagraphs = [];
    const otherParagraphs = [];
    extractParagraphs(
      {
        type: { name: 'doc' },
        content: [
          { attrs: { styleName: 'Normal' }, type: { name: 'paragraph' } },
          { attrs: { styleName: 'test' }, type: { name: 'paragraph' } },
        ],
      } as unknown as Node,
      normalParagraphs,
      otherParagraphs
    );

    expect(normalParagraphs).toHaveLength(1);
    expect(otherParagraphs).toHaveLength(1);
  });

  it('should do nothing if node.type.name is not "paragraph" and has no content', () => {
    const normalParagraphs = [];
    const otherParagraphs = [];
    extractParagraphs(
      { content: [], attrs: { styleName: 'test' }, type: { name: 'heading' } } as unknown as Node,
      normalParagraphs,
      otherParagraphs
    );

    expect(normalParagraphs).toHaveLength(0);
    expect(otherParagraphs).toHaveLength(0);
  });
  // });

});