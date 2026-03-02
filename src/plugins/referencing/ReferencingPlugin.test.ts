/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { schema } from 'jest-prosemirror';
import { ReferenceNodeSpec, REFERENCE } from './ReferenceNodeSpec';
import { ReferencingPlugin } from './ReferencingPlugin';

describe('ReferencingPlugin', () => {
  let plugin!: ReferencingPlugin;

  beforeEach(() => {
    plugin = new ReferencingPlugin();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should create plugin', () => {
    expect(plugin).toBeTruthy();
  });

  describe('getEffectiveSchema', () => {
    const plugin = new ReferencingPlugin();

    const dom = document.createElement('div');
    document.body.appendChild(dom);

    it('should return the effective schema', () => {
      const effectiveSchema = plugin.getEffectiveSchema(schema);
      const spec = effectiveSchema.spec.nodes.get(REFERENCE);
      expect(spec).toEqual(ReferenceNodeSpec);
    });
  });
});
