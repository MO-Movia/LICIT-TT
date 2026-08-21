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
import Color from 'color';

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
  textAlign: '' | 'left' | 'center' | 'right' | 'justify';
  verticalAlign: '' | 'top' | 'middle' | 'bottom';
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
  mixed?: {
    typography?: Partial<Record<keyof TypographyConfig, boolean>>;
  };
};

type TypographyResolution = {
  typography: TypographyConfig;
  mixed: Partial<Record<keyof TypographyConfig, boolean>>;
};

type TableEditorChangedFields = {
  table?: Partial<Record<keyof TableEditorTableDetails, boolean>>;
  borders?: {
    targetEdges?: boolean;
    border?: Partial<Record<keyof BorderStyle, boolean>>;
    applyMode?: boolean;
    edgeStyles?: boolean;
  };
  typography?: Partial<Record<keyof TypographyConfig, boolean>>;
  layout?: Partial<Record<keyof LayoutConfig, boolean>>;
};

type TableEditorResult = {
  table: TableEditorTableDetails;
  borders: BorderConfig;
  typography: TypographyConfig;
  layout: LayoutConfig;
  metadata: TableMetadata;
  selectionMode: SelectionMode;
  changed?: TableEditorChangedFields;
};

type TableEditorApplyChanges = {
  fontFamily: boolean;
  fontSize: boolean;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  textColor: boolean;
  backgroundColor: boolean;
  letterSpacing: boolean;
  lineHeight: boolean;
  textAlign: boolean;
  verticalAlign: boolean;
  paddingTop: boolean;
  paddingRight: boolean;
  paddingBottom: boolean;
  paddingLeft: boolean;
  paddingLocked: boolean;
  tableHeight: boolean;
  selectedCellWidth: boolean;
  selectedCellHeight: boolean;
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

type CssNumericValue = {
  value: number;
  unit: string;
};

type ColumnWidthUpdate = {
  cell: ProseMirrorNode;
  colwidth: number[];
};

const CELL_LEVEL_TYPOGRAPHY_KEYS = new Set<keyof TypographyConfig>([
  'backgroundColor',
  'verticalAlign',
]);

const ABSOLUTE_CSS_UNIT_TO_PX: Record<string, number> = {
  px: 1,
  pt: 96 / 72,
  pc: 16,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
  q: 96 / 101.6,
};

const DEFAULT_BORDER: BorderStyle = {
  style: 'solid',
  width: '1px',
  color: '#555555',
};

const DEFAULT_TYPOGRAPHY: TypographyConfig = {
  fontFamily: 'inherit',
  fontSize: '14pt',
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
    const tableType = this.getNodeTypeByTableRole(schema, 'table');
    const rowType = this.getNodeTypeByTableRole(schema, 'row');
    const cellTypes = this.getNodeTypesByTableRole(schema, [
      'cell',
      'header_cell',
    ]);

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

    const dialogData = this.buildTableEditorDialogData(
      {
        table: tableNode,
        row: rowNode,
        cell: cellNode,
        cells: selectedCells,
      },
      tableRect,
      cellRect,
      cellDOM
    );

    runtime.openTableEditorDialog(
      dialogData,
      (result) => {
        this.applyTableEditorResult(
          view,
          {
            table: tableNode,
            row: rowNode,
            cell: cellNode,
            cells: selectedCells,
          },
          result,
          dialogData
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
      if ($from.node(depth).type.spec.tableRole === 'table') {
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

  getNodeTypeByTableRole(schema: Schema, tableRole: string): NodeType | null {
    return this.getNodeTypesByTableRole(schema, [tableRole])[0] ?? null;
  }

  getNodeTypesByTableRole(schema: Schema, tableRoles: string[]): NodeType[] {
    const acceptedRoles = new Set(tableRoles);
    return Object.values(schema.nodes).filter((nodeType) =>
      acceptedRoles.has(nodeType.spec.tableRole ?? '')
    );
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
    const selectedCells = nodes.cells ?? [];
    const selectedCell = nodes.cell ?? selectedCells[0] ?? null;
    const cellAttrs = selectedCell?.node.attrs ?? {};
    const computedStyle = cellDOM ? getComputedStyle(cellDOM) : null;
    let typographyCells = selectedCells;
    if (!typographyCells.length && selectedCell) {
      typographyCells = [selectedCell];
    }
    const typographyResolution = this.getSelectedCellsTypography(
      typographyCells,
      computedStyle
    );

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
      typography: typographyResolution.typography,
      mixed: {typography: typographyResolution.mixed},
      layout: this.getLayoutDialogData(cellAttrs, computedStyle),
      metadata: {
        totalRows: tableMap.height,
        totalColumns: tableMap.width,
      },
      selectionMode: selectedCells.length > 1 ? 'range' : 'single',
      fontOptions: this.getFontOptions(typographyResolution.typography.fontFamily),
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
    computedStyle: CSSStyleDeclaration | null,
    cellNode?: ProseMirrorNode
  ): TypographyConfig {
    return this.getCellTypographyResolution(
      attrs,
      computedStyle,
      cellNode
    ).typography;
  }

  getSelectedCellsTypography(
    cells: ParentNodeRef[],
    computedStyle: CSSStyleDeclaration | null
  ): TypographyResolution {
    if (!cells.length) {
      return {typography: DEFAULT_TYPOGRAPHY, mixed: {}};
    }

    // Empty structural cells do not contribute text styling. They still own
    // cell-level properties such as fill and vertical alignment, though, so a
    // blank cell with a different fill must be reported as mixed.
    const cellsWithText = cells.filter((cell) => cell.node.textContent.trim());
    const textTypographyCells = cellsWithText.length ? cellsWithText : cells;
    const allResolutions = cells.map((cell) =>
      this.getCellTypographyResolution(
        cell.node.attrs,
        // One anchor DOM style cannot represent every cell in a range. For a
        // range, rely on each node's imported attrs/content so mixed values are
        // not accidentally hidden by the anchor cell's computed style.
        cells.length === 1 ? computedStyle : null,
        cell.node
      )
    );
    const textResolutions = textTypographyCells.map((cell) => {
      const cellIndex = cells.indexOf(cell);
      return cellIndex >= 0
        ? allResolutions[cellIndex]
        : this.getCellTypographyResolution(cell.node.attrs, null, cell.node);
    });
    const typography = {...allResolutions[0].typography};
    const mixed = {...allResolutions[0].mixed};
    const keys = Object.keys(typography) as (keyof TypographyConfig)[];

    for (const key of keys) {
      const resolutions = CELL_LEVEL_TYPOGRAPHY_KEYS.has(key)
        ? allResolutions
        : textResolutions;
      const firstResolution = resolutions[0];
      typography[key] = firstResolution.typography[key] as never;
      mixed[key] = firstResolution.mixed[key];
      if (
        resolutions.some(
          (resolution) =>
            resolution.mixed[key] ||
            !this.sameTypographyValue(
              key,
              firstResolution.typography[key],
              resolution.typography[key]
            )
        )
      ) {
        mixed[key] = true;
        typography[key] = this.emptyTypographyValue(key) as never;
      }
    }

    return {typography, mixed};
  }

  getCellTypographyResolution(
    attrs: Record<string, unknown>,
    computedStyle: CSSStyleDeclaration | null,
    cellNode?: ProseMirrorNode
  ): TypographyResolution {
    const fontWeight =
      this.toStringValue(attrs.fontWeight) ??
      this.toStringValue(computedStyle?.fontWeight);
    const textDecoration =
      this.toStringValue(attrs.textDecoration) ??
      this.toStringValue(computedStyle?.textDecorationLine);
    const cellTypography: TypographyConfig = {
      fontFamily:
        this.normalizeFontFamily(
          this.toStringValue(attrs.fontName) ??
          this.toStringValue(computedStyle?.fontFamily)
        ) ?? DEFAULT_TYPOGRAPHY.fontFamily,
      fontSize:
        this.normalizeFontSizeForDialog(
          this.toStringValue(attrs.fontSize) ??
            this.toStringValue(computedStyle?.fontSize)
        ) ??
        DEFAULT_TYPOGRAPHY.fontSize,
      bold: this.isBold(fontWeight),
      italic: this.isItalic(
        this.toStringValue(attrs.fontStyle) ??
          this.toStringValue(computedStyle?.fontStyle)
      ),
      underline: this.isUnderlined(textDecoration),
      textColor:
        this.toColorValue(attrs.textColor) ??
        DEFAULT_TYPOGRAPHY.textColor,
      backgroundColor:
        this.normalizeTransparentColor(
          this.toColorValue(attrs.backgroundColor)
        ) ?? DEFAULT_TYPOGRAPHY.backgroundColor,
      letterSpacing:
        this.toStringValue(attrs.letterSpacing) ??
        this.toStringValue(computedStyle?.letterSpacing) ??
        DEFAULT_TYPOGRAPHY.letterSpacing,
      lineHeight:
        this.toStringValue(attrs.lineHeight) ??
        this.toStringValue(computedStyle?.lineHeight) ??
        DEFAULT_TYPOGRAPHY.lineHeight,
      textAlign: this.toTextAlign(
        this.toStringValue(attrs.textAlign) ??
        this.toStringValue(computedStyle?.textAlign)
      ),
      verticalAlign: this.toVerticalAlign(
        this.toStringValue(attrs.verticalAlign) ??
        this.toStringValue(computedStyle?.verticalAlign)
      ),
    };

    return this.getCellContentTypography(cellNode, cellTypography);
  }

  getCellContentTypography(
    cellNode: ProseMirrorNode | undefined,
    fallback: TypographyConfig
  ): TypographyResolution {
    const typography = {...fallback};
    const mixed: Partial<Record<keyof TypographyConfig, boolean>> = {};
    if (!cellNode) {
      return {typography, mixed};
    }

    const textNodes: ProseMirrorNode[] = [];
    const textBlocks: ProseMirrorNode[] = [];
    cellNode.descendants((node) => {
      if (node.isTextblock) {
        textBlocks.push(node);
      }
      if (node.isText && node.text?.trim()) {
        textNodes.push(node);
      }
      return true;
    });

    this.resolveTextNodeTypography(textNodes, fallback, typography, mixed);
    this.resolveTextBlockTypography(textBlocks, fallback, typography, mixed);

    return {typography, mixed};
  }

  resolveTextNodeTypography(
    textNodes: ProseMirrorNode[],
    fallback: TypographyConfig,
    typography: TypographyConfig,
    mixed: Partial<Record<keyof TypographyConfig, boolean>>
  ): void {
    if (!textNodes.length) {
      return;
    }

    const stringValues: Array<{
      key: 'fontFamily' | 'fontSize' | 'textColor' | 'letterSpacing';
      values: string[];
      same?: (first: string, second: string) => boolean;
    }> = [
      {
        key: 'fontFamily',
        values: textNodes.map((node) =>
          this.normalizeFontFamily(
            this.toStringValue(this.getNodeMark(node, MARK_FONT_TYPE)?.attrs.name)
          ) ?? fallback.fontFamily
        ),
        same: (first, second) => this.sameNormalizedString(first, second),
      },
      {
        key: 'fontSize',
        values: textNodes.map((node) =>
          this.normalizeFontSizeForDialog(
            this.toMarkedFontSize(
              this.getNodeMark(node, MARK_FONT_SIZE)?.attrs.pt
            )
          ) ?? fallback.fontSize
        ),
        same: (first, second) => this.sameCssNumericValue(first, second),
      },
      {
        key: 'textColor',
        values: textNodes.map((node) =>
          this.toStringValue(
            this.getNodeMark(node, MARK_TEXT_COLOR)?.attrs.color
          ) ?? fallback.textColor
        ),
        same: (first, second) => this.sameColorValue(first, second),
      },
      {
        key: 'letterSpacing',
        values: textNodes.map((node) =>
          this.toStringValue(
            this.getNodeMark(node, MARK_LETTER_SPACING)?.attrs.letterSpacing
          ) ?? fallback.letterSpacing
        ),
        same: (first, second) => this.sameCssNumericValue(first, second),
      },
    ];

    for (const {key, values, same} of stringValues) {
      const value = this.getUniformStringValue(values, same);
      if (value === null) {
        mixed[key] = true;
        typography[key] = '';
      } else {
        typography[key] = value;
      }
    }

    for (const [key, markName] of [
      ['bold', MARK_STRONG],
      ['italic', MARK_EM],
      ['underline', MARK_UNDERLINE],
    ] as const) {
      const values = textNodes.map(
        (node) => fallback[key] || Boolean(this.getNodeMark(node, markName))
      );
      const isMixed = values.some((value) => value !== values[0]);
      if (isMixed) {
        mixed[key] = true;
        typography[key] = false;
      } else {
        typography[key] = values[0] ?? fallback[key];
      }
    }
  }

  resolveTextBlockTypography(
    textBlocks: ProseMirrorNode[],
    fallback: TypographyConfig,
    typography: TypographyConfig,
    mixed: Partial<Record<keyof TypographyConfig, boolean>>
  ): void {
    if (!textBlocks.length) {
      return;
    }

    const textAlignments = textBlocks.map((node) =>
      this.toTextAlign(
        this.toStringValue(node.attrs.align) ??
        this.toStringValue(node.attrs.textAlign) ??
        this.toStringValue(node.attrs.overriddenAlignValue),
        fallback.textAlign
      )
    );
    const lineHeights = textBlocks.map((node) =>
      this.toStringValue(node.attrs.lineSpacing) ??
      this.toStringValue(node.attrs.lineHeight) ??
      this.toStringValue(node.attrs.overriddenLineSpacingValue) ??
      fallback.lineHeight
    );
    const textAlignment = this.getUniformStringValue(textAlignments);
    const lineHeight = this.getUniformStringValue(
      lineHeights,
      (first, second) => this.sameCssNumericValue(first, second)
    );

    if (textAlignment === null) {
      mixed.textAlign = true;
      typography.textAlign = '';
    } else {
      typography.textAlign = this.toTextAlign(textAlignment, '');
    }
    if (lineHeight === null) {
      mixed.lineHeight = true;
      typography.lineHeight = '';
    } else {
      typography.lineHeight = lineHeight;
    }
  }

  getNodeMark(node: ProseMirrorNode, markName: string) {
    return node.marks.find((mark) => mark.type.name === markName);
  }

  getUniformStringValue(
    values: string[],
    sameValue: (first: string, second: string) => boolean =
      (first, second) => first === second
  ): string | null {
    const first = values[0];
    if (first === undefined) {
      return null;
    }
    return values.every((value) => sameValue(first, value)) ? first : null;
  }

  sameTypographyValue(
    key: keyof TypographyConfig,
    first: TypographyConfig[keyof TypographyConfig],
    second: TypographyConfig[keyof TypographyConfig]
  ): boolean {
    if (key === 'fontSize' || key === 'letterSpacing' || key === 'lineHeight') {
      return this.sameCssNumericValue(String(first), String(second));
    }
    if (key === 'textColor' || key === 'backgroundColor') {
      return this.sameColorValue(String(first), String(second));
    }
    if (key === 'fontFamily') {
      return this.sameNormalizedString(String(first), String(second));
    }
    return first === second;
  }

  emptyTypographyValue(key: keyof TypographyConfig): string | boolean {
    return key === 'bold' || key === 'italic' || key === 'underline' ? false : '';
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

  toColorValue(value: unknown): string | null {
    if (typeof value === 'object' && value !== null && 'color' in value) {
      return this.toStringValue((value as {color?: unknown}).color);
    }
    return this.toStringValue(value);
  }

  toStringOrNumberValue(value: unknown): string | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    return this.toStringValue(value);
  }

  toMarkedFontSize(value: unknown): string | null {
    const fontSize = this.toStringOrNumberValue(value);
    if (!fontSize) {
      return null;
    }
    return /[a-z%]/i.test(fontSize) ? fontSize : `${fontSize}pt`;
  }

  normalizeTransparentColor(value: string | null | undefined): string | null {
    const normalized = this.normalizeString(value);
    if (!normalized) {
      return null;
    }

    try {
      if (Color(normalized).alpha() === 0) {
        return null;
      }
    } catch {
      // Keep valid browser-specific color tokens that the color package does
      // not understand; only fully transparent values are removed here.
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

  toTextAlign(
    value: string | undefined | null,
    fallback: TypographyConfig['textAlign'] = DEFAULT_TYPOGRAPHY.textAlign
  ): TypographyConfig['textAlign'] {
    if (
      value === 'center' ||
      value === 'right' ||
      value === 'justify' ||
      value === 'left'
    ) {
      return value;
    }
    return fallback;
  }

  toVerticalAlign(
    value: string | undefined | null,
    fallback: TypographyConfig['verticalAlign'] = DEFAULT_TYPOGRAPHY.verticalAlign
  ): TypographyConfig['verticalAlign'] {
    if (value === 'top' || value === 'bottom' || value === 'middle') {
      return value;
    }
    return fallback;
  }

  isBold(fontWeight: string | undefined | null): boolean {
    const normalized = fontWeight?.trim().toLowerCase();
    if (!normalized) {
      return false;
    }
    return (
      normalized === 'bold' ||
      normalized === 'bolder' ||
      Number.parseInt(normalized, 10) >= 600
    );
  }

  isItalic(fontStyle: string | undefined | null): boolean {
    const normalized = fontStyle?.trim().toLowerCase();
    return normalized === 'italic' || normalized === 'oblique';
  }

  isUnderlined(textDecoration: string | undefined | null): boolean {
    return textDecoration?.toLowerCase().includes('underline') ?? false;
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

  getFontOptions(currentFontFamily: string): FontOption[] {
    const options = [
      {label: 'Default Font', value: 'inherit'},
      ...FONT_TYPE_NAMES.map((fontName) => ({
        label: fontName,
        value: fontName,
      })),
    ];
    const current = this.normalizeFontFamily(currentFontFamily);

    if (
      current &&
      current.toLowerCase() !== 'inherit' &&
      !options.some((option) => option.value.toLowerCase() === current.toLowerCase())
    ) {
      options.push({label: current, value: current});
    }

    return options;
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

    const selectedCellRect = tableMap.findCell(cellPosRelative);
    const selectedColumnCount = selectedCellRect.right - selectedCellRect.left;
    const selectedCell = tr.doc.nodeAt(cellRef.pos);
    const selectedColumnWidths = this.distributeColumnWidth(
      width,
      selectedColumnCount,
      Array.isArray(selectedCell?.attrs.colwidth)
        ? selectedCell.attrs.colwidth
        : undefined
    );
    if (!selectedColumnWidths.length) {
      return tr;
    }

    const cellUpdates = new Map<number, ColumnWidthUpdate>();

    this.collectColumnWidthUpdates(
      tr,
      tableRef,
      tableMap,
      selectedCellRect,
      selectedColumnWidths,
      cellUpdates
    );

    return this.applyColumnWidthUpdates(tr, cellUpdates);
  }

  collectColumnWidthUpdates(
    tr: Transaction,
    tableRef: ParentNodeRef,
    tableMap: TableMap,
    selectedCellRect: CellRect,
    selectedColumnWidths: number[],
    cellUpdates: Map<number, ColumnWidthUpdate>
  ): void {

    for (
      let column = selectedCellRect.left;
      column < selectedCellRect.right;
      column++
    ) {
      const columnWidth = selectedColumnWidths[column - selectedCellRect.left];

      for (let row = 0; row < tableMap.height; row++) {
        const mappedCellPos = tableMap.map[row * tableMap.width + column];
        const absoluteCellPos = tableRef.start + mappedCellPos;
        const update = this.getColumnWidthUpdate(
          tr,
          absoluteCellPos,
          cellUpdates
        );
        if (!update) {
          continue;
        }

        const mappedCellRect = tableMap.findCell(mappedCellPos);
        const colwidthIndex = column - mappedCellRect.left;
        if (colwidthIndex >= 0 && colwidthIndex < update.colwidth.length) {
          update.colwidth[colwidthIndex] = columnWidth;
        }
      }
    }
  }

  getColumnWidthUpdate(
    tr: Transaction,
    absoluteCellPos: number,
    cellUpdates: Map<number, ColumnWidthUpdate>
  ): ColumnWidthUpdate | null {
    const existing = cellUpdates.get(absoluteCellPos);
    if (existing) {
      return existing;
    }

    const currentCell = tr.doc.nodeAt(absoluteCellPos);
    if (!currentCell) {
      return null;
    }

    const colspan = Number(currentCell.attrs.colspan) || 1;
    const currentColwidth = Array.isArray(currentCell.attrs.colwidth)
      ? currentCell.attrs.colwidth
      : [];
    const update = {
      cell: currentCell,
      colwidth: Array.from({length: colspan}, (_, index) => {
        const currentWidth = currentColwidth[index];
        return typeof currentWidth === 'number' && Number.isFinite(currentWidth)
          ? currentWidth
          : 0;
      }),
    };
    cellUpdates.set(absoluteCellPos, update);
    return update;
  }

  applyColumnWidthUpdates(
    tr: Transaction,
    cellUpdates: Map<number, ColumnWidthUpdate>
  ): Transaction {
    for (const [absoluteCellPos, update] of cellUpdates) {
      const currentColwidth = update.cell.attrs.colwidth;
      const nextColwidth = this.sameColumnWidths(
        currentColwidth,
        update.colwidth
      )
        ? currentColwidth
        : update.colwidth;
      const nextAttrs: Record<string, unknown> = {
        ...update.cell.attrs,
        colwidth: nextColwidth,
      };

      if (Object.hasOwn(update.cell.attrs, 'cellWidth')) {
        nextAttrs.cellWidth = this.getCellWidthFromColwidth(update.colwidth);
      }

      if (!this.sameAttrs(update.cell.attrs, nextAttrs)) {
        tr = tr.setNodeMarkup(absoluteCellPos, undefined, nextAttrs);
      }
    }

    return tr;
  }

  distributeColumnWidth(
    width: number,
    columnCount: number,
    currentColwidth?: readonly unknown[]
  ): number[] {
    if (!Number.isFinite(width) || width <= 0 || columnCount <= 0) {
      return [];
    }

    const totalWidth = Math.round(width);
    if (totalWidth <= 0) {
      return [];
    }

    const hasValidCurrentWidths =
      currentColwidth?.length === columnCount &&
      currentColwidth.every(
        (currentWidth) =>
          typeof currentWidth === 'number' &&
          Number.isFinite(currentWidth) &&
          currentWidth > 0
      );
    const weights: number[] = hasValidCurrentWidths
      ? (currentColwidth as number[]).slice()
      : Array.from({length: columnCount}, () => 1);
    const currentTotal = weights.reduce((sum, currentWidth) => {
      return sum + currentWidth;
    }, 0);

    if (hasValidCurrentWidths && this.nearlyEqual(totalWidth, currentTotal)) {
      return weights;
    }

    const exactWidths = weights.map((currentWidth) => {
      return (currentWidth / currentTotal) * totalWidth;
    });
    const distributedWidths = exactWidths.map(Math.floor);
    const distributedTotal = distributedWidths.reduce((sum, currentWidth) => {
      return sum + currentWidth;
    }, 0);
    const remainder = totalWidth - distributedTotal;
    const remainderOrder = exactWidths
      .map((exactWidth, index) => ({
        index,
        fraction: exactWidth - distributedWidths[index],
      }))
      .sort((first, second) => {
        return second.fraction - first.fraction || first.index - second.index;
      });

    for (let index = 0; index < remainder; index++) {
      distributedWidths[remainderOrder[index].index]++;
    }

    return distributedWidths;
  }

  sameColumnWidths(first: unknown, second: readonly number[]): boolean {
    return (
      Array.isArray(first) &&
      first.length === second.length &&
      first.every((width, index) => width === second[index])
    );
  }

  getCellWidthFromColwidth(colwidth: number[]): string | null {
    if (!colwidth.length || colwidth.some((width) => width <= 0)) {
      return null;
    }

    const totalWidth = colwidth.reduce((sum, width) => sum + width, 0);
    return `${this.formatCssNumber(totalWidth)}px`;
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
        cellWidth: cellWidth
          ? currentCell.attrs.cellWidth
          : this.normalizeString(inputs.cellWidth),
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
    result: TableEditorResult,
    initialData?: TableEditorDialogData
  ): void {
    const selectedCells = this.getTargetCells(nodes, result.borders.applyMode);
    if (!selectedCells.length) {
      view.focus();
      return;
    }

    const changes = this.getApplyChanges(result, initialData);
    let tr = view.state.tr;
    tr = this.applyTableEditorTableAttrs(tr, nodes, selectedCells, result, changes);

    for (const cellRef of selectedCells) {
      tr = this.applyCellEditorAttrs(tr, cellRef, result, changes);
      tr = this.applyCellParagraphOverrides(tr, cellRef, result, changes);
      tr = this.applyCellInlineOverrides(
        tr,
        cellRef,
        result,
        view.state.schema,
        changes
      );
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

    if (nodes.cells?.length) {
      return nodes.cells;
    }

    if (nodes.cell) {
      return [nodes.cell];
    }

    return [];
  }

  getApplyChanges(
    result: TableEditorResult,
    initialData?: TableEditorDialogData
  ): TableEditorApplyChanges {
    if (result.changed) {
      return this.getExplicitApplyChanges(result.changed);
    }

    return this.getInferredApplyChanges(result, initialData);
  }

  getExplicitApplyChanges(
    changed: TableEditorChangedFields
  ): TableEditorApplyChanges {
    const typography = changed.typography;
    const layout = changed.layout;
    const table = changed.table;
    return {
      fontFamily: Boolean(typography?.fontFamily),
      fontSize: Boolean(typography?.fontSize),
      bold: Boolean(typography?.bold),
      italic: Boolean(typography?.italic),
      underline: Boolean(typography?.underline),
      textColor: Boolean(typography?.textColor),
      backgroundColor: Boolean(typography?.backgroundColor),
      letterSpacing: Boolean(typography?.letterSpacing),
      lineHeight: Boolean(typography?.lineHeight),
      textAlign: Boolean(typography?.textAlign),
      verticalAlign: Boolean(typography?.verticalAlign),
      paddingTop: Boolean(layout?.paddingTop),
      paddingRight: Boolean(layout?.paddingRight),
      paddingBottom: Boolean(layout?.paddingBottom),
      paddingLeft: Boolean(layout?.paddingLeft),
      paddingLocked: Boolean(layout?.paddingLocked),
      tableHeight: Boolean(table?.tableHeight),
      selectedCellWidth: Boolean(table?.selectedCellWidth),
      selectedCellHeight: Boolean(table?.selectedCellHeight),
    };
  }

  getInferredApplyChanges(
    result: TableEditorResult,
    initialData?: TableEditorDialogData
  ): TableEditorApplyChanges {
    const initialTypography = initialData?.typography;
    const initialLayout = initialData?.layout;
    const initialTable = initialData?.table;

    return {
      fontFamily: this.hasInitialValueChanged(initialTypography, (initial) =>
        this.sameNormalizedString(
          this.normalizeInheritedValue(result.typography.fontFamily),
          this.normalizeInheritedValue(initial.fontFamily)
        )
      ),
      fontSize: this.hasInitialValueChanged(initialTypography, (initial) =>
        this.sameCssNumericValue(
          result.typography.fontSize,
          initial.fontSize
        )
      ),
      bold: this.hasInitialValueChanged(
        initialTypography,
        (initial) => result.typography.bold === initial.bold
      ),
      italic: this.hasInitialValueChanged(
        initialTypography,
        (initial) => result.typography.italic === initial.italic
      ),
      underline: this.hasInitialValueChanged(
        initialTypography,
        (initial) => result.typography.underline === initial.underline
      ),
      textColor: this.hasInitialValueChanged(initialTypography, (initial) =>
        this.sameColorValue(
          result.typography.textColor,
          initial.textColor
        )
      ),
      backgroundColor: this.hasInitialValueChanged(
        initialTypography,
        (initial) => this.sameColorValue(
          this.normalizeTransparentResult(result.typography.backgroundColor),
          this.normalizeTransparentResult(initial.backgroundColor)
        )
      ),
      letterSpacing: this.hasInitialValueChanged(initialTypography, (initial) =>
        this.sameCssNumericValue(
          result.typography.letterSpacing,
          initial.letterSpacing
        )
      ),
      lineHeight: this.hasInitialValueChanged(initialTypography, (initial) =>
        this.sameCssNumericValue(
          result.typography.lineHeight,
          initial.lineHeight
        )
      ),
      textAlign: this.hasInitialValueChanged(initialTypography, (initial) =>
        this.sameNormalizedString(
          result.typography.textAlign,
          initial.textAlign
        )
      ),
      verticalAlign: this.hasInitialValueChanged(initialTypography, (initial) =>
        this.sameNormalizedString(
          result.typography.verticalAlign,
          initial.verticalAlign
        )
      ),
      paddingTop: this.hasInitialValueChanged(initialLayout, (initial) =>
        this.samePixelDimensionValue(
          result.layout.paddingTop,
          initial.paddingTop
        )
      ),
      paddingRight: this.hasInitialValueChanged(initialLayout, (initial) =>
        this.samePixelDimensionValue(
          result.layout.paddingRight,
          initial.paddingRight
        )
      ),
      paddingBottom: this.hasInitialValueChanged(initialLayout, (initial) =>
        this.samePixelDimensionValue(
          result.layout.paddingBottom,
          initial.paddingBottom
        )
      ),
      paddingLeft: this.hasInitialValueChanged(initialLayout, (initial) =>
        this.samePixelDimensionValue(
          result.layout.paddingLeft,
          initial.paddingLeft
        )
      ),
      paddingLocked: this.hasInitialValueChanged(
        initialLayout,
        (initial) => result.layout.paddingLocked === initial.paddingLocked
      ),
      tableHeight: this.hasInitialValueChanged(initialTable, (initial) =>
        this.samePixelDimensionValue(
          result.table.tableHeight,
          initial.tableHeight
        )
      ),
      selectedCellWidth: this.hasInitialValueChanged(initialTable, (initial) =>
        this.samePixelDimensionValue(
          result.table.selectedCellWidth,
          initial.selectedCellWidth
        )
      ),
      selectedCellHeight: this.hasInitialValueChanged(initialTable, (initial) =>
        this.samePixelDimensionValue(
          result.table.selectedCellHeight,
          initial.selectedCellHeight
        )
      ),
    };
  }

  hasInitialValueChanged<T>(
    initialValue: T | undefined,
    isSame: (initialValue: T) => boolean
  ): boolean {
    return initialValue === undefined || !isSame(initialValue);
  }

  sameNormalizedString(
    first: string | null | undefined,
    second: string | null | undefined
  ): boolean {
    return this.normalizeString(first) === this.normalizeString(second);
  }

  sameColorValue(
    first: string | null | undefined,
    second: string | null | undefined
  ): boolean {
    return this.normalizeColorValue(first) === this.normalizeColorValue(second);
  }

  normalizeColorValue(value: string | null | undefined): string | null {
    const normalized = this.normalizeString(value)?.toLowerCase();
    if (!normalized) {
      return null;
    }

    try {
      const color = Color(normalized);
      if (color.alpha() === 0) {
        return 'transparent';
      }
      if (color.alpha() === 1) {
        return String(color.hex()).toLowerCase();
      }
      return String(color.rgb().string()).toLowerCase();
    } catch {
      // Preserve browser-specific tokens such as currentColor so change
      // detection remains stable even when they are not parseable here.
      return normalized;
    }
  }

  sameCssNumericValue(
    first: string | null | undefined,
    second: string | null | undefined
  ): boolean {
    const firstValue = this.parseCssNumericValue(first);
    const secondValue = this.parseCssNumericValue(second);

    if (firstValue === null || secondValue === null) {
      return this.normalizeString(first) === this.normalizeString(second);
    }

    if (firstValue.value === 0 && secondValue.value === 0) {
      return true;
    }

    const firstAbsoluteFactor = ABSOLUTE_CSS_UNIT_TO_PX[firstValue.unit];
    const secondAbsoluteFactor = ABSOLUTE_CSS_UNIT_TO_PX[secondValue.unit];
    if (
      firstAbsoluteFactor !== undefined &&
      secondAbsoluteFactor !== undefined
    ) {
      return this.nearlyEqual(
        firstValue.value * firstAbsoluteFactor,
        secondValue.value * secondAbsoluteFactor
      );
    }

    return (
      firstValue.unit === secondValue.unit &&
      this.nearlyEqual(firstValue.value, secondValue.value)
    );
  }

  samePixelDimensionValue(
    first: string | null | undefined,
    second: string | null | undefined
  ): boolean {
    const firstPixels = this.normalizeCssNumericValue(first);
    const secondPixels = this.normalizeCssNumericValue(second);

    return firstPixels === null || secondPixels === null
      ? this.sameNormalizedString(first, second)
      : this.nearlyEqual(firstPixels, secondPixels);
  }

  sameAttrs(
    first: Record<string, unknown>,
    second: Record<string, unknown>
  ): boolean {
    const keys = new Set([...Object.keys(first), ...Object.keys(second)]);

    for (const key of keys) {
      if (first[key] !== second[key]) {
        return false;
      }
    }

    return true;
  }

  normalizeCssNumericValue(value: string | null | undefined): number | null {
    const parsed = this.parseCssNumericValue(value);
    if (!parsed) {
      return null;
    }

    const absoluteFactor = ABSOLUTE_CSS_UNIT_TO_PX[parsed.unit];
    if (absoluteFactor !== undefined) {
      return parsed.value * absoluteFactor;
    }

    return parsed.unit === '' ? parsed.value : null;
  }

  parseCssNumericValue(
    value: string | null | undefined
  ): CssNumericValue | null {
    const normalized = this.normalizeString(value);
    if (!normalized) {
      return null;
    }

    const match = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*([a-z%]*)$/i.exec(
      normalized
    );
    if (!match?.[1]) {
      return null;
    }

    const parsed = Number.parseFloat(match[1]);
    return Number.isFinite(parsed)
      ? {value: parsed, unit: (match[2] ?? '').toLowerCase()}
      : null;
  }

  nearlyEqual(first: number, second: number): boolean {
    return Math.abs(first - second) <= 0.0001;
  }

  toOptionalCssValue(enabled: boolean, value: string): string | null {
    return enabled ? value : null;
  }

  applyTableEditorTableAttrs(
    tr: Transaction,
    nodes: TableDetailNodeRefs,
    selectedCells: ParentNodeRef[],
    result: TableEditorResult,
    changes: TableEditorApplyChanges
  ): Transaction {
    const currentTable = tr.doc.nodeAt(nodes.table.pos) ?? nodes.table.node;
    if (changes.tableHeight) {
      tr = tr.setNodeMarkup(nodes.table.pos, undefined, {
        ...currentTable.attrs,
        tableHeight: this.normalizeString(result.table.tableHeight),
      });
    }

    const cellWidth = this.normalizeSizeAsNumber(
      result.table.selectedCellWidth ?? ''
    );
    if (changes.selectedCellWidth && cellWidth) {
      for (const cellRef of selectedCells) {
        tr = this.applyColumnWidth(tr, nodes.table, cellRef, cellWidth);
      }
    }

    const rowHeight = this.normalizeString(
      result.table.selectedCellHeight ?? ''
    );
    if (changes.selectedCellHeight && rowHeight) {
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
    if (tableNode?.type.spec.tableRole !== 'table') {
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
    result: TableEditorResult,
    changes: TableEditorApplyChanges
  ): Transaction {
    const currentCell = tr.doc.nodeAt(cellRef.pos) ?? cellRef.node;
    const nextAttrs: Record<string, unknown> = {...currentCell.attrs};

    this.applyChangedCellTypographyAttrs(nextAttrs, result, changes);
    this.applyChangedCellLayoutAttrs(nextAttrs, result, changes);

    return this.sameAttrs(currentCell.attrs, nextAttrs)
      ? tr
      : tr.setNodeMarkup(cellRef.pos, undefined, nextAttrs);
  }

  applyChangedCellTypographyAttrs(
    nextAttrs: Record<string, unknown>,
    result: TableEditorResult,
    changes: TableEditorApplyChanges
  ): void {
    if (changes.fontFamily) {
      const fontName = this.normalizeInheritedValue(result.typography.fontFamily);
      nextAttrs.fontName = fontName;
      nextAttrs.fontNameOverridden = Boolean(fontName);
    }
    if (changes.fontSize) {
      const fontSize = this.normalizeString(result.typography.fontSize);
      nextAttrs.fontSize = fontSize;
      nextAttrs.fontSizeOverridden = Boolean(fontSize);
    }
    this.applyChangedCellTextStyleAttrs(nextAttrs, result, changes);
    if (changes.textColor) {
      const textColor = this.normalizeString(result.typography.textColor);
      nextAttrs.textColor = textColor;
      nextAttrs.textColorOverridden = Boolean(textColor);
    }
    if (changes.backgroundColor) {
      const backgroundColor = this.normalizeTransparentResult(
        result.typography.backgroundColor
      );
      nextAttrs.backgroundColor = backgroundColor;
      nextAttrs.backgroundColorOverridden = Boolean(backgroundColor);
    }
    if (changes.letterSpacing) {
      const letterSpacing = this.normalizeString(result.typography.letterSpacing);
      nextAttrs.letterSpacing = letterSpacing;
      nextAttrs.letterSpacingOverridden = Boolean(letterSpacing);
    }
    if (changes.lineHeight) {
      const lineHeight = this.normalizeString(result.typography.lineHeight);
      nextAttrs.lineHeight = lineHeight;
      nextAttrs.lineHeightOverridden = Boolean(lineHeight);
    }
    if (changes.textAlign) {
      const textAlign = this.normalizeString(result.typography.textAlign);
      nextAttrs.textAlign = textAlign;
      nextAttrs.textAlignOverridden = Boolean(textAlign);
    }
    if (changes.verticalAlign) {
      const verticalAlign = this.normalizeString(result.typography.verticalAlign);
      nextAttrs.verticalAlign = verticalAlign;
      nextAttrs.verticalAlignOverridden = Boolean(verticalAlign);
    }
  }

  applyChangedCellTextStyleAttrs(
    nextAttrs: Record<string, unknown>,
    result: TableEditorResult,
    changes: TableEditorApplyChanges
  ): void {
    if (changes.bold) {
      nextAttrs.fontWeight = result.typography.bold ? 'bold' : 'normal';
      nextAttrs.fontWeightOverridden = true;
    }
    if (changes.italic) {
      nextAttrs.fontStyle = result.typography.italic ? 'italic' : 'normal';
      nextAttrs.fontStyleOverridden = true;
    }
    if (changes.underline) {
      nextAttrs.textDecoration = result.typography.underline
        ? 'underline'
        : 'none';
      nextAttrs.textDecorationOverridden = true;
    }
  }

  applyChangedCellLayoutAttrs(
    nextAttrs: Record<string, unknown>,
    result: TableEditorResult,
    changes: TableEditorApplyChanges
  ): void {
    if (changes.paddingTop) {
      nextAttrs.paddingTop = this.normalizeString(result.layout.paddingTop);
    }
    if (changes.paddingRight) {
      nextAttrs.paddingRight = this.normalizeString(result.layout.paddingRight);
    }
    if (changes.paddingBottom) {
      nextAttrs.paddingBottom = this.normalizeString(result.layout.paddingBottom);
    }
    if (changes.paddingLeft) {
      nextAttrs.paddingLeft = this.normalizeString(result.layout.paddingLeft);
    }
  }

  applyCellParagraphOverrides(
    tr: Transaction,
    cellRef: ParentNodeRef,
    result: TableEditorResult,
    changes: TableEditorApplyChanges
  ): Transaction {
    const currentCell = tr.doc.nodeAt(cellRef.pos);
    if (!currentCell) {
      return tr;
    }

    currentCell.descendants((node, pos) => {
      if (node.type.name !== 'paragraph') {
        return;
      }

      const attrs = {...node.attrs};
      let changed = false;
      const textAlign = this.normalizeString(result.typography.textAlign);
      const lineSpacing = this.normalizeLineSpacingValue(
        result.typography.lineHeight
      );

      if (changes.textAlign && Object.hasOwn(attrs, 'align')) {
        attrs.align = textAlign;
        attrs.overriddenAlign = Boolean(textAlign);
        attrs.overriddenAlignValue = textAlign;
        changed = true;
      }

      if (
        changes.lineHeight &&
        Object.hasOwn(attrs, 'lineSpacing')
      ) {
        attrs.lineSpacing = lineSpacing;
        attrs.overriddenLineSpacing = Boolean(lineSpacing);
        attrs.overriddenLineSpacingValue = lineSpacing;
        changed = true;
      }

      if (changed && !this.sameAttrs(node.attrs, attrs)) {
        tr = tr.setNodeMarkup(cellRef.start + pos, undefined, attrs);
      }
      return false;
    });

    return tr;
  }

  applyCellInlineOverrides(
    tr: Transaction,
    cellRef: ParentNodeRef,
    result: TableEditorResult,
    schema: Schema,
    changes: TableEditorApplyChanges
  ): Transaction {
    const currentCell = tr.doc.nodeAt(cellRef.pos);
    if (!currentCell) {
      return tr;
    }

    const markUpdates = this.getInlineMarkUpdates(result, schema, changes);
    if (!markUpdates.length) {
      return tr;
    }

    currentCell.descendants((node, pos) => {
      if (!node.isText) {
        return;
      }

      const from = cellRef.start + pos;
      const to = from + node.nodeSize;

      for (const update of markUpdates) {
        tr = tr.removeMark(from, to, update.markType);
        if (update.attrs) {
          tr = tr.addMark(from, to, update.markType.create(update.attrs));
        }
      }

      return false;
    });

    return tr;
  }

  getInlineMarkUpdates(
    result: TableEditorResult,
    schema: Schema,
    changes: TableEditorApplyChanges
  ): {markType: MarkType; attrs: Record<string, unknown> | null}[] {
    const updates: {markType: MarkType; attrs: Record<string, unknown> | null}[] = [];
    if (changes.fontSize) {
      this.addMarkUpdate(updates, schema, MARK_FONT_SIZE, {
        pt: this.normalizeFontPointSize(result.typography.fontSize),
        overridden: true,
      });
    }
    if (changes.fontFamily) {
      this.addMarkUpdate(updates, schema, MARK_FONT_TYPE, {
        name: this.normalizeInheritedValue(result.typography.fontFamily),
        overridden: true,
      });
    }
    if (changes.textColor) {
      this.addMarkUpdate(updates, schema, MARK_TEXT_COLOR, {
        color: this.normalizeString(result.typography.textColor),
        overridden: true,
      });
    }
    if (changes.letterSpacing) {
      this.addMarkUpdate(updates, schema, MARK_LETTER_SPACING, {
        letterSpacing: this.normalizeString(result.typography.letterSpacing),
        overridden: true,
      });
    }
    if (changes.bold) {
      this.addMarkUpdate(
        updates,
        schema,
        MARK_STRONG,
        result.typography.bold ? {overridden: true} : null
      );
    }
    if (changes.italic) {
      this.addMarkUpdate(
        updates,
        schema,
        MARK_EM,
        result.typography.italic ? {overridden: true} : null
      );
    }
    if (changes.underline) {
      this.addMarkUpdate(
        updates,
        schema,
        MARK_UNDERLINE,
        result.typography.underline ? {overridden: true} : null
      );
    }

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
    if (tableNode?.type.spec.tableRole !== 'table') {
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
    const parsed = this.parseCssNumericValue(value);
    if (!parsed || parsed.value <= 0) {
      return null;
    }

    if (parsed.unit === '' || parsed.unit === 'pt') {
      return parsed.value;
    }

    const absoluteFactor = ABSOLUTE_CSS_UNIT_TO_PX[parsed.unit];
    return absoluteFactor === undefined
      ? null
      : parsed.value * absoluteFactor * (72 / 96);
  }

  normalizeFontSizeForDialog(
    value: string | null | undefined
  ): string | null {
    const pointSize = this.normalizeFontPointSize(value);
    if (pointSize === null) {
      return this.normalizeString(value);
    }

    return `${this.formatCssNumber(pointSize)}pt`;
  }

  formatCssNumber(value: number): string {
    return String(Number(value.toFixed(4)));
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
    return normalized || null;
  }

  cancel(): void {
    // Dialog lifecycle is owned by the host runtime.
  }
}

export default TableDetailsCommand;
