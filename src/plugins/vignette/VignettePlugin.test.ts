/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { createEditor, doc, p, table, tr, td, schema } from 'jest-prosemirror';
import { EditorState } from 'prosemirror-state';
import { TABLE } from './Constants';
import { VignetteCommand } from './VignetteCommand';
import { VignettePlugin } from './VignettePlugin';
import { VignettePlugins } from './index';
import { createCommand } from './CreateCommand';
import { TableBackgroundColorCommand } from './TableBackgroundColorCommand';
import { TableBorderColorCommand } from './TableBorderColorCommand';
import {
  VignetteTableCellNodeSpec,
  VignetteTableNodeSpec,
} from './VignetteNodeSpec';
import { Node, NodeSpec, Fragment } from 'prosemirror-model';
import { VignetteMenuPlugin } from './VignetteMenuPlugin';
import { deleteTable } from 'prosemirror-tables';
import { EditorView } from 'prosemirror-view';
import { DarkThemeIcon, LightThemeIcon } from './images';

describe('VignettePlugin', () => {
  const editor = createEditor(doc(p('<cursor>')), {
    plugins: [...VignettePlugins],
  });
  const state: EditorState = EditorState.create({
    schema: schema,
    selection: editor.selection,
    plugins: [new VignetteMenuPlugin()],
  });

  const directeditorprops = { state, focus };
  const dom = document.createElement('div');

  const view = new EditorView(dom, directeditorprops);

  it('should handle VignetteCommand', () => {
    const content = createEditor(doc(p('<cursor>')), {
      plugins: [...VignettePlugins],
    }).command((state, dispatch) => {
      if (dispatch) {
        new VignetteCommand().execute(state, dispatch, view);
      }
      return true;
    });

    expect(content.state.doc).toEqualProsemirrorNode(
      doc(
        p(),
        p(' ')
      )
    );
  });

  it('should handle getEffectiveSchema', () => {
    const schema = createEditor(doc(p('<cursor>'))).schema;
    expect(schema.spec.nodes.get(TABLE)?.attrs?.vignette).toBeFalsy();
    const newSchema = new VignettePlugin().getEffectiveSchema(schema);
    const vignetteplugin = new VignettePlugin();
    vignetteplugin.initButtonCommands('dark');
    expect(newSchema.spec.nodes.get(TABLE)?.attrs?.vignette).toBeTruthy();
  });

  it('should use the light theme icon when light theme is selected', () => {
    const commands = new VignettePlugin().initButtonCommands('light');

    expect(Object.keys(commands)).toEqual([`[${LightThemeIcon}] Add Vignette`]);
  });

  it('should use the dark theme icon when dark theme is selected', () => {
    const commands = new VignettePlugin().initButtonCommands('dark');

    expect(Object.keys(commands)).toEqual([`[${DarkThemeIcon}] Add Vignette`]);
    expect(Object.values(commands)[0]).toBeInstanceOf(VignetteCommand);
  });

  it('should fall back to the dark theme icon for any non-light theme value', () => {
    const commandsEmpty = new VignettePlugin().initButtonCommands('');
    const commandsOther = new VignettePlugin().initButtonCommands('high-contrast');

    expect(Object.keys(commandsEmpty)).toEqual([`[${DarkThemeIcon}] Add Vignette`]);
    expect(Object.keys(commandsOther)).toEqual([`[${DarkThemeIcon}] Add Vignette`]);
  });

  it('should map the produced key to a VignetteCommand instance for light theme too', () => {
    const commands = new VignettePlugin().initButtonCommands('light');
    expect(Object.values(commands)[0]).toBeInstanceOf(VignetteCommand);
  });

  it("invokes the plugin's state.init callback when wired into an EditorState", () => {
    const plugin = new VignettePlugin();

    const newState = EditorState.create({
      schema,
      plugins: [plugin],
    });

    expect(newState).toBeDefined();
    expect(plugin.getState(newState)).toBeUndefined();
  });

  it("invokes the plugin's state.apply callback when a transaction is applied", () => {
    const plugin = new VignettePlugin();
    const initialState = EditorState.create({
      schema,
      plugins: [plugin],
    });

    const nextState = initialState.apply(initialState.tr);

    expect(nextState).toBeDefined();
    expect(plugin.getState(nextState)).toBeUndefined();
  });

  it('registers a stable PluginKey so the plugin is locatable on a state', () => {
    const plugin = new VignettePlugin();
    const newState = EditorState.create({
      schema,
      plugins: [plugin],
    });

    expect(newState.plugins).toContain(plugin);
  });


  it('should handle createCommand', () => {
    createEditor(doc(table(tr(td(p('content'))))), {});

    const deleteTableCommand = createCommand(deleteTable);

    const newState = createEditor(doc(table(tr(td(p('content'))))), {
      plugins: [...VignettePlugins],
    }).command((state, _dispatch) => {
      deleteTableCommand.isEnabled(state);
      deleteTableCommand.execute(
        state,
        () => {
          return undefined;
        },
        view
      );
      return true;
    });

    expect(newState.state.doc).toBeDefined();
  });

  it('should return borderColor', () => {
    const tablebrdercolorcommand = new TableBorderColorCommand();
    expect(tablebrdercolorcommand.getAttrName()).toEqual('borderColor');
  });
  it('should return backgroundColor', () => {
    const tablebgcolorcommand = new TableBackgroundColorCommand();
    expect(tablebgcolorcommand.getAttrName()).toEqual('backgroundColor');
  });

  it('dom should have matching node attributes VignetteTableNodeSpec', () => {
    const dom = document.createElement('div');
    dom.setAttribute('style', 'margin-left: 10px');

    const schema = createEditor(doc(p('<cursor>'))).schema;
    const newSchema = new VignettePlugin().getEffectiveSchema(schema);
    const node = newSchema.nodes.table.create(
      { marginLeft: '10', vignette: 'true' },
      Fragment.empty
    );
    const nodeSpec1: NodeSpec = {
      toDOM: (_node: Node) => {
        return ['test', { vignette: 'false', marginLeft: '10x' }];
      },
      parseDOM: [
        {
          getAttrs: (dom: string | HTMLElement) => {
            (dom as HTMLElement).setAttribute('style', 'margin-left: 10px');
            return { marginLeft: '10px', vignette: 'true' };
          },
          tag: 'tag'
        },
      ],
    };

    const plugin =   VignetteTableNodeSpec(nodeSpec1);
    plugin?.parseDOM?.[0].getAttrs?.call(plugin?.parseDOM?.[0], dom);

    expect(plugin?.toDOM?.call(plugin,node)).toStrictEqual([
      'table',
      {
        style: 'border: none margin-left: 10px',
        vignette: 'true',
      },
      0,
    ]);
    expect(plugin?.toDOM?.call(plugin,node)).toStrictEqual([
      'table',
      {
        style: 'border: none margin-left: 10px',
        vignette: 'true',
      },
      0,
    ]);
  });

  it('dom should have matching node attributes VignetteTableNodeSpec if statement coverage', () => {
    const dom = document.createElement('div');
    const node = p('bold');
    const nodeSpec1: NodeSpec = {
      toDOM: (_node: Node) => ['test', { vignette: 'false', marginLeft: '10px' }],
      parseDOM: [
        {
          getAttrs: (_dom: string | HTMLElement) => {
            return { marginLeft: '10px', vignette: 'true' };
          },
          tag: 'tag'
        },
      ],
    };
    const plugin =   VignetteTableNodeSpec(nodeSpec1);
    plugin?.parseDOM?.[0].getAttrs?.call(plugin?.parseDOM?.[0], dom);

    expect(plugin?.toDOM?.call(plugin,node)).toStrictEqual([
      'table',
      {
        style: undefined,
        vignette: undefined,
      },
      0,
    ]);
  })

  it('dom should have matching node attributes VignetteTableCellNodeSpec', () => {
    const node = p('vignette', 'marginLeft');
    const nodeSpec1: NodeSpec = {
      toDOM: (_node: Node) => ['test', { vignette: 'false', marginLeft: '10px' }],
      parseDOM: [
        {
          getAttrs: (_node: string | HTMLElement) => {
            return { marginLeft: '10px', vignette: 'true' };
          },
          tag: 'tag'
        },
      ],
    };
    const dom = document.createElement('span');
    const plugin = VignetteTableCellNodeSpec(nodeSpec1);

    expect(plugin?.toDOM?.call(plugin,node)).toStrictEqual([
      'test',
      {
        marginLeft: '10px',
        vignette: undefined,
      },
    ]);
    plugin?.parseDOM?.[0].getAttrs?.call(plugin?.parseDOM?.[0], dom);
  });
  it('dom should have matching node attributes VignetteTableCellNodeSpec if statement coverage', () => {
    const schema = createEditor(doc(p('<cursor>'))).schema;
    const newSchema = new VignettePlugin().getEffectiveSchema(schema);
    const node = newSchema.nodes.table_cell.create(
      { vignette: true, style: '' },
      Fragment.empty
    );

    const nodeSpec1: NodeSpec = {
      toDOM: (_node: Node) => [
        'test',
        { vignette: true, marginLeft: '10px', style: true },
      ],
      parseDOM: [
        {
          getAttrs: (_node: string | HTMLElement) => {
            return { marginLeft: '10px', vignette: true };
          },
          tag: 'tag'
        },
      ],
    };
    const dom = document.createElement('span');
    const plugin = VignetteTableCellNodeSpec(nodeSpec1);
    expect(plugin?.toDOM?.call(plugin,node)).toStrictEqual([
      'test',
      {
        marginLeft: '10px',
        vignette: undefined,
        style:
          true,
      },
    ]);

    plugin?.parseDOM?.[0].getAttrs?.call(plugin?.parseDOM?.[0], dom);
  });
});