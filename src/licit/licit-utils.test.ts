/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

/**
 * @jest-environment jsdom
 */

import {Schema} from 'prosemirror-model';
import OrderedMap from 'orderedmap';

jest.mock('yjs', () => ({
  Doc: jest.fn(),
}));

jest.mock('y-indexeddb', () => ({
  IndexeddbPersistence: jest.fn(() => ({
    on: jest.fn(),
  })),
}));

jest.mock('y-webrtc', () => ({
  WebrtcProvider: jest.fn(),
}));

jest.mock('y-protocols/awareness', () => ({
  Awareness: jest.fn(),
}));

const ensureCrypto = (): void => {
  if (!globalThis.crypto) {
    (globalThis as {crypto?: Crypto}).crypto = {
      getRandomValues: <T extends ArrayBufferView>(arr: T): T => {
        const view = arr as unknown as Uint32Array;
        if (view.length > 0) {
          view[0] = 1;
        }
        return arr;
      },
    } as Crypto;
  }
};

describe('configCollab', () => {
  const getFreshModule = async () => {
    jest.resetModules();
    return import('./licit');
  };
  const getProviderMock = async () => {
    const mod = await import('y-webrtc');
    return mod.WebrtcProvider as unknown as jest.MockedFunction<
      (...args: unknown[]) => unknown
    >;
  };

  beforeEach(() => {
    ensureCrypto();
  });

  it('does nothing when docID is empty', async () => {
    const {configCollab} = await getFreshModule();
    const ref = {collaboration: false, currentUser: null as Record<string, unknown> | null};
    configCollab('', 'inst', ref, '');
    expect(ref.collaboration).toBe(false);
  });

  it('falls back to default provider when custom provider fails', async () => {
    const {configCollab} = await getFreshModule();
    const providerMock = await getProviderMock();
    providerMock.mockImplementationOnce(() => {
      throw new Error('failed');
    });
    providerMock.mockImplementationOnce(
      () =>
        ({
          destroy: jest.fn(),
        })
    );

    const ref = {collaboration: false, currentUser: null as Record<string, unknown> | null};
    configCollab('doc1', 'inst', ref, 'ws://example');
    expect(ref.collaboration).toBe(true);
    expect(ref.currentUser).toBeDefined();
    expect(providerMock).toHaveBeenCalledTimes(2);
  });

  it('uses default provider when no collab URL is provided', async () => {
    const {configCollab} = await getFreshModule();
    const providerMock = await getProviderMock();
    providerMock.mockImplementationOnce(
      () =>
        ({
          destroy: jest.fn(),
        })
    );

    const ref = {collaboration: false, currentUser: null as Record<string, unknown> | null};
    configCollab('doc2', 'inst', ref, '');
    expect(ref.collaboration).toBe(true);
    expect(providerMock).toHaveBeenCalledTimes(1);
  });

  it('uses custom provider when collab URL is provided', async () => {
    const {configCollab} = await getFreshModule();
    const providerMock = await getProviderMock();
    providerMock.mockImplementationOnce(
      () =>
        ({
          destroy: jest.fn(),
        })
    );

    const ref = {collaboration: false, currentUser: null as Record<string, unknown> | null};
    configCollab('doc3', 'inst', ref, 'ws://example');
    expect(ref.collaboration).toBe(true);
    expect(providerMock).toHaveBeenCalledTimes(1);
  });

  it('reuses existing provider on subsequent calls', async () => {
    const {configCollab} = await getFreshModule();
    const providerMock = await getProviderMock();
    providerMock.mockImplementationOnce(
      () =>
        ({
          destroy: jest.fn(),
        })
    );

    const ref = {collaboration: false, currentUser: null as Record<string, unknown> | null};
    configCollab('doc4', 'inst', ref, '');
    const callCount = providerMock.mock.calls.length;
    configCollab('doc5', 'inst2', ref, '');
    expect(providerMock).toHaveBeenCalledTimes(callCount);
  });
});

describe('updateSpecAttrs', () => {
  it('merges missing attrs from tiptap spec into licit spec', async () => {
    const {updateSpecAttrs} = await (async () => {
      jest.resetModules();
      return import('./licit');
    })();
    const schema = new Schema({
      nodes: {
        doc: {content: 'paragraph+'},
        paragraph: {
          group: 'block',
          content: 'text*',
          attrs: {a: {default: 1}},
        },
        text: {group: 'inline'},
      },
      marks: {},
    });
    const collection: unknown[] = [
      'paragraph',
      {attrs: {a: {default: 1}, b: {default: 2}}},
    ];
    updateSpecAttrs(0, collection, schema, 'nodes');
    const paraSpec = (schema.spec.nodes as OrderedMap<unknown>).get('paragraph') as {
      attrs?: Record<string, unknown>;
    };
    expect(paraSpec.attrs?.b).toBeDefined();
  });

  it('skips update when tiptap attrs are missing', async () => {
    const {updateSpecAttrs} = await (async () => {
      jest.resetModules();
      return import('./licit');
    })();
    const schema = new Schema({
      nodes: {
        doc: {content: 'paragraph+'},
        paragraph: {
          group: 'block',
          content: 'text*',
          attrs: {a: {default: 1}},
        },
        text: {group: 'inline'},
      },
      marks: {},
    });
    const collection: unknown[] = ['paragraph', {}];
    expect(() => updateSpecAttrs(0, collection, schema, 'nodes')).not.toThrow();
  });

  it('does not merge when licit spec has no attrs', async () => {
    const {updateSpecAttrs} = await (async () => {
      jest.resetModules();
      return import('./licit');
    })();
    const schema = new Schema({
      nodes: {
        doc: {content: 'paragraph+'},
        paragraph: {
          group: 'block',
          content: 'text*',
        },
        text: {group: 'inline'},
      },
      marks: {},
    });
    const collection: unknown[] = [
      'paragraph',
      {attrs: {b: {default: 2}}},
    ];
    updateSpecAttrs(0, collection, schema, 'nodes');
    const paraSpec = (schema.spec.nodes as OrderedMap<unknown>).get('paragraph') as {
      attrs?: Record<string, unknown>;
    };
    expect(paraSpec.attrs).toBeUndefined();
  });

  it('does not overwrite existing attrs', async () => {
    const {updateSpecAttrs} = await (async () => {
      jest.resetModules();
      return import('./licit');
    })();
    const schema = new Schema({
      nodes: {
        doc: {content: 'paragraph+'},
        paragraph: {
          group: 'block',
          content: 'text*',
          attrs: {b: {default: 1}},
        },
        text: {group: 'inline'},
      },
      marks: {},
    });
    const collection: unknown[] = [
      'paragraph',
      {attrs: {b: {default: 2}, c: {default: 3}}},
    ];
    updateSpecAttrs(0, collection, schema, 'nodes');
    const paraSpec = (schema.spec.nodes as OrderedMap<unknown>).get('paragraph') as {
      attrs?: Record<string, unknown>;
    };
    const attrs = paraSpec.attrs as {b?: {default: number}; c?: {default: number}};
    expect(attrs.b?.default).toBe(1);
    expect(attrs.c?.default).toBeDefined();
  });
});
