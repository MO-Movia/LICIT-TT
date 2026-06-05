/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorView } from 'prosemirror-view';
import { createPopUp } from '../../commands';
import { PreviewForm } from './preview';
import { processDocumentTables } from './table-image-helper';
export { createTable } from './generatedLists';

// [FS] IRAD-1893 2022-07-25
// Export to PDF file.
export class ExportPDF {
  private _popUp = null;
  /**
   * Export content to pdf and save locally.
   * @param  {EditorView} view
   * @param  {unknown} doc
   * @returns boolean
   */
  public exportPdf(view: EditorView, doc: unknown): boolean {
    const originalState = view.state;
    let newDoc;
    if (doc && doc['type'] === 'doc') {
           newDoc = view.state?.schema?.nodeFromJSON(doc);
        }
        else{
             newDoc = view.state.doc;
        }

    // Create new state while preserving plugin states
    const fullDocState = originalState.apply(
      originalState.tr.replaceWith(
        0,
        originalState.doc.content.size,
        newDoc.content
      )
    );

    document.body.classList.add('export-pdf-mode');
    view.updateState(fullDocState);

    const data1 = view.dom?.parentElement?.parentElement;
    for (const element of data1.children) {
      processDocumentTables(element as HTMLElement);
    }

    const viewPops = {
      editorState: fullDocState,
      editorView: view,
      onClose: (): void => {
        if (this._popUp) {
          this._popUp.close();
          this._popUp = null;
          document.body.classList.remove('export-pdf-mode');
          view.updateState(originalState);
        }
      },
    };
    this._popUp = createPopUp(PreviewForm, viewPops, {
      autoDismiss: false,
      modal: false,
      anchor: view.dom.parentElement,
    });

    return true;
  }
}
