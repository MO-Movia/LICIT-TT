/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

jest.mock('./ui/Icon', () => ({
  __esModule: true,
  Icon: {
    get: jest.fn(() => null),
  },
}));

import { Schema } from 'prosemirror-model';
import { EditorState, Transaction } from 'prosemirror-state';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { EnhancedTableFigure } from './EnhancedTableFigure';
import { EnhancedTableCommands } from './EnhancedTableCommands';
import { ImageUploadCommand } from './ImageUploadCommand';
import { EnhancedTableFigureView } from './EnhancedTableFigureView';
import {
  enhancedTableFigureNodeSpec,
  enhancedTableFigureBodyNodeSpec,
  enhancedTableFigureImageNodeSpec,
  enhancedTableFigureTableNodeSpec,
  enhancedTableFigureNotesNodeSpec,
  enhancedTableFigureCapcoNodeSpec,
} from './EnhancedTableNodeSpec';
import {
  ENHANCED_TABLE_FIGURE_BODY,
  ENHANCED_TABLE_FIGURE,
  ENHANCED_TABLE_FIGURE_CAPCO,
  ENHANCED_TABLE_FIGURE_IMAGE,
  ENHANCED_TABLE_FIGURE_NOTES,
  ENHANCED_TABLE_FIGURE_TABLE,
} from './Constants';
import { DarkThemeIcon, LightThemeIcon } from './images';
import { EditorView } from 'prosemirror-view';

// Mock dependencies
jest.mock('./EnhancedTableCommands');
jest.mock('./ImageUploadCommand');
jest.mock('./EnhancedTableFigureView');
jest.mock('./EnhancedTableNodeSpec', () => ({
  enhancedTableFigureNodeSpec: { content: 'block+' },
  enhancedTableFigureBodyNodeSpec: { content: 'block+' },
  enhancedTableFigureImageNodeSpec: { content: 'block+' },
  enhancedTableFigureTableNodeSpec: { content: 'block+' },
  enhancedTableFigureNotesNodeSpec: { content: 'text*' },
  enhancedTableFigureCapcoNodeSpec: { content: 'text*' },
}));
jest.mock('./images', () => ({
  DarkThemeIcon: 'dark-icon.svg',
  LightThemeIcon: 'light-icon.svg',
}));

describe('EnhancedTableFigure', () => {
  let plugin: EnhancedTableFigure;
  let baseSchema: Schema;

  beforeEach(() => {
    plugin = new EnhancedTableFigure();

    // Create a base schema
    baseSchema = new Schema({
      nodes: {
        doc: { content: 'block+' },
        paragraph: {
          content: 'text*',
          group: 'block',
          toDOM: () => ['p', 0],
          parseDOM: [{ tag: 'p' }],
        },
        text: { group: 'inline' },
      },
      marks: {
        strong: {
          toDOM: () => ['strong', 0],
          parseDOM: [{ tag: 'strong' }],
        },
        em: {
          toDOM: () => ['em', 0],
          parseDOM: [{ tag: 'em' }],
        },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create plugin with correct key', () => {
      expect(plugin).toBeDefined();
      expect(plugin.spec.key).toBeDefined();
      const keyName = (plugin.spec.key as unknown as { key: string }).key;
      expect(keyName).toBe('EnhancedTableFigure$');
    });

    it('should have state init function', () => {
      expect(plugin.spec.state).toBeDefined();
      expect(plugin.spec.state.init).toBeDefined();
      expect(typeof plugin.spec.state.init).toBe('function');
    });

    it('should have state apply function', () => {
      expect(plugin.spec.state.apply).toBeDefined();
      expect(typeof plugin.spec.state.apply).toBe('function');
    });

    it('should have nodeViews in props', () => {
      expect(plugin.spec.props).toBeDefined();
      expect(plugin.spec.props.nodeViews).toBeDefined();
      expect(plugin.spec.props.nodeViews.enhanced_table_figure).toBeDefined();
    });

    it('should register legacy EIC normalization hooks', () => {
      expect(plugin.spec.appendTransaction).toBeDefined();
      expect(plugin.spec.view).toBeDefined();
    });
  });

  describe('plugin state', () => {
    it('should call init without errors', () => {
      const mockConfig = {};
      const mockState = {} as EditorState;

      const result = plugin.spec.state?.init(mockConfig, mockState);

      // init does nothing, so just ensure it doesn't throw
      expect(result).toBeUndefined();
    });

    it('should call apply without errors', () => {
      const mockTr = {} as unknown as Transaction;
      const mockSet = undefined;
      const mockOldState = {} as EditorState;
      const mockNewState = {} as EditorState;

      const result = plugin.spec.state?.apply(
        mockTr,
        mockSet,
        mockOldState,
        mockNewState
      );

      // apply does nothing, so just ensure it doesn't throw
      expect(result).toBeUndefined();
    });
  });

  describe('nodeViews', () => {
    it('should create EnhancedTableFigureView for enhanced_table_figure node', () => {
      const mockNode = { type: { name: 'enhanced_table_figure' } } as unknown as ProseMirrorNode;
      const mockView = {} as EditorView;
      const mockGetPos = jest.fn();

      const nodeView = plugin.spec.props.nodeViews.enhanced_table_figure(
        mockNode,
        mockView,
        mockGetPos,
        [],
        undefined
      );

      expect(EnhancedTableFigureView).toHaveBeenCalledWith(
        mockNode,
        mockView,
        mockGetPos
      );
      expect(nodeView).toBeDefined();
    });
  });

  describe('getEffectiveSchema', () => {
    it('should append enhanced table figure node specs to schema', () => {
      const effectiveSchema = plugin.getEffectiveSchema(baseSchema);

      expect(effectiveSchema).toBeDefined();
      expect(effectiveSchema.nodes[ENHANCED_TABLE_FIGURE]).toBeDefined();
      expect(effectiveSchema.nodes[ENHANCED_TABLE_FIGURE_BODY]).toBeDefined();
      expect(effectiveSchema.nodes[ENHANCED_TABLE_FIGURE_IMAGE]).toBeDefined();
      expect(effectiveSchema.nodes[ENHANCED_TABLE_FIGURE_TABLE]).toBeDefined();
      expect(effectiveSchema.nodes[ENHANCED_TABLE_FIGURE_NOTES]).toBeDefined();
      expect(effectiveSchema.nodes[ENHANCED_TABLE_FIGURE_CAPCO]).toBeDefined();
    });

    it('should preserve original nodes in schema', () => {
      const effectiveSchema = plugin.getEffectiveSchema(baseSchema);

      expect(effectiveSchema.nodes.doc).toBeDefined();
      expect(effectiveSchema.nodes.paragraph).toBeDefined();
      expect(effectiveSchema.nodes.text).toBeDefined();
    });

    it('should preserve original marks in schema', () => {
      const effectiveSchema = plugin.getEffectiveSchema(baseSchema);

      expect(effectiveSchema.marks.strong).toBeDefined();
      expect(effectiveSchema.marks.em).toBeDefined();
    });

    it('should create new Schema instance', () => {
      const effectiveSchema = plugin.getEffectiveSchema(baseSchema);

      expect(effectiveSchema).toBeInstanceOf(Schema);
      expect(effectiveSchema).not.toBe(baseSchema);
    });

    it('should correctly append node specs using Constants', () => {
      const effectiveSchema = plugin.getEffectiveSchema(baseSchema);

      // Verify that the node specs are correctly assigned
      expect(effectiveSchema.nodes[ENHANCED_TABLE_FIGURE].spec).toEqual(
        enhancedTableFigureNodeSpec
      );
      expect(effectiveSchema.nodes[ENHANCED_TABLE_FIGURE_BODY].spec).toEqual(
        enhancedTableFigureBodyNodeSpec
      );
      expect(effectiveSchema.nodes[ENHANCED_TABLE_FIGURE_IMAGE].spec).toEqual(
        enhancedTableFigureImageNodeSpec
      );
      expect(effectiveSchema.nodes[ENHANCED_TABLE_FIGURE_TABLE].spec).toEqual(
        enhancedTableFigureTableNodeSpec
      );
      expect(effectiveSchema.nodes[ENHANCED_TABLE_FIGURE_NOTES].spec).toEqual(
        enhancedTableFigureNotesNodeSpec
      );
      expect(effectiveSchema.nodes[ENHANCED_TABLE_FIGURE_CAPCO].spec).toEqual(
        enhancedTableFigureCapcoNodeSpec
      );
    });
  });

  describe('initButtonCommands', () => {
    it('should return commands with light theme icon', () => {
      const commands = plugin.initButtonCommands('light');

      expect(commands).toBeDefined();
      expect(Object.keys(commands)).toHaveLength(1);

      const commandKey = `[${LightThemeIcon}] Insert Enhanced Table-Figure`;
      expect(commands[commandKey]).toBeDefined();
      expect(Array.isArray(commands[commandKey])).toBe(true);
    });

    it('should return commands with dark theme icon', () => {
      const commands = plugin.initButtonCommands('dark');

      expect(commands).toBeDefined();
      expect(Object.keys(commands)).toHaveLength(1);

      const commandKey = `[${DarkThemeIcon}] Insert Enhanced Table-Figure`;
      expect(commands[commandKey]).toBeDefined();
      expect(Array.isArray(commands[commandKey])).toBe(true);
    });

    it('should contain Table command with correct type', () => {
      const commands = plugin.initButtonCommands('light');
      const commandKey = `[${LightThemeIcon}] Insert Enhanced Table-Figure`;
      const commandArray = commands[commandKey];

      expect(commandArray).toHaveLength(1);
      expect(commandArray[0][' Table']).toBeDefined();
      expect(EnhancedTableCommands).toHaveBeenCalledWith('table');
    });

    it('should contain ImageUploadCommand', () => {
      const commands = plugin.initButtonCommands('light');
      const commandKey = `[${LightThemeIcon}] Insert Enhanced Table-Figure`;
      const commandArray = commands[commandKey];

      expect(commandArray[0][' Insert image from computer']).toBeDefined();
      expect(ImageUploadCommand).toHaveBeenCalled();
    });

    it('should use dark theme icon for non-light theme', () => {
      const themes = ['dark', 'custom', '', null, undefined];

      themes.forEach((theme) => {
        jest.clearAllMocks();
        const commands = plugin.initButtonCommands(theme);
        const commandKey = `[${DarkThemeIcon}] Insert Enhanced Table-Figure`;

        expect(commands[commandKey]).toBeDefined();
      });
    });

    it('should return object with correct structure', () => {
      const commands = plugin.initButtonCommands('light');
      const commandKey = `[${LightThemeIcon}] Insert Enhanced Table-Figure`;
      const commandArray = commands[commandKey];

      expect(typeof commands).toBe('object');
      expect(Array.isArray(commandArray)).toBe(true);
      expect(commandArray).toHaveLength(1);
      expect(typeof commandArray[0]).toBe('object');
      expect(Object.keys(commandArray[0])).toContain(' Table');
      expect(Object.keys(commandArray[0])).toContain(
        ' Insert image from computer'
      );
    });

    it('should create new command instances each time', () => {
      const commands1 = plugin.initButtonCommands('light');
      const commands2 = plugin.initButtonCommands('light');

      // Verify new instances are created
      expect(EnhancedTableCommands).toHaveBeenCalledTimes(2);
      expect(ImageUploadCommand).toHaveBeenCalledTimes(2);

      // Objects should not be the same reference
      expect(commands1).not.toBe(commands2);
    });

    it('should handle edge case themes correctly', () => {
      const edgeCases = [
        { theme: 'light', expectedIcon: LightThemeIcon },
        { theme: 'Light', expectedIcon: DarkThemeIcon },
        { theme: 'LIGHT', expectedIcon: DarkThemeIcon },
        { theme: 'dark', expectedIcon: DarkThemeIcon },
        { theme: 'night', expectedIcon: DarkThemeIcon },
        { theme: '', expectedIcon: DarkThemeIcon },
      ];

      edgeCases.forEach(({ theme, expectedIcon }) => {
        const commands = plugin.initButtonCommands(theme);
        const expectedKey = `[${expectedIcon}] Insert Enhanced Table-Figure`;
        expect(commands[expectedKey]).toBeDefined();
      });
    });
  });

  describe('integration tests', () => {
    it('should create a fully functional plugin', () => {
      const state = EditorState.create({
        schema: baseSchema,
        plugins: [plugin],
      });

      expect(state.plugins).toContain(plugin);
    });

    it('should work with getEffectiveSchema and create valid state', () => {
      const effectiveSchema = plugin.getEffectiveSchema(baseSchema);
      const state = EditorState.create({
        schema: effectiveSchema,
        plugins: [plugin],
      });

      expect(state).toBeDefined();
      expect(state.schema.nodes[ENHANCED_TABLE_FIGURE]).toBeDefined();
    });

    it('should maintain plugin functionality after schema transformation', () => {
      const effectiveSchema = plugin.getEffectiveSchema(baseSchema);
      const state = EditorState.create({
        schema: effectiveSchema,
        plugins: [plugin],
      });

      const pluginState = plugin.getState(state);
      expect(pluginState).toBeUndefined();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle schema with no marks', () => {
      const schemaWithoutMarks = new Schema({
        nodes: {
          doc: { content: 'block+' },
          paragraph: {
            content: 'text*',
            group: 'block',
            toDOM: () => ['p', 0],
            parseDOM: [{ tag: 'p' }],
          },
          text: { group: 'inline' },
        },
      });

      const effectiveSchema = plugin.getEffectiveSchema(schemaWithoutMarks);

      expect(effectiveSchema).toBeDefined();
      expect(effectiveSchema.nodes[ENHANCED_TABLE_FIGURE]).toBeDefined();
    });

    it('should handle schema with many existing nodes', () => {
      const complexSchema = new Schema({
        nodes: {
          doc: { content: 'block+' },
          paragraph: { content: 'text*', group: 'block' },
          heading: { content: 'text*', group: 'block' },
          blockquote: { content: 'block+', group: 'block' },
          code_block: { content: 'text*', group: 'block' },
          text: { group: 'inline' },
        },
        marks: {
          strong: {},
          em: {},
          code: {},
          link: {},
        },
      });

      const effectiveSchema = plugin.getEffectiveSchema(complexSchema);

      expect(effectiveSchema.nodes.paragraph).toBeDefined();
      expect(effectiveSchema.nodes.heading).toBeDefined();
      expect(effectiveSchema.nodes.blockquote).toBeDefined();
      expect(effectiveSchema.nodes[ENHANCED_TABLE_FIGURE]).toBeDefined();
    });
  });
});
