/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import ReactDOM from 'react-dom/client';
import { Licit, LicitProps } from '@modusoperandi/licit';
import type { Plugin } from '@tiptap/pm/state';
import type { Node } from '@tiptap/pm/model';
import React from 'react';
import { LicitDocument } from '../models/licit-document';
import { repairDoc } from './licit-repair';

/**
 * Runs the document through an editor to get the normalized document json.
 * This lets the editor apply fixes/normalization based on your schema,
 * and lets plugins apply apply any modifications they need to (like set paragraph id's)
 * @param doc to normalize
 * @param plugins to use with editor
 * @param timeout delay to use to consider the editor stable
 * @returns Promise that returns the normalized document. Promise is rejected if the editor rejects the document after.
 */
export async function normalizeDoc(
  doc: LicitDocument,
  plugins: Plugin[] = [],
  timeout = 1000
): Promise<LicitDocument> {
  const div = document.createElement('div');
  div.hidden = true;
  document.body.appendChild(div);
  return new Promise((resolve, reject) => {
    const props: LicitProps = {
      data: repairDoc(doc),
      plugins,
      readOnly: false,
      disabled: false,
      embedded: false,
      height: '100vh',
      width: '100vw',
      onReady: (licit) => resolve(toSimpleJson(licit.editorView?.state.doc)),
    };
    const root = ReactDOM.createRoot(div, {
      onRecoverableError: reject,
    });
    try {
      root.render(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(Licit, props)
        )
      );
      setTimeout(
        () => reject(new Error('Timeout. Licit Editor did not respond.')),
        timeout
      );
    } finally {
      root.unmount();
      div.remove();
    }
  });
}

/**
 * Converts a ProseMirror Doc/Node into a simple JSON object (with no functions). Useful for converting to form from cold storage.
 * @param doc Doc/Node to convert to a plain JSON object.
 * @returns a simple json version of the Doc/Node.
 */
export function toSimpleJson(doc: Node): LicitDocument {
  const coldCopy = JSON.stringify(doc);
  return JSON.parse(coldCopy) as LicitDocument;
}
