/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import {
  MarkType,
  Node as ProseMirrorNode,
  NodeType,
  Schema,
} from 'prosemirror-model';
import {EditorState, Selection, TextSelection, Transaction} from 'prosemirror-state';
import * as React from 'react';
import {Transform} from 'prosemirror-transform';
import {EditorView} from 'prosemirror-view';
import {findParentNodeOfType} from 'prosemirror-utils';
import {RuntimeService} from '../../commands';
import {
  MARK_EM,
  MARK_FONT_SIZE,
  MARK_FONT_TYPE,
  MARK_LETTER_SPACING,
  MARK_STRONG,
  MARK_TEXT_COLOR,
  MARK_UNDERLINE,
} from '../../commands/MarkNames';
import {UICommand} from '../../core';
import {TableMap} from 'prosemirror-tables';

type ParentNodeRef = {
  pos: number;
  start: number;
  node: ProseMirrorNode;
};

type TableDetailNodeRefs = {
  table: ParentNodeRef;
  row: ParentNodeRef | null;
  cell: ParentNodeRef | null;
  cells?: ParentNodeRef[];
};

type BorderEdge =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'insideHorizontal'
  | 'insideVertical';

type BorderLineStyle = 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
type TableEditorApplyMode = 'cell' | 'selection';
type PageOrientation = 'portrait' | 'landscape';
type SelectionMode = 'single' | 'range';

type BorderStyle = {
  style: BorderLineStyle;
  width: string;
  color: string;
};

type BorderConfig = {
  targetEdges: BorderEdge[];
  border: BorderStyle;
  edgeStyles?: Partial<Record<BorderEdge, BorderStyle>>;
  applyMode: TableEditorApplyMode;
};

type TypographyConfig = {
  fontFamily: string;
  fontSize: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  textColor: string;
  backgroundColor: string;
  letterSpacing: string;
  lineHeight: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  verticalAlign: 'top' | 'middle' | 'bottom';
};

type LayoutConfig = {
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  paddingLocked: boolean;
};

type TableEditorTableDetails = {
  tableWidth: string;
  tableHeight: string;
  tableWidthPx?: number;
  tableHeightPx?: number;
  selectedCellWidth?: string;
  selectedCellHeight?: string;
  selectedCellWidthPx?: number;
  selectedCellHeightPx?: number;
  pageOrientation: PageOrientation;
};

type TableMetadata = {
  totalRows: number;
  totalColumns: number;
};

type FontOption = {
  label: string;
  value: string;
};

type TableEditorDialogData = {
  table?: Partial<TableEditorTableDetails>;
  borders?: Partial<BorderConfig>;
  typography?: Partial<TypographyConfig>;
  layout?: Partial<LayoutConfig>;
  metadata?: Partial<TableMetadata>;
  selectionMode?: SelectionMode;
  fontOptions?: FontOption[];
};

type TableEditorResult = {
  table: TableEditorTableDetails;
  borders: BorderConfig;
  typography: TypographyConfig;
  layout: LayoutConfig;
  metadata: TableMetadata;
  selectionMode: SelectionMode;
};

type TableEditorRuntime = {
  openTableEditorDialog?: (
    data: TableEditorDialogData,
    applyTableEditorResult?: (result: TableEditorResult) => void,
    closeTableEditor?: () => void
  ) => void;
};

type TableDetailsInput = {
  noOfColumns: string;
  tableHeight: string;
  rowHeight: string;
  rowWidth: string;
  cellWidth: string;
  cellStyle: string;
  fontSize: string;
  letterSpacing: string;
  marginTop: string;
  MarginBottom: string;
};

type CellSelectionLike = Selection & {
  forEachCell?: (callback: (node: ProseMirrorNode, pos: number) => void) => void;
  $anchorCell?: {pos: number};
};

type CellRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

const DEFAULT_BORDER: BorderStyle = {
  style: 'solid',
  width: '1px',
  color: '#555555',
};

const DEFAULT_TYPOGRAPHY: TypographyConfig = {
  fontFamily: 'inherit',
  fontSize: '14px',
  bold: false,
  italic: false,
  underline: false,
  textColor: '#000000',
  backgroundColor: 'transparent',
  letterSpacing: '0px',
  lineHeight: 'normal',
  textAlign: 'left',
  verticalAlign: 'middle',
};

const DEFAULT_LAYOUT: LayoutConfig = {
  paddingTop: '4px',
  paddingRight: '4px',
  paddingBottom: '4px',
  paddingLeft: '4px',
  paddingLocked: true,
};

const FONT_TYPE_NAMES = [
  'Aclonica',
  'Acme',
  'Alegreya',
  'Arial',
  'Arial Black',
  'Georgia',
  'Tahoma',
  'Times New Roman',
  'Times',
  'Verdana',
  'Courier New',
];

const EDGE_ATTRS: Record<
  Exclude<BorderEdge, 'insideHorizontal' | 'insideVertical'>,
  {
    border: string;
    width: string;
    color: string;
    style: string;
  }
> = {
  top: {
    border: 'borderTop',
    width: 'borderTopWidth',
    color: 'borderTopColor',
    style: 'borderTopStyle',
  },
  bottom: {
    border: 'borderBottom',
    width: 'borderBottomWidth',
    color: 'borderBottomColor',
    style: 'borderBottomStyle',
  },
  left: {
    border: 'borderLeft',
    width: 'borderLeftWidth',
    color: 'borderLeftColor',
    style: 'borderLeftStyle',
  },
  right: {
    border: 'borderRight',
    width: 'borderRightWidth',
    color: 'borderRightColor',
    style: 'borderRightStyle',
  },
};

class TableDetailsCommand extends UICommand {
  execute = (
    state: EditorState,
    _dispatch: (tr: Transform) => void,
    view: EditorView
  ): boolean => {
    if (!view) {
      return false;
    }

    const {selection, schema} = state;
    const tableType = this.getNodeType(schema, ['table']);
    const rowType = this.getNodeType(schema, ['tableRow', 'table_row']);
    const cellTypes = this.getNodeTypes(schema, ['tableCell', 'table_cell']);

    const tableNode = this.getParentNodeRef(selection, tableType);
    if (!tableNode) {
      return false;
    }

    const rowNode = this.getParentNodeRef(selection, rowType);
    const cellNode = this.getParentNodeRefByTypes(selection, cellTypes);
    const selectedCells = this.getSelectedCellRefs(selection, cellNode);

    const tableDOM = this.findTableDOM(view, tableNode.start);
    if (!tableDOM) {
      return false;
    }

    const tableRect = tableDOM.getBoundingClientRect();
    const cellDOM = this.getSelectedCellDOM(view);
    const cellRect = cellDOM?.getBoundingClientRect();
    const runtime = this.getTableEditorRuntime(view);
    if (!runtime?.openTableEditorDialog) {
      return false;
    }

    runtime.openTableEditorDialog(
      this.buildTableEditorDialogData(
        {
          table: tableNode,
          row: rowNode,
          cell: cellNode,
          cells: selectedCells,
        },
        tableRect,
        cellRect,
        cellDOM
      ),
      (result) => {
        this.applyTableEditorResult(
          view,
          {
            table: tableNode,
            row: rowNode,
            cell: cellNode,
            cells: selectedCells,
          },
          result
        );
      },
      () => {
        view.focus();
      }
    );

    return true;
  };

  isActive = (_state: EditorState): boolean => {
    return false;
  };

  isEnabled = (state: EditorState): boolean => {
    const {$from} = state.selection;

    for (let depth = $from.depth; depth > 0; depth--) {
      if ($from.node(depth).type.name === 'table') {
        return true;
      }
    }

    return false;
  };

  executeCustom(
    _state: EditorState,
    tr: Transform,
    _from: number,
    _to: number
  ): Transform {
    return tr;
  }

  executeCustomStyleForTable(_state: EditorState, tr: Transform): Transform {
    return tr;
  }

  waitForUserInput = (
    _state: EditorState,
    _dispatch: (tr: Transform) => void,
    _view: EditorView,
    _event: React.SyntheticEvent
  ): Promise<undefined> => {
    return Promise.resolve(undefined);
  };

  executeWithUserInput = (
    _state: EditorState,
    _dispatch: (tr: Transform) => void,
    _view: EditorView,
    _inputs: string
  ): boolean => {
    return false;
  };

  findTableDOM(view: EditorView, pos: number): HTMLElement | null {
    const dom = view.domAtPos(pos);

    if (dom.node instanceof HTMLElement) {
      return dom.node.closest('table');
    }

    return null;
  }

  getSelectedCellDOM(view: EditorView): HTMLElement | null {
    const {selection} = view.state;

    if (!(selection instanceof TextSelection)) {
      const cellSelection = selection as CellSelectionLike;
      const node = cellSelection.$anchorCell
        ? view.nodeDOM(cellSelection.$anchorCell.pos)
        : null;

      return node instanceof HTMLElement ? node.closest('td, th') : null;
    }

    const {node} = view.domAtPos(selection.from);
    let element: HTMLElement | null = null;

    if (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        element = node.parentElement;
      } else if (node instanceof HTMLElement) {
        element = node;
      }
    }

    if (!element) {
      return null;
    }

    return element.closest('td, th');
  }

  getNodeType(schema: Schema, names: string[]): NodeType | null {
    for (const name of names) {
      const nodeType = schema.nodes[name];
      if (nodeType) {
        return nodeType;
      }
    }

    return null;
  }

  getNodeTypes(schema: Schema, names: string[]): NodeType[] {
    const nodeTypes: NodeType[] = [];

    for (const name of names) {
      const nodeType = schema.nodes[name];
      if (nodeType) {
        nodeTypes.push(nodeType);
      }
    }

    return nodeTypes;
  }

  getParentNodeRef(selection: Selection, nodeType: NodeType | null): ParentNodeRef | null {
    if (!nodeType) {
      return null;
    }

    const parentNodeRef = findParentNodeOfType(nodeType)(selection);
    if (!parentNodeRef) {
      return null;
    }

    return {
      pos: parentNodeRef.pos,
      start: parentNodeRef.start,
      node: parentNodeRef.node,
    };
  }

  getParentNodeRefByTypes(selection: Selection, nodeTypes: NodeType[]): ParentNodeRef | null {
    if (!nodeTypes.length) {
      return null;
    }

    const parentNodeRef = findParentNodeOfType(nodeTypes)(selection);
    if (!parentNodeRef) {
      return null;
    }

    return {
      pos: parentNodeRef.pos,
      start: parentNodeRef.start,
      node: parentNodeRef.node,
    };
  }

  getTableEditorRuntime = (view?: EditorView): TableEditorRuntime | null => {
    const viewRuntime = (view as EditorView & { runtime?: TableEditorRuntime })
      ?.runtime;
    return viewRuntime ?? RuntimeService.Runtime;
  };

  getSelectedCellRefs(
    selection: Selection,
    fallbackCell: ParentNodeRef | null
  ): ParentNodeRef[] {
    const selectedCells: ParentNodeRef[] = [];
    const cellSelection = selection as CellSelectionLike;

    cellSelection.forEachCell?.((node, pos) => {
      selectedCells.push({
        pos,
        start: pos + 1,
        node,
      });
    });

    if (!selectedCells.length && fallbackCell) {
      selectedCells.push(fallbackCell);
    }

    return selectedCells;
  }

  buildTableEditorDialogData(
    nodes: TableDetailNodeRefs,
    tableRect: DOMRect,
    cellRect?: DOMRect,
    cellDOM?: HTMLElement | null
  ): TableEditorDialogData {
    const tableMap = TableMap.get(nodes.table.node);
    const cellAttrs = nodes.cell?.node.attrs ?? {};
    const computedStyle = cellDOM ? getComputedStyle(cellDOM) : null;
    const selectedCells = nodes.cells ?? [];

    return {
      table: {
        tableWidth: String(Math.round(tableRect.width)),
        tableHeight: String(Math.round(tableRect.height)),
        tableWidthPx: Math.round(tableRect.width),
        tableHeightPx: Math.round(tableRect.height),
        selectedCellWidth: cellRect
          ? String(Math.round(cellRect.width))
          : undefined,
        selectedCellHeight: cellRect
          ? String(Math.round(cellRect.height))
          : undefined,
        selectedCellWidthPx: cellRect ? Math.round(cellRect.width) : undefined,
        selectedCellHeightPx: cellRect ? Math.round(cellRect.height) : undefined,
        pageOrientation: 'portrait',
      },
      borders: this.getBorderDialogData(cellAttrs),
      typography: this.getTypographyDialogData(cellAttrs, computedStyle),
      layout: this.getLayoutDialogData(cellAttrs, computedStyle),
      metadata: {
        totalRows: tableMap.height,
        totalColumns: tableMap.width,
      },
      selectionMode: selectedCells.length > 1 ? 'range' : 'single',
      fontOptions: [
        {label: 'Default Font', value: 'inherit'},
        ...FONT_TYPE_NAMES.map((fontName) => ({
          label: fontName,
          value: fontName,
        })),
      ],
    };
  }

  getBorderDialogData(attrs: Record<string, unknown>): BorderConfig {
    return {
      targetEdges: [],
      border: {
        style: this.toBorderLineStyle(attrs.borderTopStyle) ?? DEFAULT_BORDER.style,
        width: this.toStringValue(attrs.borderTopWidth) ?? DEFAULT_BORDER.width,
        color: this.toStringValue(attrs.borderTopColor) ?? DEFAULT_BORDER.color,
      },
      edgeStyles: {
        top: this.getEdgeStyle(attrs, 'top'),
        bottom: this.getEdgeStyle(attrs, 'bottom'),
        left: this.getEdgeStyle(attrs, 'left'),
        right: this.getEdgeStyle(attrs, 'right'),
      },
      applyMode: 'selection',
    };
  }

  getTypographyDialogData(
    attrs: Record<string, unknown>,
    computedStyle: CSSStyleDeclaration | null
  ): TypographyConfig {
    const fontWeight =
      this.toStringValue(attrs.fontWeight) ?? computedStyle?.fontWeight;
    const textDecoration =
      this.toStringValue(attrs.textDecoration) ??
      computedStyle?.textDecorationLine;

    return {
      fontFamily:
        this.normalizeFontFamily(
          this.toStringValue(attrs.fontName) ?? computedStyle?.fontFamily
        ) ?? DEFAULT_TYPOGRAPHY.fontFamily,
      fontSize:
        this.toStringValue(attrs.fontSize) ??
        computedStyle?.fontSize ??
        DEFAULT_TYPOGRAPHY.fontSize,
      bold: this.isBold(fontWeight),
      italic:
        (this.toStringValue(attrs.fontStyle) ?? computedStyle?.fontStyle) ===
        'italic',
      underline: textDecoration?.includes('underline') ?? false,
      textColor:
        this.toStringValue(attrs.textColor) ??
        DEFAULT_TYPOGRAPHY.textColor,
      backgroundColor:
        this.normalizeTransparentColor(this.toStringValue(attrs.backgroundColor)) ??
        DEFAULT_TYPOGRAPHY.backgroundColor,
      letterSpacing:
        this.toStringValue(attrs.letterSpacing) ??
        computedStyle?.letterSpacing ??
        DEFAULT_TYPOGRAPHY.letterSpacing,
      lineHeight:
        this.toStringValue(attrs.lineHeight) ??
        computedStyle?.lineHeight ??
        DEFAULT_TYPOGRAPHY.lineHeight,
      textAlign: this.toTextAlign(
        this.toStringValue(attrs.textAlign) ?? computedStyle?.textAlign
      ),
      verticalAlign: this.toVerticalAlign(
        this.toStringValue(attrs.verticalAlign) ?? computedStyle?.verticalAlign
      ),
    };
  }

  getLayoutDialogData(
    attrs: Record<string, unknown>,
    computedStyle: CSSStyleDeclaration | null
  ): LayoutConfig {
    return {
      paddingTop:
        this.toStringValue(attrs.paddingTop) ??
        computedStyle?.paddingTop ??
        DEFAULT_LAYOUT.paddingTop,
      paddingRight:
        this.toStringValue(attrs.paddingRight) ??
        computedStyle?.paddingRight ??
        DEFAULT_LAYOUT.paddingRight,
      paddingBottom:
        this.toStringValue(attrs.paddingBottom) ??
        computedStyle?.paddingBottom ??
        DEFAULT_LAYOUT.paddingBottom,
      paddingLeft:
        this.toStringValue(attrs.paddingLeft) ??
        computedStyle?.paddingLeft ??
        DEFAULT_LAYOUT.paddingLeft,
      paddingLocked: DEFAULT_LAYOUT.paddingLocked,
    };
  }

  getEdgeStyle(
    attrs: Record<string, unknown>,
    edge: Exclude<BorderEdge, 'insideHorizontal' | 'insideVertical'>
  ): BorderStyle {
    const edgeAttrs = EDGE_ATTRS[edge];
    return {
      style: this.toBorderLineStyle(attrs[edgeAttrs.style]) ?? DEFAULT_BORDER.style,
      width: this.toStringValue(attrs[edgeAttrs.width]) ?? DEFAULT_BORDER.width,
      color: this.toStringValue(attrs[edgeAttrs.color]) ?? DEFAULT_BORDER.color,
    };
  }

  toStringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length ? value : null;
  }

  normalizeTransparentColor(value: string | null | undefined): string | null {
    if (!value || value === 'rgba(0, 0, 0, 0)' || value === 'transparent') {
      return null;
    }
    return value;
  }

  toBorderLineStyle(value: unknown): BorderLineStyle | null {
    if (
      value === 'solid' ||
      value === 'dashed' ||
      value === 'dotted' ||
      value === 'double' ||
      value === 'none'
    ) {
      return value;
    }
    return null;
  }

  toTextAlign(value: string | undefined | null): TypographyConfig['textAlign'] {
    if (
      value === 'center' ||
      value === 'right' ||
      value === 'justify' ||
      value === 'left'
    ) {
      return value;
    }
    return DEFAULT_TYPOGRAPHY.textAlign;
  }

  toVerticalAlign(
    value: string | undefined | null
  ): TypographyConfig['verticalAlign'] {
    if (value === 'top' || value === 'bottom' || value === 'middle') {
      return value;
    }
    return DEFAULT_TYPOGRAPHY.verticalAlign;
  }

  isBold(fontWeight: string | undefined | null): boolean {
    if (!fontWeight) {
      return false;
    }
    return fontWeight === 'bold' || Number.parseInt(fontWeight, 10) >= 600;
  }

  normalizeFontFamily(value: string | undefined | null): string | null {
    const normalized = this.normalizeString(value);
    if (!normalized) {
      return null;
    }

    const firstFamily = normalized
      .split(',')[0]
      .replaceAll(/["']/g, '')
      .trim();

    return (
      FONT_TYPE_NAMES.find(
        (fontName) => fontName.toLowerCase() === firstFamily.toLowerCase()
      ) ?? firstFamily
    );
  }

  normalizeString(value: string | null | undefined): string | null {
    const normalized = value?.trim() ?? '';
    return normalized.length ? normalized : null;
  }

  normalizeNumber(value: string): number | null {
    const normalized = this.normalizeString(value);
    if (!normalized) {
      return null;
    }

    const parsed = Number.parseInt(normalized, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  normalizeSizeAsNumber(value: string): number | null {
    const normalized = this.normalizeString(value);
    if (!normalized) {
      return null;
    }

    const parsed = Number.parseFloat(normalized.replace(/px$/i, ''));
    if (Number.isNaN(parsed) || parsed <= 0) {
      return null;
    }

    return Math.round(parsed);
  }

  applyColumnWidth(
    tr: Transaction,
    tableRef: ParentNodeRef,
    cellRef: ParentNodeRef,
    width: number
  ): Transaction {
    const tableNode = tr.doc.nodeAt(tableRef.pos);
    if (!tableNode) {
      return tr;
    }

    if (tableNode.type.spec.tableRole !== 'table') {
      return tr;
    }

    const tableMap = TableMap.get(tableNode);
    const cellPosRelative = cellRef.pos - tableRef.start;
    const mapIndex = tableMap.map.indexOf(cellPosRelative);
    if (mapIndex < 0) {
      return tr;
    }

    const column = mapIndex % tableMap.width;
    const updatedCells = new Set<number>();

    for (let row = 0; row < tableMap.height; row++) {
      const rowIndex = row * tableMap.width + column;
      const mappedCellPos = tableMap.map[rowIndex];

      if (updatedCells.has(mappedCellPos)) {
        continue;
      }

      updatedCells.add(mappedCellPos);
      const absoluteCellPos = tableRef.start + mappedCellPos;
      const currentCell = tr.doc.nodeAt(absoluteCellPos);
      if (!currentCell) {
        continue;
      }

      const colspan = Number(currentCell.attrs.colspan) || 1;
      tr = tr.setNodeMarkup(absoluteCellPos, undefined, {
        ...currentCell.attrs,
        colwidth: Array.from({length: colspan}, () => width),
      });
    }

    return tr;
  }

  applyAttributeInputs(
    view: EditorView,
    nodes: TableDetailNodeRefs,
    inputs: TableDetailsInput
  ): void {
    let tr = view.state.tr;

    tr = tr.setNodeMarkup(nodes.table.pos, undefined, {
      ...nodes.table.node.attrs,
      noOfColumns: this.normalizeNumber(inputs.noOfColumns),
      tableHeight: this.normalizeString(inputs.tableHeight),
    });

    if (nodes.row) {
      tr = tr.setNodeMarkup(nodes.row.pos, undefined, {
        ...nodes.row.node.attrs,
        rowHeight: this.normalizeString(inputs.rowHeight),
        rowWidth: this.normalizeString(inputs.rowWidth),
      });
    }

    if (nodes.cell) {
      const cellWidth = this.normalizeSizeAsNumber(inputs.cellWidth);
      if (cellWidth) {
        tr = this.applyColumnWidth(tr, nodes.table, nodes.cell, cellWidth);
      }

      const currentCell = tr.doc.nodeAt(nodes.cell.pos) || nodes.cell.node;
      tr = tr.setNodeMarkup(nodes.cell.pos, undefined, {
        ...currentCell.attrs,
        cellWidth: this.normalizeString(inputs.cellWidth),
        cellStyle: this.normalizeString(inputs.cellStyle),
        fontSize: this.normalizeString(inputs.fontSize),
        letterSpacing: this.normalizeString(inputs.letterSpacing),
        marginTop: this.normalizeString(inputs.marginTop),
        marginBottom: this.normalizeString(inputs.MarginBottom),
        MarginBottom: this.normalizeString(inputs.MarginBottom),
      });
    }

    view.dispatch(tr);
    view.focus();
  }

  applyTableEditorResult(
    view: EditorView,
    nodes: TableDetailNodeRefs,
    result: TableEditorResult
  ): void {
    const selectedCells = this.getTargetCells(nodes, result.borders.applyMode);
    if (!selectedCells.length) {
      view.focus();
      return;
    }

    let tr = view.state.tr;
    tr = this.applyTableEditorTableAttrs(tr, nodes, selectedCells, result);

    for (const cellRef of selectedCells) {
      tr = this.applyCellEditorAttrs(tr, cellRef, result);
      tr = this.applyCellParagraphOverrides(tr, cellRef, result);
      tr = this.applyCellInlineOverrides(tr, cellRef, result, view.state.schema);
    }

    tr = this.applyBorderConfig(tr, nodes.table, selectedCells, result.borders);
    view.dispatch(tr);
    view.focus();
  }

  getTargetCells(
    nodes: TableDetailNodeRefs,
    applyMode: TableEditorApplyMode
  ): ParentNodeRef[] {
    if (applyMode === 'cell' && nodes.cell) {
      return [nodes.cell];
    }

    return nodes.cells?.length ? nodes.cells : nodes.cell ? [nodes.cell] : [];
  }

  applyTableEditorTableAttrs(
    tr: Transaction,
    nodes: TableDetailNodeRefs,
    selectedCells: ParentNodeRef[],
    result: TableEditorResult
  ): Transaction {
    const currentTable = tr.doc.nodeAt(nodes.table.pos) ?? nodes.table.node;
    tr = tr.setNodeMarkup(nodes.table.pos, undefined, {
      ...currentTable.attrs,
      noOfColumns: result.metadata.totalColumns,
      tableHeight: this.normalizeString(result.table.tableHeight),
    });

    const cellWidth = this.normalizeSizeAsNumber(
      result.table.selectedCellWidth ?? ''
    );
    if (cellWidth) {
      for (const cellRef of selectedCells) {
        tr = this.applyColumnWidth(tr, nodes.table, cellRef, cellWidth);
      }
    }

    const rowHeight = this.normalizeString(
      result.table.selectedCellHeight ?? ''
    );
    if (rowHeight) {
      if (nodes.row) {
        const currentRow = tr.doc.nodeAt(nodes.row.pos) ?? nodes.row.node;
        tr = tr.setNodeMarkup(nodes.row.pos, undefined, {
          ...currentRow.attrs,
          rowHeight,
        });
      }
      tr = this.applySelectedRowHeights(tr, nodes.table, selectedCells, rowHeight);
    }

    return tr;
  }

  applySelectedRowHeights(
    tr: Transaction,
    tableRef: ParentNodeRef,
    selectedCells: ParentNodeRef[],
    rowHeight: string
  ): Transaction {
    const tableNode = tr.doc.nodeAt(tableRef.pos);
    if (!tableNode || tableNode.type.spec.tableRole !== 'table') {
      return tr;
    }

    const selectedCellPositions = selectedCells.map((cellRef) => cellRef.pos);

    tableNode.forEach((rowNode, offset) => {
      const rowStart = tableRef.start + offset;
      const rowEnd = rowStart + rowNode.nodeSize;
      const hasSelectedCell = selectedCellPositions.some(
        (cellPos) => cellPos > rowStart && cellPos < rowEnd
      );

      if (!hasSelectedCell) {
        return;
      }

      tr = tr.setNodeMarkup(tableRef.start + offset, undefined, {
        ...rowNode.attrs,
        rowHeight,
      });
    });

    return tr;
  }

  applyCellEditorAttrs(
    tr: Transaction,
    cellRef: ParentNodeRef,
    result: TableEditorResult
  ): Transaction {
    const currentCell = tr.doc.nodeAt(cellRef.pos) ?? cellRef.node;
    return tr.setNodeMarkup(cellRef.pos, undefined, {
      ...currentCell.attrs,
      fontName: this.normalizeInheritedValue(result.typography.fontFamily),
      fontSize: this.normalizeString(result.typography.fontSize),
      fontWeight: result.typography.bold ? 'bold' : null,
      fontStyle: result.typography.italic ? 'italic' : null,
      textDecoration: result.typography.underline ? 'underline' : null,
      textColor: this.normalizeString(result.typography.textColor),
      backgroundColor: this.normalizeTransparentResult(
        result.typography.backgroundColor
      ),
      letterSpacing: this.normalizeString(result.typography.letterSpacing),
      lineHeight: this.normalizeString(result.typography.lineHeight),
      textAlign: this.normalizeString(result.typography.textAlign),
      verticalAlign: this.normalizeString(result.typography.verticalAlign),
      cellWidth: this.normalizeString(result.table.selectedCellWidth),
      paddingTop: this.normalizeString(result.layout.paddingTop),
      paddingRight: this.normalizeString(result.layout.paddingRight),
      paddingBottom: this.normalizeString(result.layout.paddingBottom),
      paddingLeft: this.normalizeString(result.layout.paddingLeft),
    });
  }

  applyCellParagraphOverrides(
    tr: Transaction,
    cellRef: ParentNodeRef,
    result: TableEditorResult
  ): Transaction {
    const currentCell = tr.doc.nodeAt(cellRef.pos);
    if (!currentCell) {
      return tr;
    }

    currentCell.descendants((node, pos) => {
      if (node.type.name !== 'paragraph') {
        return true;
      }

      const attrs = {...node.attrs};
      const textAlign = this.normalizeString(result.typography.textAlign);
      const lineSpacing = this.normalizeLineSpacingValue(
        result.typography.lineHeight
      );

      if (Object.hasOwn(attrs, 'align') && textAlign) {
        attrs.align = textAlign;
        attrs.overriddenAlign = true;
        attrs.overriddenAlignValue = textAlign;
      }

      if (Object.hasOwn(attrs, 'lineSpacing') && lineSpacing) {
        attrs.lineSpacing = lineSpacing;
        attrs.overriddenLineSpacing = true;
        attrs.overriddenLineSpacingValue = lineSpacing;
      }

      tr = tr.setNodeMarkup(cellRef.start + pos, undefined, attrs);
      return true;
    });

    return tr;
  }

  applyCellInlineOverrides(
    tr: Transaction,
    cellRef: ParentNodeRef,
    result: TableEditorResult,
    schema: Schema
  ): Transaction {
    const currentCell = tr.doc.nodeAt(cellRef.pos);
    if (!currentCell) {
      return tr;
    }

    const markUpdates = this.getInlineMarkUpdates(result, schema);
    if (!markUpdates.length) {
      return tr;
    }

    currentCell.descendants((node, pos) => {
      if (!node.isText) {
        return true;
      }

      const from = cellRef.start + pos;
      const to = from + node.nodeSize;

      for (const update of markUpdates) {
        tr = tr.removeMark(from, to, update.markType);
        if (update.attrs) {
          tr = tr.addMark(from, to, update.markType.create(update.attrs));
        }
      }

      return true;
    });

    return tr;
  }

  getInlineMarkUpdates(
    result: TableEditorResult,
    schema: Schema
  ): {markType: MarkType; attrs: Record<string, unknown> | null}[] {
    const updates: {markType: MarkType; attrs: Record<string, unknown> | null}[] = [];
    this.addMarkUpdate(updates, schema, MARK_FONT_SIZE, {
      pt: this.normalizeFontPointSize(result.typography.fontSize),
      overridden: true,
    });
    this.addMarkUpdate(updates, schema, MARK_FONT_TYPE, {
      name: this.normalizeInheritedValue(result.typography.fontFamily),
      overridden: true,
    });
    this.addMarkUpdate(updates, schema, MARK_TEXT_COLOR, {
      color: this.normalizeString(result.typography.textColor),
      overridden: true,
    });
    this.addMarkUpdate(updates, schema, MARK_LETTER_SPACING, {
      letterSpacing: this.normalizeString(result.typography.letterSpacing),
      overridden: true,
    });
    this.addMarkUpdate(
      updates,
      schema,
      MARK_STRONG,
      result.typography.bold ? {overridden: true} : null
    );
    this.addMarkUpdate(
      updates,
      schema,
      MARK_EM,
      result.typography.italic ? {overridden: true} : null
    );
    this.addMarkUpdate(
      updates,
      schema,
      MARK_UNDERLINE,
      result.typography.underline ? {overridden: true} : null
    );

    return updates;
  }

  addMarkUpdate(
    updates: {markType: MarkType; attrs: Record<string, unknown> | null}[],
    schema: Schema,
    markName: string,
    attrs: Record<string, unknown> | null
  ): void {
    const markType = schema.marks[markName];
    if (!markType) {
      return;
    }

    if (!attrs) {
      updates.push({markType, attrs: null});
      return;
    }

    const styleEntries = Object.entries(attrs).filter(
      ([key]) => key !== 'overridden'
    );
    const hasValue = styleEntries.length === 0 || styleEntries.some(
      ([key, value]) => key !== 'overridden' && value !== null
    );
    updates.push({markType, attrs: hasValue ? attrs : null});
  }

  applyBorderConfig(
    tr: Transaction,
    tableRef: ParentNodeRef,
    selectedCells: ParentNodeRef[],
    borders: BorderConfig
  ): Transaction {
    if (!borders.targetEdges.length) {
      return tr;
    }

    const tableNode = tr.doc.nodeAt(tableRef.pos);
    if (!tableNode || tableNode.type.spec.tableRole !== 'table') {
      return tr;
    }

    const tableMap = TableMap.get(tableNode);
    const selectionRect = this.getSelectionRect(
      tableMap,
      tableRef,
      selectedCells
    );
    if (!selectionRect) {
      return tr;
    }

    for (const cellRef of selectedCells) {
      const cellRect = this.getSelectionRect(tableMap, tableRef, [cellRef]);
      if (!cellRect) {
        continue;
      }

      const edges = this.getPhysicalBorderEdges(
        borders.targetEdges,
        selectionRect,
        cellRect
      );
      if (!edges.length) {
        continue;
      }

      const currentCell = tr.doc.nodeAt(cellRef.pos) ?? cellRef.node;
      tr = tr.setNodeMarkup(cellRef.pos, undefined, {
        ...currentCell.attrs,
        ...this.assignBorderAttrs(edges, borders.border),
      });
    }

    return tr;
  }

  getSelectionRect(
    tableMap: TableMap,
    tableRef: ParentNodeRef,
    selectedCells: ParentNodeRef[]
  ): CellRect | null {
    let rect: CellRect | null = null;

    for (const cellRef of selectedCells) {
      const cellPos = cellRef.pos - tableRef.start;
      for (let index = 0; index < tableMap.map.length; index++) {
        if (tableMap.map[index] !== cellPos) {
          continue;
        }

        const col = index % tableMap.width;
        const row = Math.floor(index / tableMap.width);
        rect = rect
          ? {
            left: Math.min(rect.left, col),
            right: Math.max(rect.right, col + 1),
            top: Math.min(rect.top, row),
            bottom: Math.max(rect.bottom, row + 1),
          }
          : {
            left: col,
            right: col + 1,
            top: row,
            bottom: row + 1,
          };
      }
    }

    return rect;
  }

  getPhysicalBorderEdges(
    targetEdges: BorderEdge[],
    selectionRect: CellRect,
    cellRect: CellRect
  ): Exclude<BorderEdge, 'insideHorizontal' | 'insideVertical'>[] {
    const edges: Exclude<BorderEdge, 'insideHorizontal' | 'insideVertical'>[] = [];

    if (targetEdges.includes('top') && cellRect.top === selectionRect.top) {
      edges.push('top');
    }
    if (targetEdges.includes('bottom') && cellRect.bottom === selectionRect.bottom) {
      edges.push('bottom');
    }
    if (targetEdges.includes('left') && cellRect.left === selectionRect.left) {
      edges.push('left');
    }
    if (targetEdges.includes('right') && cellRect.right === selectionRect.right) {
      edges.push('right');
    }
    if (
      targetEdges.includes('insideHorizontal') &&
      cellRect.bottom < selectionRect.bottom
    ) {
      edges.push('bottom');
    }
    if (
      targetEdges.includes('insideVertical') &&
      cellRect.right < selectionRect.right
    ) {
      edges.push('right');
    }

    return edges;
  }

  assignBorderAttrs(
    edges: Exclude<BorderEdge, 'insideHorizontal' | 'insideVertical'>[],
    border: BorderStyle
  ): Record<string, string> {
    const attrs: Record<string, string> = {};

    for (const edge of edges) {
      const edgeAttrs = EDGE_ATTRS[edge];
      attrs[edgeAttrs.border] =
        border.style === 'none'
          ? 'none'
          : `${border.width} ${border.style} ${border.color}`;
      attrs[edgeAttrs.width] = border.width;
      attrs[edgeAttrs.color] = border.color;
      attrs[edgeAttrs.style] = border.style;
    }

    return attrs;
  }

  normalizeInheritedValue(value: string | null | undefined): string | null {
    const normalized = this.normalizeString(value);
    if (!normalized || normalized.toLowerCase() === 'inherit') {
      return null;
    }

    return normalized;
  }

  normalizeFontPointSize(value: string | null | undefined): number | null {
    const normalized = this.normalizeString(value);
    if (!normalized) {
      return null;
    }

    const parsed = Number.parseFloat(normalized.replace(/px|pt/i, ''));
    return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
  }

  normalizeLineSpacingValue(value: string | null | undefined): string | null {
    const normalized = this.normalizeString(value);
    if (!normalized || normalized.toLowerCase() === 'normal') {
      return null;
    }

    return normalized;
  }

  normalizeTransparentResult(value: string | null | undefined): string | null {
    const normalized = this.normalizeString(value);
    if (!normalized || normalized.toLowerCase() === 'transparent') {
      return null;
    }

    return normalized;
  }

  cancel(): void {
    // Dialog lifecycle is owned by the host runtime.
  }
}

export default TableDetailsCommand;
