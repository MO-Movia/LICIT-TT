/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Node } from 'prosemirror-model';

export type PageBanner = {
  text: string;
  color: string;
};

export const previewState = {
  documentTitle: '' as string | null,
  formattedDate: '',
  general: false,
  isCitation: false,
  isTitle: true,
  isToc: true,
  isTof: true,
  isTot: true,
  pageBanner: null as PageBanner | null,
  tocHeader: [] as string[],
  tocNodeList: [] as Node[],
  tofHeader: [] as string[],
  tofNodeList: [] as Node[],
  totHeader: [] as string[],
  totNodeList: [] as Node[],
};
