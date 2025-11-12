import {Schema, Node} from 'prosemirror-model';
import {transformAndPreserveTextSelection} from './transformAndPreserveTextSelection';
import {Transform} from 'prosemirror-transform';
import * as amark from './applyMark';
import {uuid} from './ui/uuid';

describe('transformAndPreserveTextSelection', () => {
  const mySchema = new Schema({
    nodes: {
      doc: {content: 'paragraph*'},
      paragraph: {content: 'text*'},
      text: {inline: true},
    },
  });
  const initialDocContent = [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: `[\u200b\u2800PLACEHOLDER_TEXT_${uuid()}\u2800\u200b]`,
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: `[\u200b\u2800PLACEHOLDER_TEXT_${uuid()}\u2800\u200b]`,
        },
      ],
    },
  ];

  const initialDoc = mySchema.nodeFromJSON({
    type: 'doc',
    content: initialDocContent,
  });
  it('should handle transformAndPreserveTextSelection when getMeta return true', () => {
    const test = transformAndPreserveTextSelection(
      {
        getMeta: () => {
          return true;
        },
        selection: {},
        doc: {},
      } as unknown as Transform,
      {marks: {'mark-text-selection': ''}} as unknown as Schema,
      () => {
        return {} as unknown as Transform;
      }
    );
    expect(test).toBeDefined();
  });
  it('should handle transformAndPreserveTextSelection when getMeta return false and when !markType ', () => {
    const test = transformAndPreserveTextSelection(
      {
        getMeta: () => {
          return false;
        },
        selection: {from: 0, to: 1},
        doc: {},
      } as unknown as Transform,
      {marks: {'mark-text-selection': false}} as unknown as Schema,
      () => {
        return {} as unknown as Transform;
      }
    );
    expect(test).toBeDefined();
  });
  it('should handle transformAndPreserveTextSelection when getMeta return false and when from and to =0', () => {
    const test = transformAndPreserveTextSelection(
      {
        getMeta: () => {
          return false;
        },
        selection: {from: 0, to: 0},
        doc: {},
      } as unknown as Transform,
      {marks: {'mark-text-selection': {}}} as unknown as Schema,
      () => {
        return {} as unknown as Transform;
      }
    );
    expect(test).toBeDefined();
  });
  it('should handle transformAndPreserveTextSelection when getMeta return false and when from and to =1', () => {
    jest.spyOn(amark, 'applyMark').mockReturnValue({
      getMeta: () => {
        return false;
      },
      selection: {from: 1, to: 1},
      doc: initialDoc,
      setSelection: () => {
        return {doc: initialDoc};
      },
    } as unknown as Transform);
    const test = transformAndPreserveTextSelection(
      {
        getMeta: () => {
          return false;
        },
        selection: {from: 1, to: 1},
        doc: initialDoc,
        setSelection: () => {
          return {
            getMeta: () => {
              return false;
            },
            selection: {from: 1, to: 1},
            doc: initialDoc,
          } as unknown as Transform;
        },
      } as unknown as Transform,
      {marks: {'mark-text-selection': {}}} as unknown as Schema,
      () => {
        return {
          getMeta: () => {
            return false;
          },
          selection: {from: 1, to: 1},
          doc: initialDoc,
          setSelection: () => {
            return {doc: initialDoc};
          },
          removeMark: () => {
            return {
              getMeta: () => {
                return false;
              },
              selection: {from: 1, to: 1},
              doc: initialDoc,
              setSelection: () => {
                return {doc: initialDoc};
              },
              removeMark: () => {
                return {};
              },
            } as unknown as Transform;
          },
        } as unknown as Transform;
      }
    );
    expect(test).toBeDefined();
  });
  it('should handle transformAndPreserveTextSelection when getMeta return false and when from and to =1 and when !currentNode &&prevNode &&prevNode.type.name === PARAGRAPH &&!prevNode.firstChild', () => {
    jest.spyOn(amark, 'applyMark').mockReturnValue({
      getMeta: () => {
        return false;
      },
      selection: {from: 1, to: 1},
      doc: initialDoc,
      setSelection: () => {
        return {doc: initialDoc};
      },
    } as unknown as Transform);
    const tr1 = {
      insert: () => {
        return {
          insert: () => {
            return {};
          },
          getMeta: () => {
            return false;
          },
          selection: {from: 1, to: 1},
          doc: initialDoc,
          setSelection: () => {
            return {
              getMeta: () => {
                return false;
              },
              selection: {from: 1, to: 1},
              doc: initialDoc,
            } as unknown as Transform;
          },
        } as unknown as Transform;
      },
      getMeta: () => {
        return false;
      },
      selection: {from: 1, to: 1},
      doc: initialDoc,
      setSelection: () => {
        return {
          getMeta: () => {
            return false;
          },
          selection: {from: 1, to: 1},
          doc: initialDoc,
        } as unknown as Transform;
      },
    } as unknown as Transform;
    jest
      .spyOn(tr1.doc, 'nodeAt')
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce({type: {name: 'paragraph'}} as unknown as Node);

    const mySchema = new Schema({
      nodes: {
        doc: {content: 'text*'},
        text: {inline: true},
      },
    });
    const textNode = mySchema.text('This is a placeholder text node.');
    const test = transformAndPreserveTextSelection(
      tr1,
      {
        marks: {'mark-text-selection': {}},
        text: () => {
          return textNode;
        },
      } as unknown as Schema,
      () => {
        return {
          getMeta: () => {
            return false;
          },
          selection: {from: 1, to: 1},
          doc: initialDoc,
          setSelection: () => {
            return {doc: initialDoc};
          },
          removeMark: () => {
            return {
              getMeta: () => {
                return false;
              },
              selection: {from: 1, to: 1},
              doc: initialDoc,
              setSelection: () => {
                return {doc: initialDoc};
              },
              removeMark: () => {
                return {};
              },
            } as unknown as Transform;
          },
        } as unknown as Transform;
      }
    );
    expect(test).toBeDefined();
  });
  it('should handle transformAndPreserveTextSelection when getMeta return false and when from and to =1 and when !currentNode &&prevNode &&prevNode.type.name === TEXT &&!prevNode.firstChild', () => {
    jest.spyOn(amark, 'applyMark').mockReturnValue({
      getMeta: () => {
        return false;
      },
      selection: {from: 1, to: 1},
      doc: initialDoc,
      setSelection: () => {
        return {doc: initialDoc};
      },
    } as unknown as Transform);
    const tr1 = {
      insert: () => {
        return {
          insert: () => {
            return {};
          },
          getMeta: () => {
            return false;
          },
          selection: {from: 1, to: 1},
          doc: initialDoc,
          setSelection: () => {
            return {
              getMeta: () => {
                return false;
              },
              selection: {from: 1, to: 1},
              doc: initialDoc,
            } as unknown as Transform;
          },
        } as unknown as Transform;
      },
      getMeta: () => {
        return false;
      },
      selection: {from: 1, to: 1},
      doc: initialDoc,
      setSelection: () => {
        return {
          getMeta: () => {
            return false;
          },
          selection: {from: 1, to: 1},
          doc: initialDoc,
        } as unknown as Transform;
      },
    } as unknown as Transform;
    jest
      .spyOn(tr1.doc, 'nodeAt')
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce({type: {name: 'text'}} as unknown as Node);

    const mySchema = new Schema({
      nodes: {
        doc: {content: 'text*'},
        text: {inline: true},
      },
    });
    const textNode = mySchema.text('This is a placeholder text node.');
    const test = transformAndPreserveTextSelection(
      tr1,
      {
        marks: {'mark-text-selection': {}},
        text: () => {
          return textNode;
        },
      } as unknown as Schema,
      () => {
        return {
          getMeta: () => {
            return false;
          },
          selection: {from: 1, to: 1},
          doc: initialDoc,
          setSelection: () => {
            return {doc: initialDoc};
          },
          removeMark: () => {
            return {
              getMeta: () => {
                return false;
              },
              selection: {from: 1, to: 1},
              doc: initialDoc,
              setSelection: () => {
                return {doc: initialDoc};
              },
              removeMark: () => {
                return {};
              },
            } as unknown as Transform;
          },
        } as unknown as Transform;
      }
    );
    expect(test).toBeDefined();
  });
  it('should handle transformAndPreserveTextSelection when getMeta return false and when from and to =1 and when prevNode && currentNode && currentNode.type === prevNode.type', () => {
    jest.spyOn(amark, 'applyMark').mockReturnValue({
      getMeta: () => {
        return false;
      },
      selection: {from: 1, to: 1},
      doc: initialDoc,
      setSelection: () => {
        return {doc: initialDoc};
      },
    } as unknown as Transform);
    const tr1 = {
      insert: () => {
        return {
          insert: () => {
            return {};
          },
          getMeta: () => {
            return false;
          },
          selection: {from: 1, to: 1},
          doc: initialDoc,
          setSelection: () => {
            return {
              getMeta: () => {
                return false;
              },
              selection: {from: 1, to: 1},
              doc: initialDoc,
            } as unknown as Transform;
          },
        } as unknown as Transform;
      },
      getMeta: () => {
        return false;
      },
      selection: {from: 1, to: 1},
      doc: initialDoc,
      setSelection: () => {
        return {
          getMeta: () => {
            return false;
          },
          selection: {from: 1, to: 1},
          doc: initialDoc,
        } as unknown as Transform;
      },
    } as unknown as Transform;
    jest
      .spyOn(tr1.doc, 'nodeAt')
      .mockReturnValueOnce({type: {name: 'TES'}} as unknown as Node)
      .mockReturnValueOnce({type: {name: 'TEST'}} as unknown as Node);

    const mySchema = new Schema({
      nodes: {
        doc: {content: 'text*'},
        text: {inline: true},
      },
    });
    const textNode = mySchema.text('This is a placeholder text node.');
    const test = transformAndPreserveTextSelection(
      tr1,
      {
        marks: {'mark-text-selection': {}},
        text: () => {
          return textNode;
        },
      } as unknown as Schema,
      () => {
        return {
          getMeta: () => {
            return false;
          },
          selection: {from: 1, to: 1},
          doc: initialDoc,
          setSelection: () => {
            return {doc: initialDoc};
          },
          removeMark: () => {
            return {
              getMeta: () => {
                return false;
              },
              selection: {from: 1, to: 1},
              doc: initialDoc,
              setSelection: () => {
                return {doc: initialDoc};
              },
              removeMark: () => {
                return {};
              },
            } as unknown as Transform;
          },
        } as unknown as Transform;
      }
    );
    expect(test).toBeDefined();
  });
  it('should handle transformAndPreserveTextSelection when getMeta return false and when from and to =1 and when prevNode && currentNode && currentNode.type === prevNode.type', () => {
    const mySchema1 = new Schema({
      nodes: {
        doc: {content: 'text*'},
        text: {inline: true},
      },
      marks: {
        myMark: {
          attrs: {id: {default: {}}},
          parseDOM: [
            {
              tag: 'span[data-id]',
              getAttrs: () => ({}),
            },
          ],
          toDOM: (mark) => ['span', {'data-id': mark.attrs.id}, 0],
        },
      },
    });

    // Create a text node with the mark that has an 'id' attribute
    const textNodeWithMark = mySchema1.text('This is a text node with a mark', [
      mySchema1.mark('myMark', {id: {}}),
    ]);

    // Create a doc node and add the text node to it
    const docNode = mySchema1.node('doc', null, [textNodeWithMark]);
    jest.spyOn(amark, 'applyMark').mockReturnValue({
      getMeta: () => {
        return false;
      },
      selection: {from: 1, to: 1},
      doc: initialDoc,
      setSelection: () => {
        return {doc: initialDoc};
      },
    } as unknown as Transform);
    const tr1 = {
      insert: () => {
        return {
          insert: () => {
            return {};
          },
          getMeta: () => {
            return false;
          },
          selection: {from: 1, to: 1},
          doc: initialDoc,
          setSelection: () => {
            return {
              getMeta: () => {
                return false;
              },
              selection: {from: 1, to: 1},
              doc: docNode,
            } as unknown as Transform;
          },
        } as unknown as Transform;
      },
      getMeta: () => {
        return false;
      },
      selection: {from: 1, to: 1},
      doc: initialDoc,
      setSelection: () => {
        return {
          getMeta: () => {
            return false;
          },
          selection: {from: 1, to: 1},
          doc: initialDoc,
        } as unknown as Transform;
      },
    } as unknown as Transform;
    jest
      .spyOn(tr1.doc, 'nodeAt')
      .mockReturnValueOnce({type: {name: 'TES'}} as unknown as Node);

    const mySchema = new Schema({
      nodes: {
        doc: {content: 'text*'},
        text: {inline: true},
      },
    });
    const textNode = mySchema.text('This is a placeholder text node.');
    const test = transformAndPreserveTextSelection(
      tr1,
      {
        marks: {'mark-text-selection': {}},
        text: () => {
          return textNode;
        },
      } as unknown as Schema,
      () => {
        return {
          getMeta: () => {
            return false;
          },
          selection: {from: 1, to: 1},
          doc: initialDoc,
          setSelection: () => {
            return {doc: initialDoc};
          },
          removeMark: () => {
            return {
              getMeta: () => {
                return false;
              },
              selection: {from: 1, to: 1},
              doc: initialDoc,
              setSelection: () => {
                return {doc: initialDoc};
              },
              removeMark: () => {
                return {};
              },
            } as unknown as Transform;
          },
        } as unknown as Transform;
      }
    );
    expect(test).toBeDefined();
  });
  it('should handle transformAndPreserveTextSelection when getMeta return false and when from and to =1 and when prevNode && currentNode && currentNode.type === prevNode.type', () => {
    const mySchema1 = new Schema({
      nodes: {
        doc: {content: 'text*'},
        text: {inline: true},
      },
      marks: {
        myMark: {
          attrs: {id: {default: {}}},
          parseDOM: [
            {
              tag: 'span[data-id]',
              getAttrs: () => ({}),
            },
          ],
          toDOM: (mark) => ['span', {'data-id': mark.attrs.id}, 0],
        },
      },
    });

    // Create a text node with the mark that has an 'id' attribute
    const textNodeWithMark = mySchema1.text('This is a text node with a mark', [
      mySchema1.mark('myMark', {id: {}}),
    ]);

    // Create a doc node and add the text node to it
    const docNode = mySchema1.node('doc', null, [textNodeWithMark]);
    jest.spyOn(amark, 'applyMark').mockReturnValue({
      getMeta: () => {
        return false;
      },
      selection: {from: 1, to: 1},
      doc: initialDoc,
      setSelection: () => {
        return {doc: initialDoc};
      },
    } as unknown as Transform);
    const tr1 = {
      insert: () => {
        return {
          insert: () => {
            return {};
          },
          getMeta: () => {
            return false;
          },
          selection: {from: 1, to: 1},
          doc: initialDoc,
          setSelection: () => {
            return {
              getMeta: () => {
                return false;
              },
              selection: {from: 1, to: 1},
              doc: docNode,
            } as unknown as Transform;
          },
        } as unknown as Transform;
      },
      getMeta: () => {
        return false;
      },
      selection: {from: 1, to: 1},
      doc: initialDoc,
      setSelection: () => {
        return {
          getMeta: () => {
            return false;
          },
          selection: {from: 1, to: 1},
          doc: initialDoc,
        } as unknown as Transform;
      },
    } as unknown as Transform;
    jest
      .spyOn(tr1.doc, 'nodeAt')
      .mockReturnValue({type: {name: 'TES'}} as unknown as Node);

    const mySchema = new Schema({
      nodes: {
        doc: {content: 'text*'},
        text: {inline: true},
      },
    });
    const textNode = mySchema.text('This is a placeholder text node.');
    const test = transformAndPreserveTextSelection(
      tr1,
      {
        marks: {'mark-text-selection': {}},
        text: () => {
          return textNode;
        },
      } as unknown as Schema,
      () => {
        return {
          getMeta: () => {
            return false;
          },
          selection: {from: 1, to: 1},
          doc: initialDoc,
          setSelection: () => {
            return {doc: initialDoc};
          },
          removeMark: () => {
            return {
              getMeta: () => {
                return false;
              },
              selection: {from: 1, to: 1},
              doc: initialDoc,
              setSelection: () => {
                return {doc: initialDoc};
              },
              removeMark: () => {
                return {};
              },
            } as unknown as Transform;
          },
        } as unknown as Transform;
      }
    );
    expect(test).toBeDefined();
  });
  it('should handle transformAndPreserveTextSelection when getMeta return false and when from and to =1 and when prevNode && currentNode && currentNode.type === prevNode.type', () => {
    const mySchema1 = new Schema({
      nodes: {
        doc: {content: 'text*'},
        text: {inline: true},
      },
      marks: {
        myMark: {
          attrs: {id: {default: {}}},
          parseDOM: [
            {
              tag: 'span[data-id]',
              getAttrs: () => ({}),
            },
          ],
          toDOM: (mark) => ['span', {'data-id': mark.attrs.id}, 0],
        },
      },
    });

    // Create a text node with the mark that has an 'id' attribute
    const textNodeWithMark = mySchema1.text('This is a text node with a mark', [
      mySchema1.mark('myMark', {id: {}}),
    ]);

    // Create a doc node and add the text node to it
    const docNode = mySchema1.node('doc', null, [textNodeWithMark]);
    jest.spyOn(amark, 'applyMark').mockReturnValue({
      getMeta: () => {
        return false;
      },
      selection: {from: 1, to: 1},
      doc: initialDoc,
      setSelection: () => {
        return {doc: initialDoc};
      },
    } as unknown as Transform);
    const tr1 = {
      insert: () => {
        return {
          insert: () => {
            return {};
          },
          getMeta: () => {
            return false;
          },
          selection: {from: 1, to: 1},
          doc: initialDoc,
          setSelection: () => {
            return {
              getMeta: () => {
                return false;
              },
              selection: {from: 1, to: 1},
              doc: docNode,
            } as unknown as Transform;
          },
        } as unknown as Transform;
      },
      getMeta: () => {
        return false;
      },
      selection: {from: 1, to: 1},
      doc: initialDoc,
      setSelection: () => {
        return {
          getMeta: () => {
            return false;
          },
          selection: {from: 1, to: 1},
          doc: initialDoc,
        } as unknown as Transform;
      },
    } as unknown as Transform;
    jest
      .spyOn(tr1.doc, 'nodeAt')
      .mockReturnValue(null as unknown as Node);

    const mySchema = new Schema({
      nodes: {
        doc: {content: 'text*'},
        text: {inline: true},
      },
    });
    const textNode = mySchema.text('This is a placeholder text node.');
    const test = transformAndPreserveTextSelection(
      tr1,
      {
        marks: {'mark-text-selection': {}},
        text: () => {
          return textNode;
        },
      } as unknown as Schema,
      () => {
        return {
          getMeta: () => {
            return false;
          },
          selection: {from: 1, to: 1},
          doc: initialDoc,
          setSelection: () => {
            return {doc: initialDoc};
          },
          removeMark: () => {
            return {
              getMeta: () => {
                return false;
              },
              selection: {from: 1, to: 1},
              doc: initialDoc,
              setSelection: () => {
                return {doc: initialDoc};
              },
              removeMark: () => {
                return {};
              },
            } as unknown as Transform;
          },
        } as unknown as Transform;
      }
    );
    expect(test).toBeDefined();
  });
});
