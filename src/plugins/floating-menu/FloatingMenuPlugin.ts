/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 * @file A generic Floating Menu ProseMirror Plugin
 */

import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';
import { Node, Schema, Slice } from 'prosemirror-model';
import { Plugin, PluginKey, EditorState, Transaction } from 'prosemirror-state';
import { createPopUp, PopUpHandle, Rect } from '../../commands';
import { FloatingMenu } from './FloatingPopup';
import { v4 as uuidv4 } from 'uuid';
import { insertReference } from '../referencing';
import { createSliceManager } from './slice';
import { FloatRuntime, FloatingMenuItem } from './model';
import { createKeyMapPlugin, makeKeyMapWithCommon } from '../../core';
import { getDefaultMenuItems } from './FloatingMenuDefaults';

export const CMPluginKey = new PluginKey<FloatingMenuPlugin>('floating-menu');
interface SliceModel {
  name: string;
  description: string;
  id: string;
  referenceType: string;
  source: string;
  from: string;
  to: string;
  ids: string[];
}
export const KEY_COPY = makeKeyMapWithCommon('FloatingMenuPlugin', 'Mod-c');
export const KEY_CUT = makeKeyMapWithCommon('FloatingMenuPlugin', 'Mod-x');
export const KEY_PASTE = makeKeyMapWithCommon('FloatingMenuPlugin', 'Mod-v');
export const KEY_PASTE_REF = makeKeyMapWithCommon('FloatingMenuPlugin', 'Mod-Alt-v');

interface UrlConfig {
  instanceUrl?: string;
  referenceUrl?: string;
}

export class FloatingMenuPlugin extends Plugin {
  _popUpHandle: PopUpHandle | null = null;
  _view: EditorView | null = null;
  _urlConfig: UrlConfig | null = null;
  menuItems?: FloatingMenuItem[];
  sliceManager: ReturnType<typeof createSliceManager>;
  sliceRuntime: FloatRuntime;
  constructor(sliceRuntime: FloatRuntime, urlConfig: UrlConfig = {}, menuItems?: FloatingMenuItem[]) {
    const sliceManager = createSliceManager(sliceRuntime);
    super({
      key: CMPluginKey,
      state: {
        init(_config, state) {
          return {
            decorations: getDecorations(state.doc, state),
          };
        },
        apply(tr, prev, _oldState, newState) {
          let decos = prev.decorations;

          if (!tr.docChanged) {
            return { decorations: decos ? DecorationSet.prototype.map.call(decos, tr.mapping, tr.doc) : decos };
          }

          decos = DecorationSet.prototype.map.call(decos, tr.mapping, tr.doc);

          const requiresRescan =
            tr.steps.some((step) => {
              const s = step.toJSON();
              return (
                s.stepType === 'replace' ||
                s.stepType === 'replaceAround' ||
                s.stepType === 'setNodeMarkup'
              );
            }) || tr.getMeta(CMPluginKey)?.forceRescan;

          if (requiresRescan) {
            decos = getDecorations(tr.doc, newState);
          }

          return { decorations: decos };
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
        plugin._view = view;
        plugin.sliceManager = sliceManager;
        plugin._urlConfig = urlConfig;
        getDocSlices.call(plugin, view);

        view.dom.addEventListener('pointerdown', (e) => {
          const targetEl = getClosestHTMLElement(e.target, '.float-icon');
          if (!targetEl) return;

          e.preventDefault();
          e.stopPropagation();

          const wrapper = getClosestHTMLElement(targetEl, '.pm-hamburger-wrapper');
          wrapper?.classList.add('popup-open');

          const pos = Number(targetEl.dataset.pos);
          openFloatingMenu(plugin, view, pos, targetEl);
        });

        // --- Alt + Right Click handler ---
        view.dom.addEventListener('contextmenu', (e: MouseEvent) => {
          if (e.altKey && e.button === 2 && view.editable) {
            e.preventDefault();
            e.stopPropagation();

            const pos = {
              x: e ? e.clientX : 0,
              y: e ? e.clientY : 0,
            };

            openFloatingMenu(plugin, view, undefined, undefined, pos);
          }
        });

        // --- Close popup on outside click ---
        const outsideClickHandler = (e: MouseEvent) => {
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
        document.addEventListener('click', outsideClickHandler);
        return {};
      },
    });
    this.sliceRuntime = sliceRuntime;
    this.menuItems = menuItems;
  }

  public initKeyCommands(): Plugin[] {
    return createKeyMapPlugin([
      {
        map: {
          [KEY_COPY.common]: (_state, _dispatch, view) =>
            copySelectionRich(view, this),
        },
        name: 'CopySlicePluginKeyCommands',
      },
      {
        map: {
          [KEY_CUT.common]: (_state, _dispatch, view) =>
            copySelectionRich(view, this),
        },
        name: 'CutSlicePluginKeyCommands',
      },
      {
        map: {
          [KEY_PASTE.common]: (_state, _dispatch, view) =>
            pasteFromClipboard(view, this),
        },
        name: 'PasteSlicePluginKeyCommands',
      },
      {
        map: {
          [KEY_PASTE_REF.common]: (_state, _dispatch, view) =>
            pasteAsReference(view, this),
        },
        name: 'PasteReferencePluginKeyCommands',
      },
    ], 'FloutingMenu Items') as Plugin[];
  }

  getEffectiveSchema(schema: Schema): Schema {
    return schema;
  }
}

export function copySelectionRich(
  view: EditorView,
  plugin: FloatingMenuPlugin
) {
  const { state } = view;
  if (state.selection.empty) return;

  if (!view.hasFocus()) view.focus();

  const slice = state.selection.content();

  const sliceJSON = {
    content: slice.content.toJSON(),
    openStart: slice.openStart,
    openEnd: slice.openEnd,
    sliceModel: createSliceObject(view),
  };

  navigator.clipboard
    .writeText(JSON.stringify(sliceJSON))
    .then(() => { })
    .catch((err) => console.error('Clipboard write failed', err));
  if (plugin._popUpHandle) {
    plugin._popUpHandle.update({
      ...plugin._popUpHandle['props'],
      pasteAsReferenceEnabled: true,
    });
  }
  if (plugin._popUpHandle?.close) {
    plugin._popUpHandle.close(null);
    plugin._popUpHandle = null;
  }
}

export function createSliceObject(editorView: EditorView): SliceModel {
  const plugin = CMPluginKey.get(editorView.state) as FloatingMenuPlugin;
  const referenceUrl = plugin?._urlConfig?.referenceUrl;
  const instanceUrl = plugin?._urlConfig?.instanceUrl;
  const sliceModel: SliceModel = {
    name: '',
    description: '',
    id: '',
    referenceType: '',
    source: '',
    from: '',
    to: '',
    ids: [],
  };

  editorView.focus();

  const $from = editorView.state.selection.$from;
  const $to = editorView.state.selection.$to;

  const from = $from.start($from.depth);
  const to = $to.end($to.depth);

  const paragraphEntries: { pos: number; id?: string; text?: string }[] = [];

  editorView.state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name === 'paragraph') {
      paragraphEntries.push({
        pos,
        id: node.attrs?.objectId,
        text: node.textContent?.trim() || undefined,
      });
    }
  });

  paragraphEntries.sort((a, b) => a.pos - b.pos);
  const objectIds = paragraphEntries
    .filter(entry => entry.id !== undefined)
    .map(entry => entry.id);

  const firstParagraphText = paragraphEntries.find(entry => entry.text)?.text ?? '';

  sliceModel.id = instanceUrl + uuidv4();
  sliceModel.ids = objectIds;
  sliceModel.from = objectIds.length > 0 ? objectIds[0] : '';
  sliceModel.to = objectIds.length > 0 ? objectIds.at(-1) : '';

  const viewWithDocView = editorView;
  sliceModel.source = viewWithDocView?.['docView']?.node?.attrs?.objectId;
  sliceModel.referenceType = referenceUrl;

  const today = new Date().toISOString().split('T')[0];
  const snippet = (firstParagraphText || 'Untitled').substring(0, 20);
  sliceModel.name = `${snippet} - ${today}`;

  return sliceModel;
}

export function copySelectionPlain(
  view: EditorView,
  plugin: FloatingMenuPlugin
) {
  if (!view.hasFocus()) {
    view.focus();
  }
  const { from, to } = view.state.selection;
  if (from === to) return;

  const slice = view.state.doc.slice(from, to);
  const text = slice.content.textBetween(0, slice.content.size, '\n');

  navigator.clipboard
    .writeText(text)
    .then(() => { })
    .catch((err) => console.error('Clipboard write failed:', err));
  if (plugin._popUpHandle?.close) {
    plugin._popUpHandle.close(null);
    plugin._popUpHandle = null;
  }
}

export async function pasteFromClipboard(
  view: EditorView,
  plugin: FloatingMenuPlugin
) {
  try {
    if (!view.hasFocus()) view.focus();

    const text = await navigator.clipboard.readText();
    let tr: Transaction;

    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      const parsed = JSON.parse(text);
      const slice = Slice.fromJSON(view.state.schema, parsed);
      tr = view.state.tr.replaceSelection(slice);
    } else {
      tr = view.state.tr.insertText(
        text,
        view.state.selection.from,
        view.state.selection.to
      );
    }
    view.dispatch(tr.scrollIntoView());
  } catch (err) {
    console.error('Clipboard paste failed:', err);
  } finally {
    if (plugin._popUpHandle?.close) {
      plugin._popUpHandle.close(null);
      plugin._popUpHandle = null;
    }
  }
}

export async function pasteAsReference(
  view: EditorView,
  plugin: FloatingMenuPlugin
) {
  try {
    if (!view.hasFocus()) view.focus();
    const text = await navigator.clipboard.readText();
    const parsed = JSON.parse(text);
    const sliceModel: SliceModel = parsed.sliceModel;

    if (!plugin.sliceManager?.createSliceViaDialog) {
      throw new Error(
        'SliceManager or createSliceViaDialog is not initialized'
      );
    }

    const val = await plugin.sliceManager.createSliceViaDialog(sliceModel);
    if (!val) {
      return;
    }
    insertReference(
      view,
      val.id,
      val.source,
      view['docView']?.node?.attrs?.objectMetaData?.name,
      val.from
    );
  } catch (err) {
    console.error('Failed to paste content or create slice:', err);
  } finally {
    if (plugin._popUpHandle?.close) {
      plugin._popUpHandle.close(null);
      plugin._popUpHandle = null;
    }
  }
}

export async function pasteAsPlainText(
  view: EditorView,
  plugin: FloatingMenuPlugin
) {
  try {
    if (!view.hasFocus()) view.focus();

    const text = await navigator.clipboard.readText();
    let plainText = text;

    try {
      const parsed = JSON.parse(text);
      const slice = Slice.fromJSON(view.state.schema, parsed);

      const frag = slice.content;
      plainText = '';
      frag.forEach((node) => { // NOSONAR not an iterable
        plainText += node.textContent + '\n';
      });
      plainText = plainText.trim();
    } catch {
      // Not JSON → just keep as is
    }

    const { state } = view;
    const tr = state.tr.insertText(
      plainText,
      state.selection.from,
      state.selection.to
    );
    view.dispatch(tr.scrollIntoView());
  } catch (err) {
    console.error('Plain text paste failed:', err);
  }

  if (plugin._popUpHandle?.close) {
    plugin._popUpHandle.close(null);
    plugin._popUpHandle = null;
  }
}

export async function clipboardHasData(): Promise<boolean> {
  try {
    const text = await navigator.clipboard.readText();
    return !!text;
  } catch {
    return false;
  }
}

export async function clipboardHasProseMirrorData(): Promise<boolean> {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) return false;
    const parsed = JSON.parse(text);
    return !!(
      parsed &&
      typeof parsed === 'object' &&
      parsed.content &&
      (Array.isArray(parsed.content) || parsed.content.type)
    );
  } catch {
    return false;
  }
}

// --- Decoration function ---
export function getDecorations(doc: Node, state: EditorState): DecorationSet {
  const decorations: Decoration[] = [];

  doc?.forEach( // NOSONAR not an iterable
    (node: Node, pos: number) => {
      if (node.type.name !== 'paragraph') return;
      const wrapper = document.createElement('span');
      wrapper.className = 'pm-hamburger-wrapper';

      const hamburger = document.createElement('span');
      hamburger.className = 'float-icon fa fa-bars';
      hamburger.style.fontFamily = 'FontAwesome'; // for fa compatibility
      hamburger.dataset.pos = String(pos);

      wrapper.appendChild(hamburger);

      decorations.push(Decoration.widget(pos + 1, wrapper, { side: 1 }));
      const decoFlags = node.attrs?.isDeco;
      if (!decoFlags) return;
      if (decoFlags.isSlice || decoFlags.isTag || decoFlags.isComment) {
        // --- Container for gutter marks ---
        const container = document.createElement('span');
        container.style.position = 'absolute';
        container.style.left = '27px';
        container.style.display = 'inline-flex';
        container.style.gap = '6px';
        container.style.alignItems = 'center';
        container.contentEditable = 'false';
        container.style.userSelect = 'none';

        // --- Slice ---
        if (decoFlags.isSlice) {
          const SliceMark = document.createElement('span');
          SliceMark.id = `slicemark-${uuidv4()}`;
          SliceMark.style.fontFamily = 'FontAwesome';
          SliceMark.innerHTML = '&#xf097';
          SliceMark.onclick = () => { };
          container.appendChild(SliceMark);
        }

        // --- Tag ---
        if (decoFlags.isTag) {
          const TagMark = document.createElement('span');
          TagMark.style.fontFamily = 'FontAwesome';
          TagMark.innerHTML = '&#xf02b;';
          TagMark.onclick = () => { };
          container.appendChild(TagMark);
        }

        // --- Comment ---
        if (decoFlags.isComment) {
          const CommentMark = document.createElement('span');
          CommentMark.style.fontFamily = 'FontAwesome';
          CommentMark.innerHTML = '&#xf075;';
          CommentMark.onclick = () => { };
          container.appendChild(CommentMark);
        }

        decorations.push(Decoration.widget(pos + 1, container, { side: -1 }));
      }
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

export function createMenuCallbacks(
  view: EditorView,
  plugin: FloatingMenuPlugin,
  hasClipboard = true,
  hasPM = true
) {
  return {
    enableCopy: () => !view.state.selection.empty,
    enablePaste: () => hasClipboard,
    enablePasteAsReference: () => hasPM,
    enableCitationAndComment: () => !view.state.selection.empty,
    enableTagAndInfoicon: () => true,
    copyRich: () => copySelectionRich(view, plugin),
    copyPlain: () => copySelectionPlain(view, plugin),
    paste: () => pasteFromClipboard(view, plugin),
    pastePlain: () => pasteAsPlainText(view, plugin),
    pasteAsReference: () => pasteAsReference(view, plugin),
    createCitation: () => createCitationHandler(view),
    createInfoIcon: () => createInfoIconHandler(view),
    createSlice: () => createNewSlice(view),
    showReferences: () => showReferences(view),
    addComment: () => { },
    addTag: () => { },
  };
}

export function closeExistingPopup(plugin: FloatingMenuPlugin): void {
  if (plugin._popUpHandle) {
    plugin._popUpHandle.close(null);
  }
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
  pos?: number,
  anchorEl?: HTMLElement,
  contextPos?: { x: number; y: number }
) {
  closeExistingPopup(plugin);

  Promise.all([clipboardHasProseMirrorData(), clipboardHasData()])
    .then(([hasPM, hasClipboard]) => {
      const ctx = {
        editorState: view.state,
        paragraphPos: pos,
      };

      const items =
        plugin.menuItems ??
        getDefaultMenuItems(createMenuCallbacks(view, plugin, hasClipboard, hasPM));

      plugin._popUpHandle = createPopUp(
        FloatingMenu,
        {
          context: ctx,
          items,
          isReadonly: plugin.sliceRuntime.isReadonly,
        },
        {
          anchor: anchorEl || view.dom,
          contextPos,
          position: positionAboveOrBelow,
          autoDismiss: false,
          onClose: createOnCloseHandler(plugin, anchorEl),
        }
      );
    })
    .catch((err) => {
      console.error('Failed to open floating menu:', err);
    });
}

export function addAltRightClickHandler(
  view: EditorView,
  plugin: FloatingMenuPlugin
) {
  view.dom.addEventListener('contextmenu', (e: MouseEvent) => {
    if (e.altKey && e.button === 2) {
      e.preventDefault();
      e.stopPropagation();

      const pos = view.posAtCoords({ left: e.clientX, top: e.clientY })?.pos;
      if (pos == null) return;

      openFloatingMenu(plugin, view, pos);
    }
  });
}

// To retrieve all the document slices from the server and cache it.
export async function getDocSlices(this: FloatingMenuPlugin, view: EditorView) {
  try {
    const result = await this.sliceManager?.getDocumentSlices(view);
    this.sliceManager?.setSlices(result, view.state);
    this.sliceManager?.setSliceAttrs(view);
  } catch (err) {
    console.error('Failed to load slices:', err);
  }
}

export function changeAttribute(_view: EditorView): void {
  const from = _view.state.selection.$from.before(1);
  const node = _view.state.doc.nodeAt(from);
  if (!node) return; // early return if node does not exist
  let tr = _view.state.tr;
  const newattrs = { ...node.attrs };
  const isDeco = { ...newattrs.isDeco };
  isDeco.isSlice = true;
  newattrs.isDeco = isDeco;
  tr = tr.setNodeMarkup(from, undefined, newattrs);
  _view.dispatch(tr);
}

export function createNewSlice(view: EditorView): void {
  const sliceModel = createSliceObject(view);
  const plugin = CMPluginKey.get(view.state) as FloatingMenuPlugin;
  if (!plugin) return;

  plugin.sliceManager
    .createSliceViaDialog(sliceModel)
    .then((val) => {
      plugin.sliceManager.addSliceToList(val);
      changeAttribute(view);
    })
    .catch((err) => {
      console.error('createSlice failed with:', err);
    });
}

export function showReferences(view: EditorView): Promise<void> {
  const plugin = CMPluginKey.get(view.state) as FloatingMenuPlugin;
  if (!plugin) return;
  plugin.sliceManager
    .insertReference()
    .then((val) => {
      insertReference(
        view,
        val.id,
        val.source,
        view['docView']?.node?.attrs?.objectMetaData?.name,
        val.from
      );
    })
    .catch((err) => {
      console.error('createSlice failed with:', err);
    });
}

export function createInfoIconHandler(view: EditorView): void {
  const plugin = CMPluginKey.get(view.state) as FloatingMenuPlugin;
  if (!plugin) return;
  plugin.sliceManager?.addInfoIcon();
}

export function createCitationHandler(view: EditorView): void {
  const plugin = CMPluginKey.get(view.state) as FloatingMenuPlugin;
  if (!plugin) return;
  plugin.sliceManager?.addCitation();
}

export function getClosestHTMLElement(
  el: EventTarget | null,
  selector: string
): HTMLElement | null {
  if (!(el instanceof Element)) return null;
  const closest = el.closest(selector);
  return closest instanceof HTMLElement ? closest : null;
}
