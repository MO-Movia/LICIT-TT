/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 *
 * @jest-environment jsdom
 */

import { PDFHandler } from './handlers';
import { createTable } from './generatedLists';
import { previewState } from './previewState';

jest.mock('./generatedLists', () => ({
  createTable: jest.fn(),
}));

const mockChunker = {};
const mockPolisher = {
  convertViaSheet: jest.fn().mockResolvedValue('css-text'),
  insert: jest.fn(),
};
const mockCaller = {};

type TestPagedPage = { element: HTMLElement };

const createPage = (html: string): TestPagedPage => {
  const el = document.createElement('div');
  el.innerHTML = html;
  return { element: el };
};

describe('PDFHandler', () => {
  let handler: PDFHandler;

  beforeEach(() => {
    handler = new PDFHandler(mockChunker, mockPolisher, mockCaller);
    jest.clearAllMocks();
    PDFHandler.state.currentPage = 0;
    PDFHandler.state.isOnLoad = false;
    previewState.pageBanner = null;
    previewState.documentTitle = '';
    previewState.formattedDate = '2025-10-13';
    previewState.isToc = false;
    previewState.isTof = false;
    previewState.isTot = false;
    previewState.tocHeader = [];
    previewState.tofHeader = [];
    previewState.totHeader = [];
  });

  test('beforeParsed calls createTable when any TOC/TOF/TOT is true', () => {
    previewState.isToc = true;
    previewState.isTof = false;
    previewState.isTot = false;
    previewState.tocHeader = ['h1'];
    previewState.tofHeader = [];
    previewState.totHeader = [];

    handler.beforeParsed('content');

    expect(createTable).toHaveBeenCalledWith(expect.objectContaining({
      content: 'content',
      tocElement: '.tocHead',
      tofElement: '.tofHead',
      totElement: '.totHead',
      titleElements: ['h1'],
      titleElementsTOF: [],
      titleElementsTOT: [],
    }));
    expect(handler.done).toBe(false);
    expect(handler.pageFooters).toEqual([]);
    expect(handler.prepagesCount).toBe(0);
    expect(PDFHandler.state.currentPage).toBe(0);
  });

  test('afterPageLayout sets customcounter and CSS variables correctly', () => {
    const pageFragment = document.createElement('div');
    const pageEl = document.createElement('div');
    const infoIcon = document.createElement('infoicon');
    infoIcon.setAttribute('description', 'desc');
    pageEl.appendChild(infoIcon);

    const item = document.createElement('div');
    item.dataset.styleLevel = '2';
    pageFragment.appendChild(item);

    const page = { element: pageEl };
    handler.afterPageLayout(pageFragment, page, null);

    expect(item.getAttribute('customcounter')).toBeDefined();
    expect(pageFragment.style.getPropertyValue('--pagedjs-string-last-chapTitled')).toContain('desc');
  });

  test('afterPageLayout returns early if pageEl is not HTMLElement or prepages exists', () => {
    const frag = document.createElement('div');
    const page1 = { element: null };
    const page2El = document.createElement('div');
    page2El.appendChild(document.createElement('div')).className = 'prepages';
    const page2 = { element: page2El };

    expect(() => handler.afterPageLayout(frag, page1, null)).not.toThrow();
    expect(() => handler.afterPageLayout(frag, page2, null)).not.toThrow();
  });

  test('afterRendered applies styles for split and indent items', () => {
    const pageEl = document.createElement('div');
    const p1 = document.createElement('p');
    p1.dataset.splitTo = 'true';
    const p2 = document.createElement('p');
    p2.dataset.splitFrom = 'true';
    const p3 = document.createElement('p');
    p3.dataset.indent = 'true';
    pageEl.appendChild(p1);
    pageEl.appendChild(p2);
    pageEl.appendChild(p3);

    const pages = [{ element: pageEl }];
    Object.defineProperty(window, 'getComputedStyle', {
      value: jest.fn().mockReturnValue({ marginLeft: '5pt' }),
    });

    handler.afterRendered(pages);

    expect(p1.style.marginTop).toBe('1pt');
    expect(p1.style.paddingLeft).toBe('5pt');
    expect(p2.style.paddingLeft).toBe('5pt');
    expect(p3.style.paddingLeft).toBe('5pt');
  });

  test('calls patchTocEntries with pages', () => {
    const pages = [
      createPage('<div></div>'),
      createPage('<div></div>'),
    ];

    const spy = jest.spyOn(
      handler as unknown as { patchTocEntries(pages: TestPagedPage[]): void },
      'patchTocEntries'
    );

    handler.afterRendered(pages);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(pages);
  });

  test('afterPageLayout does not break when chapter is first element', () => {
    const pageFragment = document.createElement('div');

    const chapter = document.createElement('p');
    chapter.setAttribute('stylename', 'chapterTitle');
    chapter.dataset.ref = 'chap1';

    const inner = document.createElement('div');
    inner.appendChild(chapter);

    const areaRoot = document.createElement('div');
    const wrapper = document.createElement('div');
    wrapper.appendChild(inner);
    areaRoot.appendChild(wrapper);

    const page = {
      element: document.createElement('div'),
      area: areaRoot,
    };

    const breakToken = { node: 'original', offset: 5 };

    handler.afterPageLayout(pageFragment, page, breakToken);

    expect(breakToken.node).toBe('original');
    expect(breakToken.offset).toBe(5);
  });

  test('afterPageLayout sets empty footer string when no infoicon exists', () => {
    const pageFragment = document.createElement('div');
    const page = { element: document.createElement('div') };

    handler.afterPageLayout(pageFragment, page, null);

    expect(
      pageFragment.style.getPropertyValue('--pagedjs-string-last-chapTitled')
    ).toBe('""');
  });

  test('afterPageLayout skips counter processing for splitFrom elements', () => {
    const pageFragment = document.createElement('div');

    const el = document.createElement('p');
    el.dataset.styleLevel = '2';
    el.dataset.splitFrom = 'true';

    pageFragment.appendChild(el);

    const page = { element: document.createElement('div') };

    handler.afterPageLayout(pageFragment, page, null);

    expect(el.getAttribute('customcounter')).toBeNull();
  });

  test('afterPageLayout uses TOF counter when tof attribute is present', () => {
    const pageFragment = document.createElement('div');

    const el = document.createElement('p');
    el.dataset.styleLevel = '1';
    el.dataset.tof = 'true';

    pageFragment.appendChild(el);

    const page = { element: document.createElement('div') };

    handler.afterPageLayout(pageFragment, page, null);

    expect(el.getAttribute('customcounter')).toContain('.');
  });

  test('afterPageLayout resets counters when reset flag is set', () => {
    const pageFragment = document.createElement('div');

    const el1 = document.createElement('p');
    el1.dataset.styleLevel = '1';

    const el2 = document.createElement('p');
    el2.dataset.styleLevel = '2';
    el2.dataset.reset = 'true';

    pageFragment.appendChild(el1);
    pageFragment.appendChild(el2);

    const page = { element: document.createElement('div') };

    handler.afterPageLayout(pageFragment, page, null);

    expect(el2.getAttribute('customcounter')).toBeDefined();
  });


  test('resetCounters works correctly', () => {
    handler['counters'] = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 11: 0, 12: 0 };
    handler['resetCounters'](2, true);
    expect(handler['counters'][3]).toBe(0);
    expect(handler['counters'][1]).toBe(1);
  });

  test('handleSpecialCounters increments counters', () => {
    const label: number[] = [];
    handler['counters'][1] = 1;
    handler['handleSpecialCounters']('tof', null, label);
    expect(label).toEqual([1, 1]);

    const label2: number[] = [];
    handler['handleSpecialCounters'](null, 'tot', label2);
    expect(label2).toEqual([1, 1]);
  });

  test('buildLabel resets TOF and TOT at level 1', () => {
    handler['counters'][1] = 1;
    handler['counters'][11] = 5;
    handler['counters'][12] = 5;
    const label: number[] = [];
    handler['buildLabel'](1, label);
    expect(handler['counters'][11]).toBe(0);
    expect(handler['counters'][12]).toBe(0);
    expect(label).toEqual([2]);
  });

  test('stripHTML removes HTML tags', () => {
    const html = '<p>Hello <b>World</b></p>';
    expect(handler.stripHTML(html)).toBe('Hello World');
  });

  test('beforePageLayout calls doIT', () => {
    const spy = jest.spyOn(handler, 'doIT').mockResolvedValue(undefined);
    handler.beforePageLayout();
    expect(spy).toHaveBeenCalled();
  });

  test('doIT calls polisher.convertViaSheet and insert', async () => {
    handler.done = false;
    await handler.doIT();
    expect(mockPolisher.convertViaSheet).toHaveBeenCalled();
    expect(mockPolisher.insert).toHaveBeenCalledWith('css-text');
    expect(handler.done).toBe(false);
  });

  test('finalizePage increments currentPage only if isOnLoad is false', () => {
    PDFHandler.state.isOnLoad = false;
    handler.finalizePage();
    expect(PDFHandler.state.currentPage).toBe(1);

    PDFHandler.state.isOnLoad = true;
    handler.finalizePage();
    expect(PDFHandler.state.currentPage).toBe(1); // no increment
  });

  test('getAttr returns dataset value when present, otherwise falls back to CSS custom property, otherwise empty string', () => {
    const el = document.createElement('div') as HTMLElement;
    const getter = (handler as unknown as { getAttr(el: HTMLElement, key: string): string }).getAttr;
    el.dataset.mykey = 'dataset-value';
    expect(getter.call(handler, el, 'mykey')).toBe('dataset-value');
    delete el.dataset.mykey;
    el.style.setProperty('--mykey', 'css-value');
    expect(getter.call(handler, el, 'mykey')).toBe('css-value');
    el.style.removeProperty('--mykey');
    expect(getter.call(handler, el, 'mykey')).toBe('');
  });

  test('afterPageLayout sets --pagedjs-string-last-chapTitled and --pagedjs-footer-height when infoicon elements present', () => {
    const pageFragment = document.createElement('div');
    const pageEl = document.createElement('div');
    const info1 = document.createElement('infoicon');
    info1.setAttribute('description', 'First chapter');
    const info2 = document.createElement('infoicon');
    info2.setAttribute('description', 'Second chapter with more text');

    pageEl.appendChild(info1);
    pageEl.appendChild(info2);

    const page = { element: pageEl };
    handler.afterPageLayout(pageFragment, page, null);

    const cssString = pageFragment.style.getPropertyValue('--pagedjs-string-last-chapTitled');
    const footerHeight = pageFragment.style.getPropertyValue('--pagedjs-footer-height');

    expect(cssString).toContain('First chapter');
    expect(cssString).toContain('Second chapter with more text');

    const concatenatedValues = ` ${1}. ${'First chapter'} ${2}. ${'Second chapter with more text'} `;
    const estimatedLines = Math.ceil(concatenatedValues.length / 80);
    const expectedFooter = `${20 + estimatedLines * 12}px`;

    expect(footerHeight).toBe(expectedFooter);

    const pageFragment2 = document.createElement('div');
    const pageEl2 = document.createElement('div');
    const page2 = { element: pageEl2 };
    handler.afterPageLayout(pageFragment2, page2, null);
    expect(pageFragment2.style.getPropertyValue('--pagedjs-string-last-chapTitled')).toBe('""');
  });

    test('afterPageLayout calls processTocAndFooter when extractedCui is null (non-AFTTP)', () => {
    previewState.pageBanner = null;

    const pageFragment = document.createElement('div');
    const pageEl = document.createElement('div');

    const infoIcon = document.createElement('infoicon');
    infoIcon.setAttribute('description', 'Test description');
    pageEl.appendChild(infoIcon);

    const page = { element: pageEl };

    handler.afterPageLayout(pageFragment, page, null);

    expect(pageFragment.style.getPropertyValue('--pagedjs-string-last-chapTitled')).toContain('Test description');
  });

  test('afterPageLayout removes and sets CSS properties when extractedCui exists (AFTTP)', () => {
    previewState.pageBanner = {
      text: 'CUI//SP-CTI',
      color: 'rgb(255, 0, 0)'
    };

    const pageFragment = document.createElement('div');
    const pageEl = document.createElement('div');

    pageFragment.style.setProperty('--pagedjs-string-last-chapTitled', '"old value"');

    const page = { element: pageEl };

    handler.afterPageLayout(pageFragment, page, null);

    expect(pageFragment.style.getPropertyValue('--pagedjs-string-last-chapTitled')).toBe('""');
  });

  test('afterPageLayout does not call processTocAndFooter when extractedCui has data', () => {
    previewState.pageBanner = {
      text: 'CUI//SP-CTI',
      color: 'rgb(255, 0, 0)'
    };

    const pageFragment = document.createElement('div');
    const pageEl = document.createElement('div');

    const infoIcon = document.createElement('infoicon');
    infoIcon.setAttribute('description', 'Should not appear');
    pageEl.appendChild(infoIcon);

    const page = { element: pageEl };

    handler.afterPageLayout(pageFragment, page, null);

    const cssValue = pageFragment.style.getPropertyValue('--pagedjs-string-last-chapTitled');
    expect(cssValue).toBe('""');
  });

  test('truncateTitle returns original title when null or undefined', () => {
    expect(handler['truncateTitle'](null)).toBeNull();
    expect(handler['truncateTitle'](undefined)).toBeUndefined();
  });

  test('truncateTitle returns original title when length is less than maxLength', () => {
    const shortTitle = 'Short Title';
    expect(handler['truncateTitle'](shortTitle)).toBe(shortTitle);
  });

  test('truncateTitle returns original title when length equals maxLength', () => {
    const exactTitle = '1234567890123456789012'; // exactly 22 chars
    expect(handler['truncateTitle'](exactTitle)).toBe(exactTitle);
  });

  test('truncateTitle truncates and adds ellipsis when length exceeds maxLength', () => {
    const longTitle = 'This is a very long title that exceeds the maximum length';
    const result = handler['truncateTitle'](longTitle);

    expect(result).toBe('This is a very long ti...');
    expect(result.length).toBe(25);
  });

  test('truncateTitle uses custom maxLength when provided', () => {
    const title = 'This is a test title';
    const result = handler['truncateTitle'](title, 10);

    expect(result).toBe('This is a ...');
    expect(result.length).toBe(13);
  });

  test('truncateTitle with custom maxLength returns original when within limit', () => {
    const title = 'Short';
    const result = handler['truncateTitle'](title, 10);

    expect(result).toBe('Short');
  });

});
describe('buildRefToPageMap', () => {
  let handler: PDFHandler;

  beforeEach(() => {
    handler = new PDFHandler(mockChunker, mockPolisher, mockCaller);
    previewState.pageBanner = null;
  });

  test('maps data-ref to first page number (1-based)', () => {
    const pages = [
      createPage('<div data-ref="sec1"></div>'),
      createPage('<div data-ref="sec2"></div>'),
    ];

    const map = (handler as unknown as { buildRefToPageMap(pages: TestPagedPage[]): Map<string, number> }).buildRefToPageMap(pages);

    expect(map.get('sec1')).toBe(0);
    expect(map.get('sec2')).toBe(1);
  });

  test('uses first occurrence when same data-ref appears on multiple pages', () => {
    const pages = [
      createPage('<div data-ref="dup"></div>'),
      createPage('<div data-ref="dup"></div>'),
    ];

    const map = (handler as unknown as { buildRefToPageMap(pages: TestPagedPage[]): Map<string, number> }).buildRefToPageMap(pages);

    expect(map.get('dup')).toBe(0);
  });

  test('ignores elements without data-ref', () => {
    const pages = [
      createPage('<div></div>'),
      createPage('<div data-ref="valid"></div>'),
    ];

    const map = (handler as unknown as { buildRefToPageMap(pages: TestPagedPage[]): Map<string, number> }).buildRefToPageMap(pages);

    expect(map.has('valid')).toBe(true);
    expect(map.size).toBe(1);
  });

  test('handles multiple data-ref elements on the same page', () => {
    const pages = [
      createPage(`
        <div data-ref="a"></div>
        <div data-ref="b"></div>
        <div data-ref="c"></div>
      `),
    ];

    const map = (handler as unknown as { buildRefToPageMap(pages: TestPagedPage[]): Map<string, number> }).buildRefToPageMap(pages);

    expect(map.get('a')).toBe(0);
    expect(map.get('b')).toBe(0);
    expect(map.get('c')).toBe(0);
  });

  test('ignores empty string data-ref values', () => {
    const pages = [
      createPage(`
        <div data-ref=""></div>
        <div data-ref="valid"></div>
      `),
    ];

    const map = (handler as unknown as { buildRefToPageMap(pages: TestPagedPage[]): Map<string, number> }).buildRefToPageMap(pages);

    expect(map.has('')).toBe(false);
    expect(map.get('valid')).toBe(0);
  });

  test('returns empty map when pages array is empty', () => {
    const map = (handler as unknown as { buildRefToPageMap(pages: TestPagedPage[]): Map<string, number> }).buildRefToPageMap([]);

    expect(map.size).toBe(0);
  });
});
describe('applyTocPageNumbers', () => {
  let handler: PDFHandler;

  beforeEach(() => {
    handler = new PDFHandler(mockChunker, mockPolisher, mockCaller);
    previewState.pageBanner = null;
  });

  test('sets data-page on TOC links when ref exists', () => {
    const pages = [
      createPage(`
        <div class="toc-element">
          <a href="#sec1"></a>
        </div>
      `),
    ];

    const refToPage = new Map<string, number>([['sec1', 3]]);

    (handler as unknown as { applyTocPageNumbers(pages: TestPagedPage[], refToPage: Map<string, number>): void }).applyTocPageNumbers(pages, refToPage);

    const link = pages[0].element.querySelector('a') as HTMLElement;
    expect(link.dataset.page).toBe('4');
  });

  test('does not set data-page when href has no matching ref', () => {
    const pages = [
      createPage(`
        <div class="toc-element">
          <a href="#missing"></a>
        </div>
      `),
    ];

    const refToPage = new Map<string, number>();

    (handler as unknown as { applyTocPageNumbers(pages: TestPagedPage[], refToPage: Map<string, number>): void }).applyTocPageNumbers(pages, refToPage);

    const link = pages[0].element.querySelector('a') as HTMLElement;
    expect(link.dataset.page).toBeUndefined();
  });

  test('ignores anchors without href', () => {
    const pages = [
      createPage(`
        <div class="toc-element">
          <a></a>
        </div>
      `),
    ];

    const refToPage = new Map<string, number>([['sec1', 1]]);

    expect(() =>
      (handler as unknown as { applyTocPageNumbers(pages: TestPagedPage[], refToPage: Map<string, number>): void }).applyTocPageNumbers(pages, refToPage)
    ).not.toThrow();
  });

  test('skips non-HTMLElement nodes inside .toc-element', () => {
    const page = document.createElement('div');
    const wrapper = document.createElement('div');
    wrapper.className = 'toc-element';

    wrapper.appendChild(document.createTextNode('text node'));
    page.appendChild(wrapper);

    const pages = [{ element: page }];

    expect(() =>
      (handler as unknown as { applyTocPageNumbers(pages: TestPagedPage[], refToPage: Map<string, number>): void }).applyTocPageNumbers(pages, new Map())
    ).not.toThrow();
  });

  test('does not set page when href does not start with #', () => {
    const pages = [
      createPage(`
        <div class="toc-element">
          <a href="http://example.com"></a>
        </div>
      `),
    ];

    const refToPage = new Map<string, number>([['sec1', 2]]);

    (handler as unknown as { applyTocPageNumbers(pages: TestPagedPage[], refToPage: Map<string, number>): void }).applyTocPageNumbers(pages, refToPage);

    const link = pages[0].element.querySelector('a') as HTMLElement;
    expect(link.dataset.page).toBeUndefined();
  });

  test('does not set page when href is "#"', () => {
    const pages = [
      createPage(`
        <div class="toc-element">
          <a href="#"></a>
        </div>
      `),
    ];

    const refToPage = new Map<string, number>([['anything', 1]]);

    (handler as unknown as { applyTocPageNumbers(pages: TestPagedPage[], refToPage: Map<string, number>): void }).applyTocPageNumbers(pages, refToPage);

    const link = pages[0].element.querySelector('a') as HTMLElement;
    expect(link.dataset.page).toBeUndefined();
  });

  test('handles multiple TOC links on the same page', () => {
    const pages = [
      createPage(`
        <div data-ref="a"></div>
        <div data-ref="b"></div>

        <div class="toc-element"><a href="#a"></a></div>
        <div class="toc-element"><a href="#b"></a></div>
      `),
    ];

    const refToPage = new Map<string, number>([
      ['a', 5],
      ['b', 7],
    ]);

    (handler as unknown as { applyTocPageNumbers(pages: TestPagedPage[], refToPage: Map<string, number>): void }).applyTocPageNumbers(pages, refToPage);

    const links = pages[0].element.querySelectorAll('a');
    expect(links[0].dataset.page).toBe('6');
    expect(links[1].dataset.page).toBe('8');
  });

  test('overwrites existing data-page value', () => {
    const pages = [
      createPage(`
        <div class="toc-element">
          <a href="#sec1" data-page="old"></a>
        </div>
      `),
    ];

    const refToPage = new Map<string, number>([['sec1', 9]]);

    (handler as unknown as { applyTocPageNumbers(pages: TestPagedPage[], refToPage: Map<string, number>): void }).applyTocPageNumbers(pages, refToPage);

    const link = pages[0].element.querySelector('a') as HTMLElement;
    expect(link.dataset.page).toBe('10');
  });
});
describe('patchTocEntries', () => {
  let handler: PDFHandler;

  beforeEach(() => {
    handler = new PDFHandler(mockChunker, mockPolisher, mockCaller);
    previewState.pageBanner = null;
  });

  test('builds ref map and applies page numbers to TOC links', () => {
    const pages = [
      createPage(`
        <div data-ref="sec1"></div>
        <div class="toc-element">
          <a href="#sec1"></a>
        </div>
      `),
      createPage(`
        <div data-ref="sec2"></div>
        <div class="toc-element">
          <a href="#sec2"></a>
        </div>
      `),
    ];

    (handler as unknown as { patchTocEntries(pages: TestPagedPage[]): void }).patchTocEntries(pages);

    const link1 = pages[0].element.querySelector<HTMLAnchorElement>('.toc-element a');
    const link2 = pages[1].element.querySelector<HTMLAnchorElement>('.toc-element a');

    expect(link1.dataset.page).toBe('1');
    expect(link2.dataset.page).toBe('2');
  });

  test('does not crash when no TOC elements exist', () => {
    const pages = [
      createPage('<div data-ref="sec1"></div>'),
      createPage('<div></div>'),
    ];

    expect(() =>
      (handler as unknown as { patchTocEntries(pages: TestPagedPage[]): void }).patchTocEntries(pages)
    ).not.toThrow();
  });

  test('applyPageNumbers assigns AFTTP chapter and attachment numbering', () => {
  previewState.pageBanner = { text: 'CUI', color: 'red' };

  const pages = [
    createPage('<p stylename="chapterTitle"></p>'), // chapter 1 start
    createPage('<div></div>'),
    createPage('<p stylename="attachmentTitle"></p>'), // attachment 1 start
    createPage('<div></div>'),
  ];

  // mock page number containers
  pages.forEach(p => {
    const margin = document.createElement('div');
    margin.className = 'pagedjs_margin-top-right';
    const content = document.createElement('div');
    content.className = 'pagedjs_margin-content';
    margin.appendChild(content);
    p.element.appendChild(margin);
  });

  handler['applyPageNumbers'](pages);

  const nums = pages.map(
    p => p.element.querySelector('.pagedjs_margin-content').textContent
  );

  expect(nums).toEqual([
    '1-1',
    '1-2',
    'A1-1',
    'A1-2',
  ]);
});

test('resolveAfttpPageNumber falls back to roman when no chapter or attachment', () => {
  const result = handler['resolveAfttpPageNumber'](
    document.createElement('div'),
    3,
    [],
    () => '',
    () => ''
  );

  expect(result).toBe('iv');
});

test('buildChapterRanges creates correct start and end ranges', () => {
  const pages = [
    createPage('<p stylename="chapterTitle"></p>'),
    createPage('<div></div>'),
    createPage('<p stylename="chapterTitle"></p>'),
    createPage('<div></div>'),
  ];

  const ranges = handler['buildChapterRanges'](pages);

  expect(ranges).toEqual([
    { start: 0, end: 2, chapterIndex: 1 },
    { start: 2, end: 4, chapterIndex: 2 },
  ]);
});

test('buildAttachmentRanges builds correct attachment ranges', () => {
  const pages = [
    createPage('<p stylename="attachmentTitle"></p>'),
    createPage('<div></div>'),
    createPage('<p stylename="attachmentTitle"></p>'),
  ];

  const ranges = handler['buildAttachmentRanges'](pages);

  expect(ranges).toEqual([
    { start: 0, end: 2, index: 1 },
    { start: 2, end: 3, index: 2 },
  ]);
});

test('detectAttachments tracks attachment pages correctly', () => {
  const pages = [
    createPage('<p stylename="attachmentTitle"></p>'),
    createPage('<div></div>'),
    createPage('<div></div>'),
  ];

  handler['detectAttachments'](pages);

  expect(handler['attachmentPageCounters'].get(1)).toBe(3);
});

test('computeTotalMainPages stops counting at first attachment', () => {
  const pages = [
    createPage('<p stylename="chapterTitle"></p>'),
    createPage('<div></div>'),
    createPage('<p stylename="attachmentTitle"></p>'),
    createPage('<div></div>'),
  ];

  handler['resolveFirstChapterPageIndex'](pages);
  handler['computeTotalMainPages'](pages);

  expect(handler['totalMainPages']).toBe(2);
});

test('getAfttpPageNumber returns attachment numbering', () => {
  const result = handler['getAfttpPageNumber'](
    3,
    [{ start: 2, end: 5, index: 1 }],
    []
  );

  expect(result).toBe('A1-2');
});

test('resolveNonAfttpPageNumber returns roman for pre-pages', () => {
  handler['lastPrePageIndex'] = 2;

  const val = handler['resolveNonAfttpPageNumber'](1, () => 99);

  expect(val).toBe('ii');
});

test('handleAfttpFooter skips TOC footer when AFTTP', () => {
  previewState.pageBanner = { text: 'CUI', color: 'red' };

  const frag = document.createElement('div');
  const spy = jest.fn();

  handler['handleAfttpFooter'](frag, spy);

  expect(frag.style.getPropertyValue('--pagedjs-string-last-chapTitled')).toBe('""');
});

test('fixSplitTo safely returns when element not found', () => {
  const page = document.createElement('div');
  expect(() =>
    handler['fixSplitTo'](page, () => '5pt')
  ).not.toThrow();
});
test('resolveFirstChapterPageIndex does nothing if already resolved', () => {
  const pages = [
    createPage('<p stylename="chapterTitle"></p>'),
  ];

  handler['firstChapterPageIndex'] = 10;

  handler['resolveFirstChapterPageIndex'](pages);

  expect(handler['firstChapterPageIndex']).toBe(10);
});

test('resetLastPrePageIndex sets null when no totHead exists', () => {
  const pages = [
    createPage('<div></div>'),
    createPage('<div></div>'),
  ];

  handler['resetLastPrePageIndex'](pages);

  expect(handler['lastPrePageIndex']).toBeNull();
});

test('applyPageNumbers skips pages without margin content safely', () => {
  const pages = [
    createPage('<div></div>'),
    createPage('<div></div>'),
  ];

  expect(() =>
    handler['applyPageNumbers'](pages)
  ).not.toThrow();
});

test('applySingleTocLink sets attachment page number in AFTTP', () => {
  previewState.pageBanner = { text: 'CUI', color: 'red' };

  const page = createPage(`
    <div class="toc-element">
      <a href="#att1"></a>
    </div>
  `);

  const refMap = new Map<string, number>([['att1', 3]]);
  const attachments: Array<{ start: number; end: number; index: number }> = [
    { start: 2, end: 6, index: 1 },
  ];

  const chapters: Array<{ start: number; end: number; chapterIndex: number }> = [];

  const link = page.element.querySelector('a');

  handler['applySingleTocLink'](
    link,
    refMap,
    true,
    attachments,
    chapters
  );

  expect(link.dataset.page).toBe('A1-2');
});

test('buildRefToPageMap ignores non-HTMLElement nodes', () => {
  const pageEl = document.createElement('div');
  pageEl.appendChild(document.createTextNode('text'));
  pageEl.appendChild(document.createComment('comment'));

  const pages = [{ element: pageEl }];

  const map = handler['buildRefToPageMap'](pages);

  expect(map.size).toBe(0);
});

test('handleSpecialCounters does nothing when neither tof nor tot present', () => {
  const label: number[] = [];
  handler['counters'][1] = 3;

  handler['handleSpecialCounters'](null, null, label);

  expect(label).toEqual([]);
});

test('buildLabel builds multi-level labels correctly', () => {
  handler['counters'][1] = 1;
  handler['counters'][2] = 2;

  const label: number[] = [];
  handler['buildLabel'](2, label);

  expect(label).toEqual([1, 3]);
});

test('fixIndent safely handles pages with no indent elements', () => {
  const page = document.createElement('div');

  expect(() =>
    handler['fixIndent'](page, () => '10pt')
  ).not.toThrow();
});

test('handleAfttpFooter executes processTocAndFooter when non-AFTTP', () => {
  previewState.pageBanner = null;

  const frag = document.createElement('div');
  const spy = jest.fn();

  handler['handleAfttpFooter'](frag, spy);

  expect(spy).toHaveBeenCalled();
});


});

describe('PDFHandler additional coverage', () => {
  let handler: PDFHandler;

  beforeEach(() => {
    handler = new PDFHandler(mockChunker, mockPolisher, mockCaller);
    jest.clearAllMocks();
    PDFHandler.state.currentPage = 0;
    PDFHandler.state.isOnLoad = false;
    previewState.pageBanner = null;
    previewState.documentTitle = '';
    previewState.formattedDate = '2025-10-13';
    previewState.isToc = false;
    previewState.isTof = false;
    previewState.isTot = false;
    previewState.tocHeader = [];
    previewState.tofHeader = [];
    previewState.totHeader = [];

    // Reset the static mode tracker so doIT mode-switch tests are deterministic
    (PDFHandler as unknown as { lastMode: 'afttp' | 'non-afttp' | null }).lastMode = null;

    // Strip any residual marker styles left by earlier doIT tests
    document.querySelectorAll('style[data-licit-pdf-handler]').forEach(s => s.remove());
  });

  test('beforeParsed does NOT call createTable when isToc, isTof and isTot are all false', () => {
    previewState.isToc = false;
    previewState.isTof = false;
    previewState.isTot = false;

    handler.beforeParsed('content');

    expect(createTable).not.toHaveBeenCalled();
  });

  test('beforeParsed calls createTable when only isTof is true', () => {
    previewState.isToc = false;
    previewState.isTof = true;
    previewState.isTot = false;
    previewState.tofHeader = ['fig'];

    handler.beforeParsed('content');

    expect(createTable).toHaveBeenCalled();
  });

  test('beforeParsed calls createTable when only isTot is true', () => {
    previewState.isToc = false;
    previewState.isTof = false;
    previewState.isTot = true;
    previewState.totHeader = ['tbl'];

    handler.beforeParsed('content');

    expect(createTable).toHaveBeenCalled();
  });

  test('afterPageLayout mutates breakToken when chapter is not first element and chapterSource exists', () => {
    // Build a source DOM that chunker.source.querySelector can match against
    const sourceChapter = document.createElement('p');
    sourceChapter.dataset.ref = 'chap-abc';
    const sourceDOM = document.createElement('div');
    sourceDOM.appendChild(sourceChapter);

    const customHandler = new PDFHandler({ source: sourceDOM }, mockPolisher, mockCaller);

    // Build page.area in which the chapter is NOT firstElementChild.children[0].children[0]
    const firstEl = document.createElement('p');
    firstEl.textContent = 'first (not chapter)';

    const chapterEl = document.createElement('p');
    chapterEl.setAttribute('stylename', 'chapterTitle');
    chapterEl.dataset.ref = 'chap-abc';

    const trailing = document.createElement('p');
    trailing.textContent = 'trailing content';

    const inner = document.createElement('div');
    inner.appendChild(firstEl);
    inner.appendChild(chapterEl);
    inner.appendChild(trailing);

    const wrapper = document.createElement('div');
    wrapper.appendChild(inner);

    const areaRoot = document.createElement('div');
    areaRoot.appendChild(wrapper);

    const pageFragment = document.createElement('div');
    const page = { element: document.createElement('div'), area: areaRoot };
    const breakToken: { node: unknown; offset: number } = { node: 'original', offset: 5 };

    customHandler.afterPageLayout(pageFragment, page, breakToken);

    // breakToken redirected to chapter node in the source DOM
    expect(breakToken.node).toBe(sourceChapter);
    expect(breakToken.offset).toBe(0);

    // chapter + trailing siblings should be removed from the page area
    expect(inner.contains(chapterEl)).toBe(false);
    expect(inner.contains(trailing)).toBe(false);
    // first element remains
    expect(inner.contains(firstEl)).toBe(true);
  });

  test('afterPageLayout does NOT mutate breakToken when chapterSource is missing in chunker', () => {
    const sourceDOM = document.createElement('div'); // no matching ref inside
    const customHandler = new PDFHandler({ source: sourceDOM }, mockPolisher, mockCaller);

    const firstEl = document.createElement('p');
    const chapterEl = document.createElement('p');
    chapterEl.setAttribute('stylename', 'chapterTitle');
    chapterEl.dataset.ref = 'missing-ref';

    const inner = document.createElement('div');
    inner.appendChild(firstEl);
    inner.appendChild(chapterEl);

    const wrapper = document.createElement('div');
    wrapper.appendChild(inner);

    const areaRoot = document.createElement('div');
    areaRoot.appendChild(wrapper);

    const pageFragment = document.createElement('div');
    const page = { element: document.createElement('div'), area: areaRoot };
    const breakToken = { node: 'original', offset: 5 };

    customHandler.afterPageLayout(pageFragment, page, breakToken);

    expect(breakToken.node).toBe('original');
    expect(breakToken.offset).toBe(5);
  });

  test('afterPageLayout skips chapter-break logic for already-processed chapter refs', () => {
    const sourceChapter = document.createElement('p');
    sourceChapter.dataset.ref = 'chap-dupe';
    const sourceDOM = document.createElement('div');
    sourceDOM.appendChild(sourceChapter);

    const customHandler = new PDFHandler({ source: sourceDOM }, mockPolisher, mockCaller);
    // Mark the ref as already processed so find() returns undefined
    (customHandler as unknown as { processedChapterRefs: Set<string> })
      .processedChapterRefs.add('chap-dupe');

    const firstEl = document.createElement('p');
    const chapterEl = document.createElement('p');
    chapterEl.setAttribute('stylename', 'chapterTitle');
    chapterEl.dataset.ref = 'chap-dupe';

    const inner = document.createElement('div');
    inner.appendChild(firstEl);
    inner.appendChild(chapterEl);

    const wrapper = document.createElement('div');
    wrapper.appendChild(inner);

    const areaRoot = document.createElement('div');
    areaRoot.appendChild(wrapper);

    const pageFragment = document.createElement('div');
    const page = { element: document.createElement('div'), area: areaRoot };
    const breakToken = { node: 'orig', offset: 2 };

    customHandler.afterPageLayout(pageFragment, page, breakToken);

    expect(breakToken.node).toBe('orig');
    expect(breakToken.offset).toBe(2);
    // chapter is NOT removed since the break handler skipped it
    expect(inner.contains(chapterEl)).toBe(true);
  });

  test('afterPageLayout treats --reset-flag CSS property as a reset trigger', () => {
    const pageFragment = document.createElement('div');

    const el = document.createElement('p');
    el.dataset.styleLevel = '2';
    el.style.setProperty('--reset-flag', '1');

    pageFragment.appendChild(el);

    const page = { element: document.createElement('div') };
    handler.afterPageLayout(pageFragment, page, null);

    expect(el.getAttribute('customcounter')).toBeDefined();
  });

  test('afterPageLayout applies prefix from data-prefix to customcounter', () => {
    const pageFragment = document.createElement('div');

    const el = document.createElement('p');
    el.dataset.styleLevel = '1';
    el.dataset.prefix = 'Section ';

    pageFragment.appendChild(el);

    const page = { element: document.createElement('div') };
    handler.afterPageLayout(pageFragment, page, null);

    expect(el.getAttribute('customcounter')).toContain('Section ');
  });

  test('afterPageLayout uses TOT counter when tot attribute is present', () => {
    const pageFragment = document.createElement('div');

    const el = document.createElement('p');
    el.dataset.styleLevel = '1';
    el.dataset.tot = 'true';

    pageFragment.appendChild(el);

    const page = { element: document.createElement('div') };
    handler.afterPageLayout(pageFragment, page, null);

    expect(el.getAttribute('customcounter')).toContain('.');
  });

  /* ---------- toRoman ---------- */
  test('toRoman returns String(num) for values greater than 3999', () => {
    const toRoman = (handler as unknown as { toRoman(n: number): string }).toRoman.bind(handler);
    expect(toRoman(4000)).toBe('4000');
    expect(toRoman(5123)).toBe('5123');
  });

  test('toRoman converts standard values within range', () => {
    const toRoman = (handler as unknown as { toRoman(n: number): string }).toRoman.bind(handler);
    expect(toRoman(1)).toBe('i');
    expect(toRoman(4)).toBe('iv');
    expect(toRoman(9)).toBe('ix');
    expect(toRoman(40)).toBe('xl');
    expect(toRoman(90)).toBe('xc');
    expect(toRoman(400)).toBe('cd');
    expect(toRoman(900)).toBe('cm');
    expect(toRoman(1987)).toBe('mcmlxxxvii');
    expect(toRoman(3999)).toBe('mmmcmxcix');
  });

  test('resolveFirstChapterPageIndex assigns index of first chapter when not yet resolved', () => {
    const pages = [
      createPage('<div></div>'),
      createPage('<p stylename="chapterTitle"></p>'),
      createPage('<div></div>'),
    ];

    handler['resolveFirstChapterPageIndex'](pages);

    expect(handler['firstChapterPageIndex']).toBe(1);
  });

  test('resolveFirstChapterPageIndex stays null when no chapter exists anywhere', () => {
    const pages = [createPage('<div></div>'), createPage('<div></div>')];
    handler['resolveFirstChapterPageIndex'](pages);
    expect(handler['firstChapterPageIndex']).toBeNull();
  });

  test('resolveAfttpPageNumber returns onAttachmentStart value when page has attachmentTitle', () => {
    const pageEl = document.createElement('div');
    const att = document.createElement('p');
    att.setAttribute('stylename', 'attachmentTitle');
    pageEl.appendChild(att);

    const result = handler['resolveAfttpPageNumber'](
      pageEl,
      0,
      [],
      () => 'A1-1',
      () => ''
    );

    expect(result).toBe('A1-1');
  });

  test('resolveAfttpPageNumber returns onAttachmentContinue when continuation is truthy', () => {
    const pageEl = document.createElement('div');

    const result = handler['resolveAfttpPageNumber'](
      pageEl,
      1,
      [],
      () => 'A1-1',
      () => 'A1-2'
    );

    expect(result).toBe('A1-2');
  });

  test('resolveAfttpPageNumber returns chapter-formatted page number when page falls within a chapter range', () => {
    const pageEl = document.createElement('div');

    const result = handler['resolveAfttpPageNumber'](
      pageEl,
      2,
      [{ start: 1, end: 5, chapterIndex: 3 }],
      () => '',
      () => ''
    );

    expect(result).toBe('3-2');
  });

  test('computeTotalMainPages returns early when firstChapterPageIndex is null', () => {
    handler['firstChapterPageIndex'] = null;
    handler['totalMainPages'] = 99;

    const pages = [createPage('<div></div>')];
    handler['computeTotalMainPages'](pages);

    expect(handler['totalMainPages']).toBe(99);
  });

  test('computeTotalMainPages counts to last page when no attachments exist', () => {
    const pages = [
      createPage('<p stylename="chapterTitle"></p>'),
      createPage('<div></div>'),
      createPage('<div></div>'),
    ];

    handler['resolveFirstChapterPageIndex'](pages);
    handler['computeTotalMainPages'](pages);

    expect(handler['totalMainPages']).toBe(3);
  });

  test('computeTotalMainPages returns 0 when endIndex precedes firstChapterPageIndex', () => {
    const pages = [
      createPage('<p stylename="attachmentTitle"></p>'),
      createPage('<p stylename="chapterTitle"></p>'),
    ];

    handler['resolveFirstChapterPageIndex'](pages);
    handler['computeTotalMainPages'](pages);

    expect(handler['totalMainPages']).toBe(0);
  });

  test('detectAttachments counts pages correctly across multiple attachments', () => {
    const pages = [
      createPage('<p stylename="attachmentTitle"></p>'),
      createPage('<div></div>'),
      createPage('<p stylename="attachmentTitle"></p>'),
      createPage('<div></div>'),
      createPage('<div></div>'),
    ];

    handler['detectAttachments'](pages);

    expect(handler['attachmentPageCounters'].get(1)).toBe(2);
    expect(handler['attachmentPageCounters'].get(2)).toBe(3);
    expect(handler['currentAttachmentIndex']).toBe(2);
  });

  test('detectAttachments leaves counters empty when there are no attachments', () => {
    const pages = [createPage('<div></div>'), createPage('<div></div>')];
    handler['detectAttachments'](pages);
    expect(handler['attachmentPageCounters'].size).toBe(0);
    expect(handler['currentAttachmentIndex']).toBe(0);
  });

  test('getNonAfttpPageNumber returns pageIndex + 1 when lastPrePageIndex is null', () => {
    handler['lastPrePageIndex'] = null;
    expect(handler['getNonAfttpPageNumber'](4)).toBe('5');
  });

  test('getNonAfttpPageNumber returns offset from lastPrePageIndex when past the pre-pages', () => {
    handler['lastPrePageIndex'] = 2;
    expect(handler['getNonAfttpPageNumber'](5)).toBe('3');
  });

  test('getNonAfttpPageNumber returns roman numeral when pageIndex falls within pre-pages', () => {
    handler['lastPrePageIndex'] = 3;
    expect(handler['getNonAfttpPageNumber'](2)).toBe('iii');
  });

  test('getAfttpPageNumber returns chapter format when only chapters match', () => {
    const result = handler['getAfttpPageNumber'](
      4,
      [],
      [{ start: 3, end: 6, chapterIndex: 2 }]
    );
    expect(result).toBe('2-2');
  });

  test('getAfttpPageNumber falls back to roman when neither chapter nor attachment matches', () => {
    expect(handler['getAfttpPageNumber'](2, [], [])).toBe('iii');
  });

  test('formatLongDate returns empty string for invalid date input', () => {
    expect(handler['formatLongDate']('not-a-real-date')).toBe('');
  });

  test('formatLongDate returns a formatted en-GB date string for valid input', () => {
    const result = handler['formatLongDate']('2025-10-13');
    expect(result).toContain('October');
    expect(result).toContain('2025');
    expect(result).toContain('13');
  });

  test('applySingleTocLink returns early when link is not an HTMLElement', () => {
    const textNode = document.createTextNode('not html') as unknown as Element;
    expect(() =>
      handler['applySingleTocLink'](textNode, new Map(), false, [], [])
    ).not.toThrow();
  });

  test('applySingleTocLink returns early when href is missing entirely', () => {
    const page = createPage('<div class="toc-element"><a></a></div>');
    const link = page.element.querySelector('a') as HTMLElement;

    handler['applySingleTocLink'](link, new Map([['x', 1]]), false, [], []);

    expect(link.dataset.page).toBeUndefined();
  });

  test('applySingleTocLink returns early when id is not in refToPage', () => {
    const page = createPage('<div class="toc-element"><a href="#unknown"></a></div>');
    const link = page.element.querySelector('a') as HTMLElement;

    handler['applySingleTocLink'](link, new Map(), false, [], []);

    expect(link.dataset.page).toBeUndefined();
  });

  test('applySingleTocLink sets chapter page number in AFTTP mode', () => {
    const page = createPage('<div class="toc-element"><a href="#ch1"></a></div>');
    const link = page.element.querySelector('a') as HTMLElement;

    handler['applySingleTocLink'](
      link,
      new Map([['ch1', 5]]),
      true,
      [],
      [{ start: 4, end: 10, chapterIndex: 2 }]
    );

    expect(link.dataset.page).toBe('2-2');
  });

  test('applyPageNumbers (non-AFTTP) outputs roman for pre-pages and arabic afterwards', () => {
    const pages = [
      createPage('<div class="totHead"></div>'), 
      createPage('<div></div>'),                
      createPage('<div></div>'),              
    ];

    pages.forEach(p => {
      const margin = document.createElement('div');
      margin.className = 'pagedjs_margin-top-right';
      const content = document.createElement('div');
      content.className = 'pagedjs_margin-content';
      margin.appendChild(content);
      p.element.appendChild(margin);
    });

    handler['resetLastPrePageIndex'](pages);
    handler['applyPageNumbers'](pages);

    const nums = pages.map(
      p => p.element.querySelector('.pagedjs_margin-content')?.textContent
    );

    expect(nums[0]).toBe('i');
    expect(nums[1]).toBe('1');
    expect(nums[2]).toBe('2');
  });

  test('applyPageNumbers (AFTTP) skips pages without margin content but still numbers others', () => {
    previewState.pageBanner = { text: 'CUI', color: 'red' };

    const pages = [
      createPage('<p stylename="chapterTitle"></p>'),
      createPage('<div></div>'), 
      createPage('<div></div>'),
    ];

    [0, 2].forEach(i => {
      const margin = document.createElement('div');
      margin.className = 'pagedjs_margin-top-right';
      const content = document.createElement('div');
      content.className = 'pagedjs_margin-content';
      margin.appendChild(content);
      pages[i].element.appendChild(margin);
    });

    expect(() => handler['applyPageNumbers'](pages)).not.toThrow();

    const num0 = pages[0].element.querySelector('.pagedjs_margin-content')?.textContent;
    const num2 = pages[2].element.querySelector('.pagedjs_margin-content')?.textContent;

    expect(num0).toBe('1-1');
    expect(num2).toBe('1-3');
  });

  test('doIT (AFTTP) injects headerTitleContent with banner text and formatted title/date', async () => {
    previewState.pageBanner = { text: 'CUI', color: 'red' };
    previewState.documentTitle = 'My Document';
    previewState.formattedDate = '2025-10-13';

    await handler.doIT();

    const cssArg = (mockPolisher.convertViaSheet).mock.calls[0][0] as string;
    expect(cssArg).toContain('My Document');
    expect(cssArg).toContain('October');
    expect(cssArg).toContain('CUI');
    // Mode tracker should reflect afttp now
    expect((PDFHandler as unknown as { lastMode: string | null }).lastMode).toBe('afttp');
  });

  test('doIT (AFTTP) omits headerTitleContent when title and date are both empty', async () => {
    previewState.pageBanner = { text: 'CUI', color: 'red' };
    previewState.documentTitle = '';
    previewState.formattedDate = '';

    await handler.doIT();

    const cssArg = (mockPolisher.convertViaSheet).mock.calls[0][0] as string;
    expect(cssArg).toContain('CUI');
    expect(cssArg).not.toContain(', undefined');
  });

  test('doIT (AFTTP) with title but no date emits title alone in headerTitleContent', async () => {
    previewState.pageBanner = { text: 'CUI', color: 'red' };
    previewState.documentTitle = 'OnlyTitle';
    previewState.formattedDate = '';

    await handler.doIT();

    const cssArg = (mockPolisher.convertViaSheet).mock.calls[0][0] as string;
    expect(cssArg).toContain('OnlyTitle');
  });

  test('doIT removes previously injected handler styles when switching modes', async () => {

    (PDFHandler as unknown as { lastMode: string | null }).lastMode = 'non-afttp';

    const stale = document.createElement('style');
    stale.dataset.licitPdfHandler = 'true';
    document.head.appendChild(stale);

    previewState.pageBanner = { text: 'CUI', color: 'red' };
    await handler.doIT();

    expect(document.querySelector('style[data-licit-pdf-handler]')).toBeNull();
    expect((PDFHandler as unknown as { lastMode: string | null }).lastMode).toBe('afttp');
  });

  test('doIT keeps existing handler-marker styles when mode is unchanged', async () => {
    (PDFHandler as unknown as { lastMode: string | null }).lastMode = 'non-afttp';

    const keeper = document.createElement('style');
    keeper.dataset.licitPdfHandler = 'true';
    document.head.appendChild(keeper);
    previewState.pageBanner = null;
    await handler.doIT();

    expect(document.head.contains(keeper)).toBe(true);
    keeper.remove();
  });

  test('doIT marks the inserted style element with data-licit-pdf-handler when polisher returns one', async () => {
    const fakeStyle = document.createElement('style');
    (mockPolisher.insert).mockReturnValueOnce(fakeStyle);

    await handler.doIT();

    expect(fakeStyle.dataset.licitPdfHandler).toBe('true');
  });

  test('doIT does not throw when polisher.insert returns a falsy value', async () => {
    (mockPolisher.insert).mockReturnValueOnce(null);
    await expect(handler.doIT()).resolves.toBeUndefined();
  });

  test('buildLabel at higher level does NOT reset TOF/TOT counters', () => {
    handler['counters'][1] = 1;
    handler['counters'][2] = 0;
    handler['counters'][11] = 4;
    handler['counters'][12] = 7;

    const label: number[] = [];
    handler['buildLabel'](2, label);

    expect(handler['counters'][11]).toBe(4);
    expect(handler['counters'][12]).toBe(7);
    expect(label).toEqual([1, 1]);
  });

  test('stripHTML returns empty string for empty input', () => {
    expect(handler.stripHTML('')).toBe('');
  });

  test('stripHTML returns empty string for tags-only input with no text content', () => {
    expect(handler.stripHTML('<div></div>')).toBe('');
    expect(handler.stripHTML('<p><br/></p>')).toBe('');
  });

  test('stripHTML preserves nested text from multiple tags', () => {
    expect(handler.stripHTML('<div>A <span>B</span> C</div>')).toBe('A B C');
  });

  test('afterRendered exercises resolveFirstChapterPageIndex + computeTotalMainPages with chapter & attachment', () => {
    const pages = [
      createPage('<p stylename="chapterTitle"></p>'),
      createPage('<div></div>'),
      createPage('<p stylename="attachmentTitle"></p>'),
    ];

    Object.defineProperty(window, 'getComputedStyle', {
      value: jest.fn().mockReturnValue({ marginLeft: '0pt' }),
      writable: true,
    });

    expect(() => handler.afterRendered(pages)).not.toThrow();
    expect(handler['firstChapterPageIndex']).toBe(0);
    expect(handler['totalMainPages']).toBe(2);
  });

  test('buildAttachmentRanges sets end to pages.length for a single trailing attachment', () => {
    const pages = [
      createPage('<div></div>'),
      createPage('<p stylename="attachmentTitle"></p>'),
      createPage('<div></div>'),
    ];

    const ranges = handler['buildAttachmentRanges'](pages);

    expect(ranges).toEqual([{ start: 1, end: 3, index: 1 }]);
  });

  test('buildChapterRanges sets end to pages.length for a single chapter', () => {
    const pages = [
      createPage('<p stylename="chapterTitle"></p>'),
      createPage('<div></div>'),
    ];

    expect(handler['buildChapterRanges'](pages)).toEqual([
      { start: 0, end: 2, chapterIndex: 1 },
    ]);
  });

  test('buildChapterRanges returns empty list when no chapter pages exist', () => {
    const pages = [createPage('<div></div>'), createPage('<div></div>')];
    expect(handler['buildChapterRanges'](pages)).toEqual([]);
  });

  test('buildAttachmentRanges returns empty list when no attachment pages exist', () => {
    const pages = [createPage('<div></div>'), createPage('<div></div>')];
    expect(handler['buildAttachmentRanges'](pages)).toEqual([]);
  });

  test('resetLastPrePageIndex picks the last page containing a totHead', () => {
    const pages = [
      createPage('<div class="totHead"></div>'),
      createPage('<div></div>'),
      createPage('<div class="totHead"></div>'),
      createPage('<div></div>'),
    ];

    handler['resetLastPrePageIndex'](pages);

    expect(handler['lastPrePageIndex']).toBe(2);
  });

  test('fixSplitTo applies margin-top and padding-left when split-to paragraph exists', () => {
    const page = document.createElement('div');
    const p = document.createElement('p');
    p.dataset.splitTo = 'true';
    page.appendChild(p);

    handler['fixSplitTo'](page, () => '7pt');

    expect(p.style.marginTop).toBe('1pt');
    expect(p.style.marginLeft).toBe('0pt');
    expect(p.style.paddingLeft).toBe('7pt');
  });

  test('fixSplitFrom safely returns when no split-from element is present', () => {
    const page = document.createElement('div');
    expect(() => handler['fixSplitFrom'](page, () => '7pt')).not.toThrow();
  });

  test('fixSplitFrom applies margin and padding when split-from paragraph exists', () => {
    const page = document.createElement('div');
    const p = document.createElement('p');
    p.dataset.splitFrom = 'true';
    page.appendChild(p);

    handler['fixSplitFrom'](page, () => '9pt');

    expect(p.style.marginLeft).toBe('0pt');
    expect(p.style.paddingLeft).toBe('9pt');
  });

  test('fixIndent applies styling for each indent paragraph', () => {
    const page = document.createElement('div');
    const p1 = document.createElement('p');
    p1.dataset.indent = 'true';
    const p2 = document.createElement('p');
    p2.dataset.indent = 'true';
    page.appendChild(p1);
    page.appendChild(p2);

    handler['fixIndent'](page, () => '11pt');

    expect(p1.style.marginLeft).toBe('0pt');
    expect(p1.style.paddingLeft).toBe('11pt');
    expect(p2.style.paddingLeft).toBe('11pt');
  });
});