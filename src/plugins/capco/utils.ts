/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Compartment } from './compartment';
import { CapcoState } from './types';
import { EditorState } from 'prosemirror-state';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { IMAGE, TABLE, TABLE_FIGURE } from './constants';
export function getValueWithoutSlash(markerInputvalue: string): string {
  if (markerInputvalue.endsWith('/')) {
    markerInputvalue = markerInputvalue.substring(
      0,
      markerInputvalue.length - 1
    );
    if (markerInputvalue.endsWith('/')) {
      markerInputvalue = markerInputvalue.substring(
        0,
        markerInputvalue.length - 1
      );
    }
  } else if (markerInputvalue.trim().endsWith(',')) {
    markerInputvalue = markerInputvalue.substring(
      0,
      markerInputvalue.length - 1
    );
    if (markerInputvalue.endsWith(',')) {
      markerInputvalue = markerInputvalue.substring(
        0,
        markerInputvalue.length - 1
      );
    }
  }
  return markerInputvalue;
}

export type onCompartmentAdd = (_item: Compartment) => HTMLElement;

export function getCursorPosition(e: Event): number | undefined {
  let position: number;
  if (e.target instanceof HTMLInputElement) {
    position = e.target.selectionStart;

    if (e instanceof KeyboardEvent) {
      if ('ArrowRight' === e.code) {
        if (0 <= position) {
          position++;
        }
      }
    }
  }
  return position;
}

export function safeCapcoParse(
  capco: unknown,
  fallback?: CapcoState
): CapcoState {
  const resolvedFallback: CapcoState =
    fallback ?? { ism: undefined, portionMarking: 'error' };

  if (capco && typeof capco === 'string') {
    try {
      return JSON.parse(capco) as CapcoState;
    } catch (e) {
      console.warn('could not parse capco text: ' + capco, e);
    }
  }

  if (capco && typeof capco === 'object') {
    return capco as CapcoState;
  }

  return resolvedFallback;
}


export function getCapcoString(capco: unknown, fallback = 'error'): string {
  const portionMarking = safeCapcoParse(capco, { ism: null, portionMarking: fallback })
    .portionMarking;
  return portionMarking?.trim() ? portionMarking : 'TBD';
}

export function getBlockControlCapco(state: EditorState, pos: number): number {
  const figure = findEnhancedTableFigure(state, pos);
  if (!figure) {
    return pos;
  }

  const body = findDirectChild(figure.node, 'enhanced_table_figure_body');
  if (!body) {
    return pos;
  }

  const payloadType =
    figure.node.attrs?.figureType === 'figure' ? IMAGE : TABLE;
  let payloadPos: number | undefined;
  body.node.descendants((node, relativePos) => {
    if (payloadPos !== undefined) {
      return false;
    }
    if (node.type.name === payloadType) {
      payloadPos = figure.pos + body.offset + relativePos + 2;
      return false;
    }
    return true;
  });

  return payloadPos ?? pos;
}

export function isInsideEnhancedTableFigureBody(
  state: EditorState,
  pos: number
): boolean {
  const $pos = state.doc.resolve(pos);
  for (let depth = $pos.depth; depth > 0; depth--) {
    if ($pos.node(depth).type.name === 'enhanced_table_figure_body') {
      return true;
    }
  }
  return false;
}

function findEnhancedTableFigure(
  state: EditorState,
  pos: number
): { node: ProseMirrorNode; pos: number } | null {
  const nodeAtPos = state.doc.nodeAt(pos);
  if (nodeAtPos?.type.name === TABLE_FIGURE) {
    return { node: nodeAtPos, pos };
  }

  const $pos = state.doc.resolve(pos);
  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth);
    if (node.type.name === TABLE_FIGURE) {
      return { node, pos: $pos.before(depth) };
    }
  }
  return null;
}

function findDirectChild(
  parent: ProseMirrorNode,
  typeName: string
): { node: ProseMirrorNode; offset: number } | null {
  let result: { node: ProseMirrorNode; offset: number } | null = null;
  parent.forEach((node, offset) => {
    if (!result && node.type.name === typeName) {
      result = { node, offset };
    }
  });
  return result;
}
