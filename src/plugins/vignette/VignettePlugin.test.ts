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

jest.mock('../src/assets/images/dark/Icon_Vignette.svg', () => 'Icon SVG content');
jest.mock('../src/assets/images/light/Icon_Vignette.svg', () => 'Icon SVG content');
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

  it('should handle VignetteCommand', async () => {
    const content = await createEditor(doc(p('<cursor>')), {
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

  it('should handle createCommand', async () => {
    createEditor(doc(table(tr(td(p('content'))))), {});

    const deleteTableCommand = createCommand(deleteTable);

    const newState = await createEditor(doc(table(tr(td(p('content'))))), {
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
  it('should handle createCommand', () => {
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
      toDOM: (node: any) => {
        node.attrs.marginLeft = '10px';
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
        style: 'border: nonemargin-left: 10px',
        vignette: 'true',
      },
      0,
    ]);
    expect(plugin?.toDOM?.call(plugin,node)).toStrictEqual([
      'table',
      {
        style: 'border: nonemargin-left: 10px',
        vignette: 'true',
      },
      0,
    ]);
  });

  it('dom should have matching node attributes VignetteTableNodeSpec if statement coverage', () => {
    const dom = document.createElement('div');
    const node = p('bold');
    let nodeSpec1: NodeSpec = {
      toDOM: (node: Node) => ['test', { vignette: 'false', marginLeft: '10px' }],
      parseDOM: [
        {
          getAttrs: (dom: string | HTMLElement) => {
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
        style: 'border: none',
        vignette: undefined,
      },
      0,
    ]);
  })

  it('dom should have matching node attributes VignetteTableCellNodeSpec', () => {
    const node = p('vignette', 'marginLeft');
    let nodeSpec1: NodeSpec = {
      toDOM: (node: Node) => ['test', { vignette: 'false', marginLeft: '10px' }],
      parseDOM: [
        {
          getAttrs: (node: string | HTMLElement) => {
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

    let nodeSpec1: NodeSpec = {
      toDOM: (node: Node) => [
        'test',
        { vignette: true, marginLeft: '10px', style: true },
      ],
      parseDOM: [
        {
          getAttrs: (node: string | HTMLElement) => {
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
})
