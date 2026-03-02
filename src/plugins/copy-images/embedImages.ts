/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import {
  DOMSerializer,
  Schema,
  Node,
  DOMParser,
  DOMOutputSpec,
} from 'prosemirror-model';
import { Plugin, PluginKey, EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import type { EditorRuntime } from './Types';
const UNSUPPRT_XEMF_STRING = 'x-emf';
export class RichCopyEmbedImagePlugin extends Plugin {
  b64s: { [key: string]: string } = {};
  embed: boolean;
  exportDoc: boolean;
  constructor() {
    super({
      key: new PluginKey('RichCopyEmbedImagePlugin'),
      state: {
        init(_config, state) {
          const self = this as RichCopyEmbedImagePlugin;
          self.embed = false;
          self.exportDoc = false;
          this.props.clipboardSerializer = self.getClipboardSerializer(
            state.schema
          );
        },
        apply(_tr, _set) {
          return true;
        },
      },
      props: {
        handleDOMEvents: {
          keydown(view: EditorView, event: KeyboardEvent) {
            return (this as RichCopyEmbedImagePlugin).onKeyDown(view, event);
          },
        },
      },
    });
  }

  onKeyDown(view: EditorView, event: KeyboardEvent): boolean {
    let process = false;

    if (this.isBase64Export(event)) {
      const doc = view['runtime']?.fetchCompleteDoc();
      const tempView = RichCopyEmbedImagePlugin.createTempEditorView(view, doc);
      this.exportBase64JSON(tempView);
    } else {
      if (this.isCopySpecial(event)) {
        process = true;
      }
      if (this.isExport(event)) {
        process = true;
        this.exportDoc = true;
      }
      if (process) {
        this.embed = true;
        const doc = view['runtime']?.fetchCompleteDoc();
        const tempView = RichCopyEmbedImagePlugin.createTempEditorView(view, doc);
        this.setImageB64sEx(tempView);
      }
    }
    return false;
  }

  exportBase64JSON(view: EditorView) {
    const promises = [];
    this.embed = true;
    // Adds a unique id to a node
    view.state.doc.descendants((node, _pos) => {
      if ('image' === node.type.name) {
        // Convert image to base64.

        if (!this.b64s[node.attrs.src]) {
          promises.push(
            this.loadImage(node.attrs.src, view, node).then((b64: string) => {
              this.b64s[node.attrs.src] = b64;
            })
          );
        }
      }
    });

    Promise.all(promises).then(
      () => {
        const schema = view.state.schema;

        const domNode = this.props.clipboardSerializer.serializeFragment(
          view.state.doc.content
        );

        const docNode = DOMParser.fromSchema(schema).parse(domNode);
        RichCopyEmbedImagePlugin.exportJSON(docNode);
        this.exportDoc = false;
        this.embed = false;
      },
      (e) => console.error('Error exporting JSON', e)
    );
  }

  async resolveURL(runtime: EditorRuntime, src: string): Promise<string> {
    if (!runtime) {
      return src;
    }
    if (src.includes(UNSUPPRT_XEMF_STRING)) {
      return '';
    }
    const { canProxyImageSrc, getProxyImageSrc } = runtime;
    if (src && canProxyImageSrc && getProxyImageSrc && canProxyImageSrc(src)) {
      return await getProxyImageSrc(src)
        .then((res) => res)
        .catch(() => src);
    }
    return src;
  }

  setImageB64sEx(view: EditorView) {
    // The Copy Special is NOT a mode. If user select Copy Special, editor loads up the copy buffer with all base 64 images. It is only when I choose that command.
    // Thus, when user select the command, the complete operation of switching all images that are linked into base 64 embedded images as you load up the data into the copy buffer. This also means that it doesn't need the plugin on the paste side. If user activate the Copy Special command and then go paste anywhere else,
    // it will only have those base 64 images in the copy buffer to paste.
    // To choose Copy Special : Use Ctrl+Alt+C
    this.setImageB64s(view);
  }

  async loadImage(src: string, view, node): Promise<string> {
    if (view) {
      const url = await this.resolveURL(
        view['runtime'] as EditorRuntime,
        node.attrs.src
      );
      src = url;
    }
    if (src === '') {
      return '';
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');

        img.crossOrigin = 'Anonymous';

        img.onload = function () {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
      }
      img.src = src;
    });
  }

  setImageB64s(view: EditorView): void {
    const promises = [];

    // Adds a unique id to a node
    view.state.doc.descendants((node, _pos) => {
      if ('image' === node.type.name) {
        // Convert image to base64.

        if (!this.b64s[node.attrs.src]) {
          promises.push(
            this.loadImage(node.attrs.src, view, node).then((b64: string) => {
              this.b64s[node.attrs.src] = b64;
            })
          );
        }
      }
    });

    Promise.all(promises).then(
      () => {
        navigator.clipboard?.writeText('copy')?.catch(console.error);
        this.embed = false;
        if (this.exportDoc) {
          RichCopyEmbedImagePlugin.exportJSON(view.state.doc);
          this.exportDoc = false;
        }
      },
      (e) => console.error('Error exporting JSON', e)
    );
  }

  getClipboardSerializer(schema: Schema): DOMSerializer {
    const base = DOMSerializer.fromSchema(schema);
    const image = (node: Node) => {
      const attrs = { ...node.attrs };
      if (this.b64s[attrs.src]) {
        if (this.embed) {
          attrs.src = this.b64s[attrs.src];
        }
      } else {
        this.loadImage(node.attrs.src, null, node).then(
          (b64: string) => {
            this.b64s[node.attrs.src] = b64;
            attrs.src = b64;
          },
          (e) => console.error('Error loading images', e)
        );
      }
      return ['img', attrs] as DOMOutputSpec;
    };
    return new DOMSerializer(
      {
        ...base.nodes,
        image,
      },
      base.marks
    );
  }

  private static createTempEditorView(view: EditorView, doc: Node): EditorView {
    const originalState = view.state;
    let newDoc: Node | undefined;
    if (doc) {
      newDoc = view.state?.schema?.nodeFromJSON(doc);
    }

    const tempContainer = document.createElement('div');

    const tempState = EditorState.create({
      doc: newDoc ?? originalState.doc,
      schema: originalState.schema,
      plugins: originalState.plugins,
    });

    const tempView = new EditorView(tempContainer, {
      state: tempState,
    });

    return tempView;
  }

  static exportJSON(doc: Node) {
    const today = new Date();
    RichCopyEmbedImagePlugin.downloadToFile(
      JSON.stringify(doc.toJSON()),
      'licit-' +
      today.getFullYear() +
      (today.getMonth() + 1) +
      today.getDate() +
      today.getHours() +
      today.getMinutes() +
      today.getSeconds() +
      today.getMilliseconds(),
      'application/json'
    );
  }

  static exportJSONEx(
    plugin: RichCopyEmbedImagePlugin,
    view: EditorView,
    doc: Node
  ) {
    const tempView = this.createTempEditorView(view, doc);
    plugin.props.clipboardSerializer = plugin.getClipboardSerializer(
      tempView.state.schema
    );
    plugin.exportBase64JSON(tempView);
  }

  static downloadToFile(
    content: string,
    filename: string,
    contentType: string
  ): void {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });

    if (globalThis.URL.createObjectURL) {
      a.href = globalThis.URL.createObjectURL(file);
    }
    a.download = filename;
    a.click();

    if (globalThis.URL.revokeObjectURL) {
      globalThis.URL.revokeObjectURL(a.href);
    }
  }

  isCopySpecial(event: KeyboardEvent): boolean {
    return event.ctrlKey && event.altKey && 'C' === event.key.toUpperCase();
  }

  isExport(event: KeyboardEvent): boolean {
    const key = event.key.toUpperCase();
    return event.ctrlKey && event.altKey && ('E' === key || 'Ē' === key);
  }

  isBase64Export(event: KeyboardEvent): boolean {
    const key = event.key.toUpperCase();
    return (
      event.ctrlKey &&
      event.altKey &&
      event.shiftKey &&
      ('E' === key || 'Ē' === key)
    );
  }
}

/**
 * Export as default for backward compatibility.
 */
export default RichCopyEmbedImagePlugin;
