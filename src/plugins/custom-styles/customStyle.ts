/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import type { Style, CSSStyle, StyleRuntime } from './StyleRuntime';
import { EditorView } from 'prosemirror-view';
import {
  RESERVED_STYLE_NONE,
  RESERVED_STYLE_NONE_NUMBERING,
} from './customStyleConstants';
import { DEFAULT_NORMAL_STYLE } from './Constants';
import { setCustomStyles } from '../../commands';

type MaybePromise<T> = Promise<T> | T;

type StyleRuntimeLike = Partial<StyleRuntime> & {
  canEditStyle?: boolean;
  getStylesAsync?: () => MaybePromise<Style[] | null | undefined>;
  saveStyle?: (style: Style) => MaybePromise<Style | Style[] | null | undefined>;
  renameStyle?: (
    oldStyleName: string,
    newStyleName: string
  ) => MaybePromise<Style[] | null | undefined>;
  removeStyle?: (name: string) => MaybePromise<Style[] | null | undefined>;
  saveStyleSet?: (styles: Style[]) => MaybePromise<Style[] | null | undefined>;
};

type SharedCustomStyleState = {
  customStyles: Style[];
  styleRuntime: StyleRuntimeLike | null;
};

const CUSTOM_STYLE_STATE_KEY = Symbol.for(
  '@modusoperandi/licit-tiptap/custom-style-state'
);
const sharedStates = globalThis as unknown as Record<
  symbol,
  SharedCustomStyleState
>;
const sharedState = (sharedStates[CUSTOM_STYLE_STATE_KEY] ??= {
  customStyles: [],
  styleRuntime: null,
});

// O(1) lookup cache for style-by-name. Rebuilt whenever the style list changes.
let styleByNameMap = new Map<string, Style>();

// Cache invalidation callbacks — other modules register to be notified
// when the style list changes so they can clear their own caches.
let styleCacheInvalidators: (() => void)[] = [];

function rebuildStyleByNameMap() {
  styleByNameMap = new Map<string, Style>();
  for (const style of sharedState.customStyles) {
    if (style?.styleName) {
      styleByNameMap.set(style.styleName, style);
    }
  }
}

export function invalidateStyleCache() {
  for (const fn of styleCacheInvalidators) {
    fn();
  }
}

export function registerStyleCacheInvalidator(fn: () => void): () => void {
  styleCacheInvalidators.push(fn);
  return () => {
    styleCacheInvalidators = styleCacheInvalidators.filter((f) => f !== fn);
  };
}

let hideNumbering = false;
let _view: EditorView | null = null;
let hasdocTypechanged = false;
let docType: string | null = null;
// None & None-@#$- have same effect of None.
// None-@#$-<styleLevel> is used for numbering to set style level for None, based on the cursor level style level.
function isValidStyleName(styleName?: string) {
  return (
    styleName &&
    !styleName.includes(RESERVED_STYLE_NONE_NUMBERING) &&
    sharedState.customStyles?.length > 0
  );
}

function shouldFallbackToNormalStyle(styleName?: string): boolean {
  if (!styleName) {
    return true;
  }

  const normalized = styleName.trim().toLowerCase();
  return (
    normalized === RESERVED_STYLE_NONE.toLowerCase() ||
    normalized === 'default'
  );
}

export function addStyleToList(style: Style): Style[] {
  const customStyles = sharedState.customStyles;
  if (0 < customStyles.length && style?.styleName) {
    const index = customStyles.findIndex(
      (item) => item?.styleName === style?.styleName
    );
    if (index === -1) {
      customStyles.push(style);
    } else {
      customStyles[index] = style;
    }
  }
  rebuildStyleByNameMap();
  invalidateStyleCache();
  return customStyles;
}

// check if the entered style name already exist
export function isCustomStyleExists(styleName: string) {
  let bOK = false;
  if (isValidStyleName(styleName)) {
    for (const style of sharedState.customStyles) {
      // Able to add same style name
      if (styleName.toUpperCase() === style?.styleName?.toUpperCase()) {
        bOK = true;
        return bOK;
      }
    }
  }
  return bOK;
}

// get a style by styleName
export function getCustomStyleByName(name: string): Style {
  if (isValidStyleName(name)) {
    const cached = styleByNameMap.get(name);
    if (cached) {
      return cached;
    }
    // Imported docs may carry style names that do not exist in the runtime
    // style list (e.g. class-derived names like CellHeading). Do not coerce
    // those unknown names to Normal, or we inject Normal spacing unexpectedly.
    return shouldFallbackToNormalStyle(name)
      ? DEFAULT_NORMAL_STYLE
      : { styleName: name, styles: {} };
  }
  return DEFAULT_NORMAL_STYLE;
}

export function setView(csview: EditorView) {
  _view = csview;
}

// store styles in cache
export function setStyles(style: Style[]) {
  sharedState.customStyles = style;
  rebuildStyleByNameMap();
  invalidateStyleCache();
  setCustomStyles(style);
  let documentType;
  if (style && Array.isArray(style)) {
    documentType = style?.[0]?.docType;
  }
  hasdocTypechanged = docType !== documentType;
  docType = documentType;
  if (docType) {
    hasdocTypechanged = true;
    if (_view) {
      _view.dispatch(_view.state.tr.scrollIntoView());
      _view = null;
    }
  }
  if (style[0] === undefined || !Object.hasOwn(style[0], 'docType')) {
    hasdocTypechanged = true;
  }
  // if the styles doesn't have default style Normal then add that style.
  if (style && !isCustomStyleExists(RESERVED_STYLE_NONE)) {
    saveDefaultStyle();
  }
}
export function setHidenumberingFlag(hideNumberingFlag: boolean): void {
  hideNumbering = hideNumberingFlag;
}

export function getHidenumberingFlag(): boolean {
  return hideNumbering;
}

export function setStyleRuntime(runtime: StyleRuntimeLike | null): void {
  sharedState.styleRuntime = runtime;
}

export function getStyleRuntime(): StyleRuntimeLike | null {
  return sharedState.styleRuntime;
}

export function getCachedStyles(): Style[] {
  return [...sharedState.customStyles];
}

export function setCustomStylesOnLoad(): void {
  getStylesAsync()
    .then((result) => {
      if (result) {
        setStyles(result);
      }
    })
    .catch(console.warn);
}

function saveDefaultStyle(): void {
  saveStyle(DEFAULT_NORMAL_STYLE).catch(console.error);
}

export function isStylesLoaded(): boolean {
  return sharedState.customStyles?.length > 0 && hasdocTypechanged;
}

export function hasStyleRuntime(): boolean {
  return !!sharedState.styleRuntime;
}
// get a style by Level
export function getCustomStyleByLevel(level: number): Style | null {
  let style: Style | null = null;
  if (sharedState.customStyles.length > 0) {
    for (const obj of sharedState.customStyles) {
      if (
        obj.styles?.hasNumbering &&
        obj.styles.styleLevel &&
        level === Number(obj.styles.styleLevel)
      ) {
        if (null === style) {
          style = obj;
          return style;
        }
      }
    }
  }
  return style;
}

// To find the custom style exists with the given  level.
export function isPreviousLevelExists(previousLevel: number) {
  let isLevelExists = true;
  if (sharedState.customStyles.length > 0 && 0 < previousLevel) {
    const value = sharedState.customStyles.find((u) => {
      let retVal = false;
      if (u?.styles) {
        retVal = Number(u.styles.styleLevel) === previousLevel;
      }
      return retVal;
    });
    isLevelExists = !!value;
  }
  return isLevelExists;
}

// [FS] IRAD-1046 2020-09-24
// To create a style object from the customstyles to show the styles in the example piece.
export function getCustomStyle(customStyle) {
  const style: CSSStyle = {};

  for (const property in customStyle) {
    applyCustomStyleProperty(style, customStyle, property);
  }
  return style;
}

function applyCustomStyleProperty(
  style: CSSStyle,
  customStyle,
  property: string
): void {
  const styleWithMargins = style as CSSStyle & {
    marginTop?: string;
    marginBottom?: string;
    marginLeft?: string;
    marginRight?: string;
  };

  switch (property) {
    case 'strong':
      applyStrongStyle(style, customStyle);
      break;
    case 'em':
      applyConditionalStyle(style, customStyle[property], 'fontStyle', 'italic');
      break;
    case 'color':
      style.color = customStyle[property];
      break;
    case 'textHighlight':
      style.backgroundColor = customStyle[property];
      break;
    case 'fontSize':
      style.fontSize = customStyle[property];
      break;
    case 'fontName':
      style.fontName = customStyle[property];
      break;
    case 'strike':
      applyConditionalStyle(
        style,
        customStyle[property],
        'textDecorationLine',
        'line-through'
      );
      break;
    case 'super':
      style.verticalAlign = 'super';
      break;
    case 'underline':
      applyConditionalStyle(
        style,
        customStyle[property],
        'textDecoration',
        'underline'
      );
      break;
    case 'textAlign':
      style.textAlign = customStyle[property];
      break;
    case 'lineHeight':
      style.lineHeight = customStyle[property];
      break;
    case 'marginTop':
    case 'marginBottom':
    case 'marginLeft':
    case 'marginRight':
      styleWithMargins[property] = customStyle[property];
      break;
    default:
      break;
  }
}

function applyStrongStyle(style: CSSStyle, customStyle): void {
  if (!customStyle.boldPartial && customStyle.strong) {
    style.fontWeight = 'bold';
  }
}

function applyConditionalStyle(
  style: CSSStyle,
  enabled: unknown,
  property: string,
  value: string
): void {
  if (enabled) {
    (style as Record<string, string>)[property] = value;
  }
}
// method to save,retrive,rename and remove style from the style server.
export function saveStyle(
  styleProps: Style
): Promise<Style[] | Style | null | undefined> {
  return Promise.resolve(sharedState.styleRuntime?.saveStyle?.(styleProps));
}
export function getStylesAsync(): Promise<Style[]> {
  return Promise.resolve(sharedState.styleRuntime?.getStylesAsync?.()).then(
    (result) => result ?? []
  );
}
export function renameStyle(
  oldName: string,
  newName: string
): Promise<Style[]> {
  return Promise.resolve(
    sharedState.styleRuntime?.renameStyle?.(oldName, newName)
  ).then(
    (result) => result ?? []
  );
}
export function removeStyle(styleName: string): Promise<Style[]> {
  return Promise.resolve(sharedState.styleRuntime?.removeStyle?.(styleName)).then(
    (result) => result ?? []
  );
}
export function saveStyleSet(styles: Style[]): Promise<Style[]> {
  return Promise.resolve(sharedState.styleRuntime?.saveStyleSet?.(styles)).then(
    (result) => result ?? []
  );
}
