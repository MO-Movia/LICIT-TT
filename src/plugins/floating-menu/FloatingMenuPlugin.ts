/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 * @file A generic Floating Menu ProseMirror Plugin
 */

import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';
import {Node, Schema} from 'prosemirror-model';
import {Plugin, EditorState, Transaction} from 'prosemirror-state';
import {FloatingMenu} from './FloatingPopup';
import {CMPluginKey, FloatingMenuItem, type FloatingMenuContext} from './model';
import { getDefaultMenuItems } from './FloatingMenuDefaults';
import { PopUpHandle } from '../../commands/ui/PopUp';
import { createKeyMapPlugin, makeKeyMapWithCommon } from '../../core/KeyCommand';
import { Rect } from '../../licit/htmlElementToRect';
import { createPopUp } from '../../commands/ui/createPopUp';

export function stepAddsParagraph(content: unknown): boolean {
  if (!Array.isArray(content)) {
    return false;
  }

  return content.some((item) => {
    if (!item || typeof item !== 'object') {
      return false;
    }

    const node = item as { type?: string; content?: unknown };
    return node.type === 'paragraph' || stepAddsParagraph(node.content);
  });
}

export function shouldRescanDecorations(tr: Transaction): boolean {
  if (tr.getMeta(CMPluginKey)?.forceRescan) {
    return true;
  }

  return tr.steps.some((step) => {
    const serializedStep = step.toJSON() as {
      stepType?: string;
      slice?: { content?: unknown };
    };

    if (serializedStep.stepType === 'setNodeMarkup' || serializedStep.stepType === 'replaceAround') {
      return true;
    }

    if (serializedStep.stepType !== 'replace') {
      return false;
    }

    return stepAddsParagraph(serializedStep.slice?.content);
  });
}

export function createPointerDownHandler(
  plugin: FloatingMenuPlugin,
  view: EditorView,
  menuItems: FloatingMenuItem[]
): (e: PointerEvent) => void {
  return (e: PointerEvent) => {
    const targetEl = getClosestHTMLElement(e.target, '.float-icon');
    if (!targetEl) return;

    e.preventDefault();
    e.stopPropagation();

    const wrapper = getClosestHTMLElement(
      targetEl,
      '.pm-hamburger-wrapper'
    );
    wrapper?.classList.add('popup-open');

    const pos = Number(targetEl.dataset.pos);
    openFloatingMenu(plugin, view, menuItems, pos, targetEl);
  };
}

export function createContextMenuHandler(
  plugin: FloatingMenuPlugin,
  view: EditorView,
  menuItems: FloatingMenuItem[]
): (e: MouseEvent) => void {
  return (e: MouseEvent) => {
    if (e.altKey && e.button === 2 && view.editable) {
      e.preventDefault();
      e.stopPropagation();

      const pos = {
        x: e ? e.clientX : 0,
        y: e ? e.clientY : 0,
      };

      openFloatingMenu(
        plugin,
        view,
        menuItems,
        undefined,
        undefined,
        pos
      );
    }
  };
}

export function createOutsideClickHandler(
  plugin: FloatingMenuPlugin
): (e: MouseEvent) => void {
  return (e: MouseEvent) => {
    const el = e.target as HTMLElement;
    if (
      plugin._popUpHandle &&
      !el.closest('.context-menu') &&
      !el.closest('.float-icon')
    ) {
      plugin._popUpHandle.close(null);
      plugin._popUpHandle = null;
    }
  };
}

export class FloatingMenuPlugin extends Plugin {
  _popUpHandle: PopUpHandle | null = null;
  /**
   *
   * @param menuItems Set of menu items to show
   * @param decorationMarks Functions to create a set of optional paragraph decorators
   */
  constructor(
    private readonly menuItems: FloatingMenuItem[] = getDefaultMenuItems(),
    decorationMarks?: ((
      node: Node,
      pos: number,
      state: EditorState
    ) => Element | undefined)[]
  ) {
    super({
      key: CMPluginKey,
      state: {
        init(_config, state) {
          return {
            decorations: getDecorations(state.doc, state, decorationMarks),
          };
        },
        apply(tr, prev, _oldState, newState) {
          const forceRescan =
            typeof tr.getMeta === 'function'
              ? tr.getMeta(CMPluginKey)?.forceRescan
              : false;
          const mappedDecorations = prev.decorations
            ? prev.decorations.map(tr.mapping, tr.doc)
            : DecorationSet.empty;

          if (!tr.docChanged && !forceRescan) {
            return {decorations: mappedDecorations};
          }

          if (shouldRescanDecorations(tr)) {
            return {
              decorations: getDecorations(tr.doc, newState, decorationMarks),
            };
          }

          return {decorations: mappedDecorations};
        },
      },
      props: {
        decorations(state) {
          const pluginState = (this as FloatingMenuPlugin).getState(state);
          return pluginState?.decorations as DecorationSet | undefined;
        },
      },
      view: (view) => {
        const plugin = this as FloatingMenuPlugin;

        const pointerDownHandler = createPointerDownHandler(plugin, view, menuItems);
        view.dom.addEventListener('pointerdown', pointerDownHandler);

        // --- Alt + Right Click handler ---
        const contextMenuHandler = createContextMenuHandler(plugin, view, menuItems);
        view.dom.addEventListener('contextmenu', contextMenuHandler);

        // --- Close popup on outside click ---
        const outsideClickHandler = createOutsideClickHandler(plugin);
        document.addEventListener('click', outsideClickHandler);
        return {
          destroy() {
            view.dom.removeEventListener('pointerdown', pointerDownHandler);
            view.dom.removeEventListener('contextmenu', contextMenuHandler);
            document.removeEventListener('click', outsideClickHandler);
            closeExistingPopup(plugin);
          },
        };
      },
    });
  }

  public initKeyCommands(): Plugin[] {
    return createKeyMapPlugin(
      this.menuItems
        .filter((x) => x.hotKeys)
        .map((item, index) => ({
          map: {
            [makeKeyMapWithCommon('FloatingMenuPlugin', item.hotKeys).common]:
              (view) => {
                item.onClick({editorView: view, editorState: view.state});
                return true;
              },
          },
          name: 'FloatMenu_' + index + '_' + item.label,
        }))
    ) as Plugin[];
  }

  getEffectiveSchema(schema: Schema): Schema {
    return schema;
  }
}

// --- Decoration function ---
export function createHamburgerWidget(pos: number, node: Node): Decoration {
  return Decoration.widget(
    pos + 1,
    () => {
      const wrapper = document.createElement('span');
      wrapper.className = 'pm-hamburger-wrapper';

      const hamburger = document.createElement('span');
      hamburger.className = 'float-icon fa fa-bars';
      hamburger.style.fontFamily = 'FontAwesome'; // for fa compatibility
      hamburger.dataset.pos = String(pos);

      wrapper.appendChild(hamburger);
      return wrapper;
    },
    {
      key: `float-icon-${node.attrs?.objectId ?? pos}`,
      side: 1,
    }
  );
}

export function createDecorationMarksWidget(pos: number, node: Node, decoFlags: Element[]): Decoration {
  return Decoration.widget(
    pos + 1,
    () => {
      const container = document.createElement('span');
      container.style.position = 'absolute';
      container.style.left = '27px';
      container.style.display = 'inline-flex';
      container.style.gap = '6px';
      container.style.alignItems = 'center';
      container.contentEditable = 'false';
      container.style.userSelect = 'none';

      decoFlags.forEach((decoFlag) => container.appendChild(decoFlag));

      return container;
    },
    {
      key: `float-marks-${node.attrs?.objectId ?? pos}`,
      side: -1,
    }
  );
}

export function getDecorations(doc: Node, state: EditorState, decorationMarks?: ((node: Node, pos: number, state: EditorState) => Element | undefined)[]): DecorationSet {
  const decorations: Decoration[] = [];

  doc?.forEach((node: Node, pos: number) => {
    if (node.type.name !== 'paragraph') return;
    decorations.push(createHamburgerWidget(pos, node));
    
    const decoFlags = decorationMarks?.map(fn => fn(node, pos, state)).filter(x => !!x);
    if (!decoFlags?.length) return;
    decorations.push(createDecorationMarksWidget(pos, node, decoFlags));
  });
  return DecorationSet.create(state.doc, decorations);
}

export function positionAboveOrBelow(anchorRect?: Rect, bodyRect?: Rect): Rect {
  if (!anchorRect) {
    return { x: 4, y: 4, w: 0, h: 0 };
  }

  const estimatedWidth = bodyRect && bodyRect.w > 0 ? bodyRect.w : 180;
  const estimatedHeight = bodyRect && bodyRect.h > 0 ? bodyRect.h : 220;


  const menuW = estimatedWidth;
  const menuH = estimatedHeight;

  // available space below/above relative to viewport
  const anchorBottom = anchorRect.y + anchorRect.h;
  const spaceBelow = window.innerHeight - anchorBottom;
  const spaceAbove = anchorRect.y;

  let y: number;
  let x: number;

  if (spaceBelow < menuH && spaceAbove > menuH) {
    y = anchorRect.y - menuH - 6; // small gap
  } else {
    y = anchorBottom + 6;
  }

  x = anchorRect.x;
  if (x + menuW > window.innerWidth - 6) {
    x = Math.max(6, window.innerWidth - menuW - 6);
  }

  x = Math.max(6, x);

  if (y < 6) y = 6;
  if (y + menuH > window.innerHeight - 6) {
    y = Math.max(6, window.innerHeight - menuH - 6);
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(menuW),
    h: Math.round(menuH),
  };
}

export function closeExistingPopup(
  this: void,
  plugin: FloatingMenuPlugin
): void {
  plugin._popUpHandle?.close(null);
}

export function createOnCloseHandler(
  plugin: FloatingMenuPlugin,
  anchorEl?: HTMLElement
): () => void {
  return () => {
    plugin._popUpHandle = null;
    anchorEl?.closest('.pm-hamburger-wrapper')?.classList.remove('popup-open');
  };
}

export function openFloatingMenu(
  plugin: FloatingMenuPlugin,
  view: EditorView,
  items: FloatingMenuItem[],
  pos?: number,
  anchorEl?: HTMLElement,
  contextPos?: {x: number; y: number}
) {
  closeExistingPopup(plugin);

  const ctx: FloatingMenuContext = {
    editorView: view,
    editorState: view.state,
    paragraphPos: pos,
  };

  plugin._popUpHandle = createPopUp(
    FloatingMenu,
    {
      context: ctx,
      items,
      close: closeExistingPopup.bind(undefined, plugin),
    },
    {
      anchor: anchorEl || view.dom,
      contextPos,
      position: positionAboveOrBelow,
      autoDismiss: false,
      onClose: createOnCloseHandler(plugin, anchorEl),
    }
  );
}

export function getClosestHTMLElement(
  el: EventTarget | null,
  selector: string
): HTMLElement | null {
  if (!(el instanceof Element)) return null;
  const closest = el.closest(selector);
  return closest instanceof HTMLElement ? closest : null;
}
