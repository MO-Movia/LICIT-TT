/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { Schema } from 'prosemirror-model';
import type { NodeSpec } from 'prosemirror-model';
import {
  toParagraphDOM,
  getParagraphNodeAttrs,
  toHeadingDOM,
} from './capcoNodeSpec';
import type { getAttrsExFn, toDOMExFn } from './capcoNodeSpec';
import {
  CAPCOKEY,
  PARAGRAPH,
  HEADING,
  TABLE,
  TABLE_FIGURE,
} from './constants';

export enum CAPCOMODE {
  NONE,
  FORCED,
}

export const SYSTEMCAPCO = Object.freeze({
  TBD: 'TBD',
  SECRET: 'S',
  TOPSECRET: 'TS',
  CONFIDENTIAL: 'C',
  UNCLASSIFIED: 'U',
  CONTROLLEDUNCLASSIFIEDINFORMATION: 'CUI'
});

export type Content = {
  type: string;
  schema: Schema;
  attrs: getAttrsExFn;
  toDOM: toDOMExFn;
};

export function effectiveSchema(schema: Schema): Schema {
  if (schema?.spec) {
    createCapcoNodeAttributes(schema);
  }
  return schema;
}

function createAttribute(
  content: NodeSpec,
  newAttrs: string[],
  value: string | number | null
) {
  if (!content?.attrs) return;

  const requiredAttrs = [...newAttrs];
  const baseAttrKey = Object.keys(content.attrs)[0];

  if (!baseAttrKey) return;

  for (const key of requiredAttrs) {
    if (content.attrs[key]) continue;

    const baseAttrSpec = content.attrs[baseAttrKey];
    if (!baseAttrSpec) continue;

    const clonedAttrSpec = Object.assign(
      Object.create(Object.getPrototypeOf(baseAttrSpec)),
      baseAttrSpec
    );

    clonedAttrSpec.default = value;
    content.attrs[key] = clonedAttrSpec;
  }
}

function getContent(
  type: string,
  schema: Schema,
  nodeAttrs: getAttrsExFn,
  toDOM: toDOMExFn
): NodeSpec {
  const nodes = schema.spec.nodes;

  // [FS-AG][07-MAY-2020][IRAD-956]
  // removed block quoted from the nodes.
  // Hence using this apt method to correctly get the content insteadof hardcoded index, using
  // index based on the type name.
  const content: NodeSpec = nodes.get(type);
  if (content) {
    // found
    // set custom handling of this plugin
    // [FS] IRAD-1177 2021-02-04
    // Always append to base calls.
    if (content.parseDOM) {
      content.parseDOM[0].getAttrs = nodeAttrs.bind(
        null,
        content.parseDOM[0].getAttrs
      );
    }
    if (content.toDOM) {
      content.toDOM = toDOM.bind(null, content.toDOM);
    }
  }

  return content;
}

function createCapcoNodeAttributes(schema: Schema) {
  const paragraphContent = getContent(
    PARAGRAPH,
    schema,
    getParagraphNodeAttrs,
    toParagraphDOM
  );
  const tableContent = getContent(
    TABLE,
    schema,
    getParagraphNodeAttrs,
    toParagraphDOM
  );
  const tableFigureContent = getContent(
    TABLE_FIGURE,
    schema,
    getParagraphNodeAttrs,
    toParagraphDOM
  );
  const headingContent = getContent(
    HEADING,
    schema,
    getParagraphNodeAttrs,
    toHeadingDOM
  );

  const contentArr = [
    paragraphContent,
    tableContent,
    tableFigureContent,
    headingContent,
    schema.nodes.paragraph,
    schema.nodes.heading,
    schema.nodes.table,
    schema.nodes.image,
    schema.nodes.enhanced_table_figure,
  ];

  const NEWATTRS = [CAPCOKEY, 'isValidate'];

  for (const content of contentArr) {
    if (!content) continue;
    createAttribute(content, NEWATTRS, null);
  }
}

export const applyEffectiveSchema = effectiveSchema;
