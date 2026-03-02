/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { Schema } from 'prosemirror-model';
import {
  toMarkDOM,
  getMarkAttrs,
  getAttrsFromDomFn,
  toDOMFn,
} from './CitationHighlightMarkSpec';
import { MARK_TEXT_HIGHLIGHT, HASCITATION, MARKFROM } from './Constants';
import type { DOMOutputSpec, Node, NodeSpec } from 'prosemirror-model';

const CONTENT = 'content';
const ATTRS = 'getAttrs';
const PARSEDOM = 'parseDOM';
const TODOM = 'toDOM';

export function effectiveSchema(schema: Schema): Schema {
  if (schema.spec) {
    createCitationMarkAttributes(schema);
  }
  return schema;
}

function createAttribute(content: NodeSpec, newAttrs: string[], value: null) {
  const requiredAttrs = [...newAttrs];
  const attr = content.attrs && Object.keys(content.attrs)[0];
  requiredAttrs.forEach((key) => {
    if (content) {
      let citationAttrSpec = content.attrs?.[key];
      if (attr && content.attrs && !citationAttrSpec) {
        const contentAttr = content.attrs[attr];
        citationAttrSpec = Object.assign(
          Object.create(Object.getPrototypeOf(contentAttr)),
          contentAttr
        );
        if (citationAttrSpec) {
          citationAttrSpec.default = value;
          content.attrs[key] = citationAttrSpec;
        }
      }
    }
  });
}

function getContent(
  type: string,
  schema: Schema,
  nodeAttrs: getAttrsFromDomFn,
  toDOM: (base: toDOMFn, node: Node) => DOMOutputSpec
) {
  let content: Record<string, unknown> = null;
  const contentArr = schema.spec.marks.get(CONTENT);
  const len = contentArr?.length;
  for (let i = 0; i < len; i += 2) {
    if (type === contentArr?.[i]) {
      content = contentArr[i + 1];
      // Always append to base calls.
      content[PARSEDOM][0][ATTRS] = nodeAttrs.bind(
        null,
        content[PARSEDOM][0][ATTRS]
      );
      content[TODOM] = toDOM.bind(null, content[TODOM]);
      break;
    }
  }
  return content;
}

function createCitationMarkAttributes(schema: Schema) {
  const textHighlightContent = getContent(
    MARK_TEXT_HIGHLIGHT,
    schema,
    getMarkAttrs,
    toMarkDOM
  );

  const contentArr = [textHighlightContent, schema.marks[MARK_TEXT_HIGHLIGHT]];
  const NEWATTRS = [HASCITATION, MARKFROM];

  contentArr.forEach((content) => {
    if (content) {
      createAttribute(content, NEWATTRS, null);
    }
  });
}

export const applyEffectiveSchema = effectiveSchema;
