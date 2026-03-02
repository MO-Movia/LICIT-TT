/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

/**
 * Licit document root node.
 *
 * This Type is for the plain json format. Use ProseMirror "Node" type for the rendered node type.
 */
export interface LicitDocument extends LicitNode {
  /**
   * ProseMirror Node type. Always 'doc' for the root node.
   */
  type: 'doc';
}

/**
 * Generic node of a {@link LicitDocument}.
 *
 * This Type is for the plain json format. Use ProseMirror "Node" type for the rendered node type.
 */
export interface LicitNode {
  /**
   * ProseMirror Node type.
   */
  type: string;
  /**
   * text if type is 'text'.
   */
  text?: string;
  /**
   * Child nodes if this is not a leaf.
   */
  content?: LicitNode[];
  /**
   * ProseMirror Node Attributes.
   */
  attrs?: LicitAttrs;

  /**
   * Additional node specific properties.
   */
  [x: string | number]: unknown;
}

/**
 * Generic attributes of a {@link LicitNode}.
 *
 * This Type is for the plain json format, with certain keys reserved for licit plugins. Use ProseMirror "Attrs" type for the rendered node attributes type.
 */
export interface LicitAttrs {
  /**
   * Entity ID. Unique globally. Changed on copy.
   */
  objectId?: string;
  /**
   * Reference ID. Unique per document. Preserved on copy.
   */
  selectionId?: string;
  /**
   * Style associated for this node, if any.
   */
  styleName?: string;
  /**
   * Reference ID. Unique per document. Preserved on copy.
   */
  objectMetaData?: DocumentProperties;
  /**
   * Additional node specific properties.
   */
  [x: string | number]: unknown;
}

/**
 * Generic attributes of a {@link LicitAttrs}.
 *
 * This Type is for the plain json format, with certain keys reserved for licit plugins. Use ProseMirror "Attrs" type for the rendered node attributes type.
 */
export interface DocumentProperties {
  /**
   * Name of the document.
   */
  name?: string;
  /**
   * Type of the document. ex. "Help", "Report", or "1".
   */
  type?: string;
  /**
   * Authority for this document.
   */
  hasAuthority?: string;
  /**
   * Creator of this document/node.
   */
  hasAuthor?: string;
  /**
   * Date Created.
   */
  creationDate?: string;
  /**
   * Date of last update to this document/node.
   */
  lastEditedOn?: string;

  /**
   * Additional node specific properties.
   */
  [x: string | number]: unknown;
}
