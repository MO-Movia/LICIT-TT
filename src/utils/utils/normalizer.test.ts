/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import ReactDOM from 'react-dom/client';
import { Node } from '@tiptap/pm/model';
import type { LicitDocument } from '../models/licit-document';
import { blankDocument, blankNode } from './licit-gen-json';
import { normalizeDoc, toSimpleJson } from './normalizer';

describe('Doc Normalizer Utils', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeAll(() => {
    Object.defineProperty(global, 'structuredClone', {
      value: (value: unknown): unknown =>
        JSON.parse(JSON.stringify(value)) as unknown,
      writable: true,
    });
  });
  it('should reject when editor does not respond before timeout', async () => {
    const inputDoc: LicitDocument = {
      ...blankDocument(),
      content: [
        {
          ...blankNode('paragraph'),
        },
      ],
    };
    await expect(normalizeDoc(inputDoc, [], 0)).rejects.toThrow(
      'Timeout. Licit Editor did not respond.'
    );
  });
  it('should normalize as JSON', () => {
    const inputDoc: LicitDocument = {
      ...blankDocument(),
      content: [
        {
          ...blankNode('paragraph'),
        },
      ],
    };
    // Stringify and parse to reduce to json.
    const doc = toSimpleJson(inputDoc as unknown as Node);

    expect(doc).toEqual(inputDoc);
    expect(doc).not.toBe(inputDoc);
  });

  it('should resolve with the normalized document when editor becomes ready', async () => {
    const inputDoc: LicitDocument = {
      ...blankDocument(),
      content: [
        {
          ...blankNode('paragraph'),
        },
      ],
    };

    const unmount = jest.fn();
    jest.spyOn(ReactDOM, 'createRoot').mockReturnValue({
      render: jest.fn((element: {
        props: {
          children: {
            props: {
              onReady?: (licit: {editorView?: {state: {doc: Node}}}) => void;
            };
          };
        };
      }) => {
        element.props.children.props.onReady?.({
          editorView: {
            state: {
              doc: inputDoc as unknown as Node,
            },
          },
        });
      }),
      unmount,
    } as unknown as ReactDOM.Root);

    await expect(normalizeDoc(inputDoc, [], 1000)).resolves.toEqual(inputDoc);
    expect(unmount).toHaveBeenCalled();
  });

  it('should reject when onReady is called without an editorView', async () => {
    const inputDoc: LicitDocument = {
      ...blankDocument(),
      content: [
        {
          ...blankNode('paragraph'),
        },
      ],
    };

    jest.spyOn(ReactDOM, 'createRoot').mockReturnValue({
      render: jest.fn((element: {
        props: {
          children: {
            props: {
              onReady?: (licit: {editorView?: {state: {doc: Node}}}) => void;
            };
          };
        };
      }) => {
        element.props.children.props.onReady?.({});
      }),
      unmount: jest.fn(),
    } as unknown as ReactDOM.Root);

    await expect(normalizeDoc(inputDoc, [], 1000)).rejects.toThrow(SyntaxError);
  });

  it('should use the default plugins and timeout values when omitted', async () => {
    const inputDoc: LicitDocument = {
      ...blankDocument(),
      content: [
        {
          ...blankNode('paragraph'),
        },
      ],
    };

    jest.spyOn(ReactDOM, 'createRoot').mockReturnValue({
      render: jest.fn((element: {
        props: {
          children: {
            props: {
              onReady?: (licit: {editorView?: {state: {doc: Node}}}) => void;
            };
          };
        };
      }) => {
        element.props.children.props.onReady?.({
          editorView: {
            state: {
              doc: inputDoc as unknown as Node,
            },
          },
        });
      }),
      unmount: jest.fn(),
    } as unknown as ReactDOM.Root);

    await expect(normalizeDoc(inputDoc)).resolves.toEqual(inputDoc);
  });
});
