/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import type { Style, CSSStyle, StyleRuntime } from './StyleRuntime';
import { EditorView } from 'prosemirror-view';
import {
  RESERVED_STYLE_NONE,
  RESERVED_STYLE_NONE_NUMBERING,
} from './CustomStyleNodeSpec';
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

let customStyles: Style[] = [];
let styleRuntime: StyleRuntimeLike | null = null;
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
    customStyles?.length > 0
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
  if (0 < customStyles.length && style?.styleName) {
    const index = customStyles.findIndex(
      (item) => item?.styleName === style?.styleName
    );
    if (index !== -1) {
      customStyles[index] = style;
    } else {
      customStyles.push(style);
    }
  }
  return customStyles;
}

// check if the entered style name already exist
export function isCustomStyleExists(styleName: string) {
  let bOK = false;
  if (isValidStyleName(styleName)) {
    for (const style of customStyles) {
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
  let style: Style = { styleName: name };
  let has = false;
  if (isValidStyleName(name)) {
    // break the loop if find any matches
    for (let i = 0; !has && i < customStyles.length; i++) {
      if (name === customStyles[i].styleName) {
        style = customStyles[i];
        has = true;
      }
    }

    // Imported docs may carry style names that do not exist in the runtime
    // style list (e.g. class-derived names like CellHeading). Do not coerce
    // those unknown names to Normal, or we inject Normal spacing unexpectedly.
    if (!has) {
      style = shouldFallbackToNormalStyle(name)
        ? DEFAULT_NORMAL_STYLE
        : ({ styleName: name, styles: {} } as Style);
    }
  } else {
    style = DEFAULT_NORMAL_STYLE;
  }
  return style;
}

export function setView(csview: EditorView) {
  _view = csview;
}

// store styles in cache
export function setStyles(style: Style[]) {
  customStyles = style;
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
  styleRuntime = runtime;
}

export function getStyleRuntime(): StyleRuntimeLike | null {
  return styleRuntime;
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
  return customStyles?.length > 0 && hasdocTypechanged;
}

export function hasStyleRuntime(): boolean {
  return !!styleRuntime;
}
// get a style by Level
export function getCustomStyleByLevel(level: number): Style | null {
  let style: Style | null = null;
  if (customStyles.length > 0) {
    for (const obj of customStyles) {
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
  if (customStyles.length > 0 && 0 < previousLevel) {
    const value = customStyles.find((u) => {
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
  const styleWithMargins = style as CSSStyle & {
    marginTop?: string;
    marginBottom?: string;
    marginLeft?: string;
    marginRight?: string;
  };

  for (const property in customStyle) {
    switch (property) {
      case 'strong':
        // Deselected Bold, Italics and Underline are not removed from the example style near style name
        if (!customStyle.boldPartial && customStyle[property]) {
          style.fontWeight = 'bold';
        }
        break;

      case 'em':
        // Deselected Bold, Italics and Underline are not removed from the example style near style name
        if (customStyle[property]) {
          style.fontStyle = 'italic';
        }
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
      // Fix:icluded strike through in custom styles.
      case 'strike':
        if (customStyle[property]) {
          style.textDecorationLine = 'line-through';
        }
        break;

      case 'super':
        style.verticalAlign = 'super';
        break;

      case 'underline':
        // Deselected Bold, Italics and Underline are not removed from the example style near style name
        if (customStyle[property]) {
          style.textDecoration = 'underline';
        }
        break;

      case 'textAlign':
        style.textAlign = customStyle[property];
        break;

      case 'lineHeight':
        style.lineHeight = customStyle[property];
        break;

      case 'marginTop':
        styleWithMargins.marginTop = customStyle[property];
        break;

      case 'marginBottom':
        styleWithMargins.marginBottom = customStyle[property];
        break;

      case 'marginLeft':
        styleWithMargins.marginLeft = customStyle[property];
        break;

      case 'marginRight':
        styleWithMargins.marginRight = customStyle[property];
        break;

      default:
        break;
    }
  }
  return style;
}
// method to save,retrive,rename and remove style from the style server.
export function saveStyle(
  styleProps: Style
): Promise<Style[] | Style | null | undefined> {
  return Promise.resolve(styleRuntime?.saveStyle?.(styleProps));
}
export function getStylesAsync(): Promise<Style[]> {
  return Promise.resolve(styleRuntime?.getStylesAsync?.()).then(
    (result) => result ?? []
  );
}
export function renameStyle(
  oldName: string,
  newName: string
): Promise<Style[]> {
  return Promise.resolve(styleRuntime?.renameStyle?.(oldName, newName)).then(
    (result) => result ?? []
  );
}
export function removeStyle(styleName: string): Promise<Style[]> {
  return Promise.resolve(styleRuntime?.removeStyle?.(styleName)).then(
    (result) => result ?? []
  );
}
export function saveStyleSet(styles: Style[]): Promise<Style[]> {
  return Promise.resolve(styleRuntime?.saveStyleSet?.(styles)).then(
    (result) => result ?? []
  );
}
