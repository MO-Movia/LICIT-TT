/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { FloatingMenuItem } from './model';

export function getDefaultMenuItems(handlers): FloatingMenuItem[] {
  return [
    {
      id: 'comment',
      label: 'Add Comment',
      isEnabled: handlers.enableCitationAndComment,
      onClick: handlers.addComment,
    },
    {
      id: 'tag',
      label: 'Add Tag',
      isEnabled: handlers.enableCitationAndComment,
      onClick: handlers.addTag,
    },
    {
      id: 'citation',
      label: 'Create Citation',
      isEnabled: handlers.enableCitationAndComment,
      onClick: handlers.createCitation,
    },
    {
      id: 'info',
      label: 'Create Infoicon',
      isEnabled: handlers.enableTagAndInfoicon,
      onClick: handlers.createInfoIcon,
    },
    {
      id: 'copy',
      label: 'Copy (Ctrl + C)',
      isEnabled: handlers.enableCopy,
      onClick: handlers.copyRich,
    },
    {
      id: 'copy-plain',
      label: 'Copy Without Formatting',
      isEnabled: handlers.enableCopy,
      onClick: handlers.copyPlain,
    },
    {
      id: 'paste',
      label: 'Paste (Ctrl + V)',
      isEnabled: handlers.enablePaste,
      onClick: handlers.paste,
    },
    {
      id: 'paste-plain',
      label: 'Paste As Plain Text',
      isEnabled: handlers.enablePaste,
      onClick: handlers.pastePlain,
    },
    {
      id: 'paste-ref',
      label: 'Paste As Reference (Ctrl + Alt + V)',
      isEnabled: handlers.enablePasteAsReference,
      onClick: handlers.pasteAsReference,
    },
    {
      id: 'slice',
      label: 'Create Referent',
      onClick: handlers.createSlice,
    },
    {
      id: 'insert-ref',
      label: 'Insert Reference',
      onClick: handlers.showReferences,
    },
  ];
}
