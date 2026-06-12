/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Citation } from './Types';

export function defaultCitationText(
  citation: Citation,
  delimiter = ' '
): string {
  return (
    `(${citation.overallCitationCAPCO ?? 'TBD'})` +
    delimiter +
    citation.author +
    delimiter +
    citation.referenceId +
    ' Date ' +
    citation.publishedDateTitle +
    delimiter +
    (citation.publishedDate || '') +
    ' ICOD Date ' +
    (citation.icod || '') +
    delimiter +
    `(${citation.documentTitleCapco ?? 'TBD'})` +
    delimiter +
    citation.documentTitle +
    ' pp. ' +
    citation.pages +
    ' Extracted information is ' +
    '(' +
    (citation.extractedInfoCAPCO ?? 'TBD') +
    ')' +
    ' Overall document classification is ' +
    '(' +
    (citation.overallDocumentCapco ?? 'TBD') +
    ')' +
    ' Date Accessed ' +
    (citation.dateAccessed || '') +
    delimiter +
    (citation.hyperLink || '') +
    ' Declassify Date ' +
    (citation.declassifyDate ?? 'TBD')
  );
}
