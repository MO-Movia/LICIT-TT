import {toggleHeading,setHeadingNode} from './toggleHeading';
import {Node, Schema} from 'prosemirror-model';
import {Transform} from 'prosemirror-transform';
import {BLOCKQUOTE, HEADING, LIST_ITEM, PARAGRAPH} from './NodeNames';
import * as isListNode from './isListNode';
import * as isInsideListItem from './isInsideListItem';

describe('toggleHeading', () => {
  let trr;
  beforeEach(() => {
    trr = document.createElement('tr');
    trr.innerHTML = '<td>Cell 1</td><td>Cell 2</td><td>Cell 3</td>';
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

  it('should be return tr', () => {
    const tr = {} as unknown as Transform;
    const sc = {
      nodes: {
        blockquote: BLOCKQUOTE,
        heading: HEADING,
        paragraph: PARAGRAPH,
        list_item: LIST_ITEM,
      },
    } as unknown as Schema;
    const test = toggleHeading(tr, sc, 1);
    expect(test).toStrictEqual({});
  });

  it('should be check the condition nodeType === blockquote', () => {
    const tr = {
      selection: {from: 2, to: 4},
      doc: dummyDoc,
    } as unknown as Transform;
    const sc = {
      nodes: {
        blockquote: BLOCKQUOTE,
        heading: HEADING,
        paragraph: PARAGRAPH,
        list_item: LIST_ITEM,
      },
    } as unknown as Schema;
    const test = toggleHeading(tr, sc, 1);
    expect(test).toBeDefined();
  });

  it('should be check the condition isInsideListItem(tr.doc, pos)', () => {
    const tr = {
      selection: {from: 2, to: 4},
      doc: dummyDoc,
      nodeAt: (_a) => {
        return undefined;
      },
    } as unknown as Transform;
    const sc = {
      nodes: {
        heading: HEADING,
        blockquote: BLOCKQUOTE,
        paragraph: PARAGRAPH,
        list_item: LIST_ITEM,
      },
    } as unknown as Schema;
    jest
      .spyOn(isListNode, 'isListNode')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true) as unknown as Node;
    jest
      .spyOn(isInsideListItem, 'isInsideListItem')
      .mockReturnValue(true) as unknown as Node;
    const test = toggleHeading(tr, sc, 0);
    expect(test).toBeDefined();
  });
  it('should be check the condition level !== null', () => {
    const tr = {
      selection: {from: 2, to: 4},
      doc: dummyDoc,
      nodeAt: (_a) => {
        return undefined;
      },
      getMeta: (_a) => {
        return 'dryrun';
      },
    } as unknown as Transform;
    const sc = {
      nodes: {
        heading: HEADING,
        blockquote: BLOCKQUOTE,
        paragraph: PARAGRAPH,
        list_item: LIST_ITEM,
      },
    } as unknown as Schema;
    jest
      .spyOn(isInsideListItem, 'isInsideListItem')
      .mockReturnValue(false) as unknown as Node;
    jest
      .spyOn(isListNode, 'isListNode')
      .mockReturnValue(true)
      .mockReturnValue(true) as unknown as Node;
    const test = toggleHeading(tr, sc, 0);
    expect(test).toBeDefined();
  });

  it('should be check the condition (pos >= tr.doc.content.size) inside the setHeadingNode() function', () => {
    const tr = {doc: {content: {size: 1}}} as unknown as Transform;
    const sc = {
      nodes: {
        heading: HEADING,
        paragraph: PARAGRAPH,
        'blockquote ': BLOCKQUOTE,
      },
    } as unknown as Schema;
    const test = setHeadingNode(tr, sc, 1);
    expect(test).toBeTruthy();
  });

  it('should be check the condition (!node || !heading || !paragraph || !blockquote) inside the setHeadingNode() function', () => {
    const tr = {
      doc: {
        content: {size: 2},
        nodeAt: (_a) => {
          return undefined;
        },
      },
    } as unknown as Transform;
    const sc = {
      nodes: {
        heading: undefined,
        paragraph: undefined,
        'blockquote ': undefined,
      },
    } as unknown as Schema;
    const test = setHeadingNode(tr, sc, 1);
    expect(test).toBeTruthy();
  });
});
