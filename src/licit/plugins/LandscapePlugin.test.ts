/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

/**
 * @jest-environment jsdom
 */

import { Schema } from 'prosemirror-model';
import { EditorState, Plugin, TextSelection } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { LandscapePlugin } from './LandscapePlugin';
import { LandscapeCommand } from '../commands/LandscapeCommand';
import LandscapeSectionNodeSpec from '../specs/landscapeSectionNodeSpec';

describe('LandscapePlugin', () => {
    let schema: Schema;

    beforeEach(() => {
        document.body.innerHTML = '';
        schema = new Schema({
            nodes: {
                doc: { content: 'block+' },
                paragraph: { content: 'text*', group: 'block' },
                landscape_section: LandscapeSectionNodeSpec,
                text: { group: 'inline' },
            },
            marks: {},
        });
    });

    test('should initialize with a LandscapeCommand', () => {
        const plugin = new LandscapePlugin();
        expect(plugin).toBeInstanceOf(Plugin);
        const command = plugin.initButtonCommands(null);
        expect(command).toBeInstanceOf(LandscapeCommand);
    });

    test('should add landscape_section to the schema', () => {
        const plugin = new LandscapePlugin();
        const effectiveSchema = plugin.getEffectiveSchema(schema);
        expect(effectiveSchema.nodes.landscape_section).toBeDefined();
    });

    test('should return a keymap plugin', () => {
        const plugin = new LandscapePlugin();
        const keymapPlugin = plugin.initKeyCommands();
        expect(keymapPlugin).toBeInstanceOf(Plugin);
    });

    test('keymap handles Mod-Enter at end of landscape section', () => {
        const plugin = new LandscapePlugin();
        const keymapPlugin = plugin.initKeyCommands();

        const doc = schema.node('doc', null, [
            schema.node('landscape_section', null, [
                schema.node('paragraph', null, [schema.text('Hello')]),
            ]),
        ]);
        let endPos = -1;
        doc.descendants((node, pos) => {
            if (node.isText) {
                endPos = pos + node.text.length;
                return false;
            }
            return true;
        });
        if (endPos < 0) {
            endPos = 1;
        }
        const stateAtEnd = EditorState.create({
            schema,
            doc,
            selection: TextSelection.create(doc, endPos),
        });

        const view = {
            state: stateAtEnd,
            dispatch: jest.fn(),
            dom: document.createElement('div'),
        } as unknown as EditorView;

        const event = new KeyboardEvent('keydown', {
            key: 'Enter',
            ctrlKey: true,
        });

        const handleKeyDown = keymapPlugin.props.handleKeyDown as
            | ((this: unknown, view: EditorView, event: KeyboardEvent) => boolean)
            | undefined;
        const handled = handleKeyDown?.call(keymapPlugin, view, event);
        expect(handled).toBe(true);
        expect(view.dispatch).toHaveBeenCalled();
    });

    test('keymap returns false when not at end of landscape section', () => {
        const plugin = new LandscapePlugin();
        const keymapPlugin = plugin.initKeyCommands();

        const doc = schema.node('doc', null, [
            schema.node('landscape_section', null, [
                schema.node('paragraph', null, [schema.text('Hello')]),
            ]),
        ]);
        const state = EditorState.create({
            schema,
            doc,
            selection: TextSelection.create(doc, 2),
        });
        const view = {
            state,
            dispatch: jest.fn(),
            dom: document.createElement('div'),
        } as unknown as EditorView;

        const event = new KeyboardEvent('keydown', {
            key: 'Enter',
            ctrlKey: true,
        });
        const handleKeyDown = keymapPlugin.props.handleKeyDown as
            | ((this: unknown, view: EditorView, event: KeyboardEvent) => boolean)
            | undefined;
        const handled = handleKeyDown?.call(keymapPlugin, view, event);
        expect(handled).toBe(false);
    });

    test('view creates and updates proxy scrollbar', () => {
        const plugin = new LandscapePlugin();
        const frame = document.createElement('div');
        frame.className = 'czi-editor-frame-body';
        const scroll = document.createElement('div');
        scroll.className = 'czi-editor-frame-body-scroll';
        Object.defineProperty(scroll, 'clientWidth', {value: 200, configurable: true});
        frame.appendChild(scroll);
        document.body.appendChild(frame);

        const editorDom = document.createElement('div');
        scroll.appendChild(editorDom);

        const landscape = document.createElement('section');
        landscape.className = 'section-landscape';
        Object.defineProperty(landscape, 'scrollWidth', {value: 500, configurable: true});
        Object.defineProperty(landscape, 'clientWidth', {value: 100, configurable: true});
        landscape.getBoundingClientRect = () =>
            ({top: 0, bottom: 50, left: 0, right: 100, width: 100, height: 50} as DOMRect);
        scroll.getBoundingClientRect = () =>
            ({top: 0, bottom: 100, left: 0, right: 100, width: 100, height: 100} as DOMRect);
        editorDom.appendChild(landscape);

        class MockIntersectionObserver {
            observe = jest.fn();
            disconnect = jest.fn();
            constructor(_cb: IntersectionObserverCallback) {}
        }
        (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver}).IntersectionObserver =
            MockIntersectionObserver as unknown as typeof IntersectionObserver;

        const state = EditorState.create({schema});
        const view = {state, dom: editorDom} as unknown as EditorView;
        const proxyView = plugin.spec.view?.(view);

        const proxy = frame.querySelector('.czi-landscape-horizontal-proxy');
        const track =
            frame.querySelector<HTMLElement>('.czi-landscape-horizontal-proxy-track');
        expect(proxy).toBeTruthy();
        expect(track).toBeTruthy();
        expect(proxy?.classList.contains('czi-visible')).toBe(true);

        Object.defineProperty(landscape, 'scrollWidth', {value: 100, configurable: true});
        Object.defineProperty(landscape, 'clientWidth', {value: 100, configurable: true});
        proxyView?.update?.(view, state);
        expect(proxy?.classList.contains('czi-visible')).toBe(false);

        const proxyEl = proxy as HTMLElement;
        const landscapeEl = landscape;
        Object.defineProperty(proxyEl, 'scrollLeft', {value: 0, writable: true});
        Object.defineProperty(landscapeEl, 'scrollLeft', {value: 0, writable: true});
        proxyEl.scrollLeft = 25;
        proxyEl.dispatchEvent(new Event('scroll'));
        expect(landscapeEl.scrollLeft).toBe(25);

        landscapeEl.scrollLeft = 40;
        landscapeEl.dispatchEvent(new Event('scroll'));
        expect(proxyEl.scrollLeft).toBe(40);

        proxyView?.destroy?.();
        expect(frame.querySelector('.czi-landscape-horizontal-proxy')).toBeNull();
        frame.remove();
        delete (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver})
            .IntersectionObserver;
    });

    test('view stays idle when scroll container is missing', () => {
        const plugin = new LandscapePlugin();
        const editorDom = document.createElement('div');
        const state = EditorState.create({schema});
        const view = {state, dom: editorDom} as unknown as EditorView;
        const proxyView = plugin.spec.view?.(view);
        expect(document.querySelector('.czi-landscape-horizontal-proxy')).toBeNull();
        proxyView?.destroy?.();
    });

    test('hides proxy when no landscape nodes are present', () => {
        const plugin = new LandscapePlugin();
        const frame = document.createElement('div');
        frame.className = 'czi-editor-frame-body';
        const scroll = document.createElement('div');
        scroll.className = 'czi-editor-frame-body-scroll';
        Object.defineProperty(scroll, 'clientWidth', {value: 200, configurable: true});
        frame.appendChild(scroll);
        document.body.appendChild(frame);

        const editorDom = document.createElement('div');
        scroll.appendChild(editorDom);

        class MockIntersectionObserver {
            observe = jest.fn();
            disconnect = jest.fn();
            constructor(_cb: IntersectionObserverCallback) {}
        }
        (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver}).IntersectionObserver =
            MockIntersectionObserver as unknown as typeof IntersectionObserver;

        const state = EditorState.create({schema});
        const view = {state, dom: editorDom} as unknown as EditorView;
        const proxyView = plugin.spec.view?.(view);

        const proxy = frame.querySelector('.czi-landscape-horizontal-proxy');
        const track =
            frame.querySelector<HTMLElement>('.czi-landscape-horizontal-proxy-track');
        expect(proxy).toBeTruthy();
        expect(track).toBeTruthy();
        expect(proxy?.classList.contains('czi-visible')).toBe(false);
        expect(track?.style.width).toBe('0px');

        proxyView?.destroy?.();
        frame.remove();
        delete (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver})
            .IntersectionObserver;
    });

    test('handles missing IntersectionObserver gracefully', () => {
        const plugin = new LandscapePlugin();
        const frame = document.createElement('div');
        frame.className = 'czi-editor-frame-body';
        const scroll = document.createElement('div');
        scroll.className = 'czi-editor-frame-body-scroll';
        frame.appendChild(scroll);
        document.body.appendChild(frame);

        const editorDom = document.createElement('div');
        scroll.appendChild(editorDom);

        const originalIO =
            (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver})
                .IntersectionObserver;
        delete (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver})
            .IntersectionObserver;

        const state = EditorState.create({schema});
        const view = {state, dom: editorDom} as unknown as EditorView;
        const proxyView = plugin.spec.view?.(view);
        expect(frame.querySelector('.czi-landscape-horizontal-proxy')).toBeTruthy();
        proxyView?.destroy?.();

        (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver})
            .IntersectionObserver = originalIO;
        frame.remove();
    });

    test('proxy scroll handlers respect syncing flags', () => {
        const plugin = new LandscapePlugin();
        const frame = document.createElement('div');
        frame.className = 'czi-editor-frame-body';
        const scroll = document.createElement('div');
        scroll.className = 'czi-editor-frame-body-scroll';
        frame.appendChild(scroll);
        document.body.appendChild(frame);

        const editorDom = document.createElement('div');
        scroll.appendChild(editorDom);

        const landscape = document.createElement('section');
        landscape.className = 'section-landscape';
        Object.defineProperty(landscape, 'scrollWidth', {value: 200, configurable: true});
        Object.defineProperty(landscape, 'clientWidth', {value: 100, configurable: true});
        landscape.getBoundingClientRect = () =>
            ({top: 0, bottom: 50, left: 0, right: 100, width: 100, height: 50} as DOMRect);
        scroll.getBoundingClientRect = () =>
            ({top: 0, bottom: 100, left: 0, right: 100, width: 100, height: 100} as DOMRect);
        editorDom.appendChild(landscape);

        class MockIntersectionObserver {
            observe = jest.fn();
            disconnect = jest.fn();
            constructor(_cb: IntersectionObserverCallback) {}
        }
        (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver}).IntersectionObserver =
            MockIntersectionObserver as unknown as typeof IntersectionObserver;

        const state = EditorState.create({schema});
        const view = {state, dom: editorDom} as unknown as EditorView;
        const proxyView = plugin.spec.view?.(view) as unknown as {
            syncingFromLandscape: boolean;
            syncingFromProxy: boolean;
            activeLandscape: HTMLElement | null;
            proxyScrollbar: HTMLElement | null;
            onProxyScroll: () => void;
            onLandscapeScroll: () => void;
        };
        const proxyScrollbar = frame.querySelector<HTMLElement>('.czi-landscape-horizontal-proxy');
        if (!proxyScrollbar) {
            throw new Error('Expected proxy scrollbar to be created');
        }
        Object.defineProperty(proxyScrollbar, 'scrollLeft', {value: 10, writable: true});
        Object.defineProperty(landscape, 'scrollLeft', {value: 20, writable: true});
        proxyView.activeLandscape = landscape;
        proxyView.proxyScrollbar = proxyScrollbar;

        proxyView.syncingFromLandscape = true;
        proxyView.onProxyScroll();
        expect(landscape.scrollLeft).toBe(20);
        proxyView.syncingFromLandscape = false;
        proxyView.syncingFromProxy = true;
        proxyView.onLandscapeScroll();
        expect(proxyScrollbar.scrollLeft).toBe(10);

        (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver}).IntersectionObserver =
            undefined;
        frame.remove();
    });

    test('finds scroll container via document query when closest fails', () => {
        const plugin = new LandscapePlugin();
        const frame = document.createElement('div');
        frame.className = 'czi-editor-frame-body';
        const scroll = document.createElement('div');
        scroll.className = 'czi-editor-frame-body-scroll';
        frame.appendChild(scroll);
        document.body.appendChild(frame);

        const editorDom = document.createElement('div');
        const landscape = document.createElement('section');
        landscape.className = 'section-landscape';
        Object.defineProperty(landscape, 'scrollWidth', {value: 300, configurable: true});
        Object.defineProperty(landscape, 'clientWidth', {value: 100, configurable: true});
        landscape.getBoundingClientRect = () =>
            ({top: 0, bottom: 50, left: 0, right: 100, width: 100, height: 50} as DOMRect);
        scroll.getBoundingClientRect = () =>
            ({top: 0, bottom: 100, left: 0, right: 100, width: 100, height: 100} as DOMRect);
        editorDom.appendChild(landscape);
        document.body.appendChild(editorDom);

        class MockIntersectionObserver {
            observe = jest.fn();
            disconnect = jest.fn();
            constructor(_cb: IntersectionObserverCallback) {}
        }
        (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver}).IntersectionObserver =
            MockIntersectionObserver as unknown as typeof IntersectionObserver;

        const state = EditorState.create({schema});
        const view = {state, dom: editorDom} as unknown as EditorView;
        const proxyView = plugin.spec.view?.(view);
        expect(frame.querySelector('.czi-landscape-horizontal-proxy')).toBeTruthy();
        proxyView?.destroy?.();
        frame.remove();
        editorDom.remove();
        delete (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver})
            .IntersectionObserver;
    });

    test('uses parent container when frame body class is missing', () => {
        const plugin = new LandscapePlugin();
        const frame = document.createElement('div');
        const scroll = document.createElement('div');
        scroll.className = 'czi-editor-frame-body-scroll';
        frame.appendChild(scroll);
        document.body.appendChild(frame);

        const editorDom = document.createElement('div');
        scroll.appendChild(editorDom);
        const landscape = document.createElement('section');
        landscape.className = 'section-landscape';
        Object.defineProperty(landscape, 'scrollWidth', {value: 240, configurable: true});
        Object.defineProperty(landscape, 'clientWidth', {value: 100, configurable: true});
        landscape.getBoundingClientRect = () =>
            ({top: 0, bottom: 50, left: 0, right: 100, width: 100, height: 50} as DOMRect);
        scroll.getBoundingClientRect = () =>
            ({top: 0, bottom: 100, left: 0, right: 100, width: 100, height: 100} as DOMRect);
        editorDom.appendChild(landscape);

        class MockIntersectionObserver {
            observe = jest.fn();
            disconnect = jest.fn();
            constructor(_cb: IntersectionObserverCallback) {}
        }
        (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver}).IntersectionObserver =
            MockIntersectionObserver as unknown as typeof IntersectionObserver;

        const state = EditorState.create({schema});
        const view = {state, dom: editorDom} as unknown as EditorView;
        const proxyView = plugin.spec.view?.(view);
        expect(frame.querySelector('.czi-landscape-horizontal-proxy')).toBeTruthy();
        proxyView?.destroy?.();
        frame.remove();
        delete (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver})
            .IntersectionObserver;
    });

    test('ignores landscape nodes with no overlap', () => {
        const plugin = new LandscapePlugin();
        const frame = document.createElement('div');
        frame.className = 'czi-editor-frame-body';
        const scroll = document.createElement('div');
        scroll.className = 'czi-editor-frame-body-scroll';
        frame.appendChild(scroll);
        document.body.appendChild(frame);

        const editorDom = document.createElement('div');
        scroll.appendChild(editorDom);
        const landscape = document.createElement('section');
        landscape.className = 'section-landscape';
        Object.defineProperty(landscape, 'scrollWidth', {value: 300, configurable: true});
        Object.defineProperty(landscape, 'clientWidth', {value: 100, configurable: true});
        landscape.getBoundingClientRect = () =>
            ({top: 200, bottom: 300, left: 0, right: 100, width: 100, height: 100} as DOMRect);
        scroll.getBoundingClientRect = () =>
            ({top: 0, bottom: 100, left: 0, right: 100, width: 100, height: 100} as DOMRect);
        editorDom.appendChild(landscape);

        class MockIntersectionObserver {
            observe = jest.fn();
            disconnect = jest.fn();
            constructor(_cb: IntersectionObserverCallback) {}
        }
        (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver}).IntersectionObserver =
            MockIntersectionObserver as unknown as typeof IntersectionObserver;

        const state = EditorState.create({schema});
        const view = {state, dom: editorDom} as unknown as EditorView;
        const proxyView = plugin.spec.view?.(view);
        const proxy = frame.querySelector('.czi-landscape-horizontal-proxy');
        expect(proxy?.classList.contains('czi-visible')).toBe(false);
        proxyView?.destroy?.();
        frame.remove();
        delete (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver})
            .IntersectionObserver;
    });

    test('syncProxyWithActiveLandscape skips syncing when flagged', () => {
        const plugin = new LandscapePlugin();
        const frame = document.createElement('div');
        frame.className = 'czi-editor-frame-body';
        const scroll = document.createElement('div');
        scroll.className = 'czi-editor-frame-body-scroll';
        Object.defineProperty(scroll, 'clientWidth', {value: 200, configurable: true});
        frame.appendChild(scroll);
        document.body.appendChild(frame);

        const editorDom = document.createElement('div');
        scroll.appendChild(editorDom);

        const landscape = document.createElement('section');
        landscape.className = 'section-landscape';
        Object.defineProperty(landscape, 'scrollWidth', {value: 500, configurable: true});
        Object.defineProperty(landscape, 'clientWidth', {value: 100, configurable: true});
        Object.defineProperty(landscape, 'scrollLeft', {value: 40, writable: true});
        landscape.getBoundingClientRect = () =>
            ({top: 0, bottom: 50, left: 0, right: 100, width: 100, height: 50} as DOMRect);
        scroll.getBoundingClientRect = () =>
            ({top: 0, bottom: 100, left: 0, right: 100, width: 100, height: 100} as DOMRect);
        editorDom.appendChild(landscape);

        class MockIntersectionObserver {
            observe = jest.fn();
            disconnect = jest.fn();
            constructor(_cb: IntersectionObserverCallback) {}
        }
        (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver}).IntersectionObserver =
            MockIntersectionObserver as unknown as typeof IntersectionObserver;

        const state = EditorState.create({schema});
        const view = {state, dom: editorDom} as unknown as EditorView;
        const proxyView = plugin.spec.view?.(view) as unknown as {
            syncingFromLandscape: boolean;
            syncProxyWithActiveLandscape: () => void;
            proxyScrollbar: HTMLElement;
            destroy?: () => void;
        };
        Object.defineProperty(proxyView.proxyScrollbar, 'scrollLeft', {
            value: 0,
            writable: true,
        });
        proxyView.syncingFromLandscape = true;
        proxyView.syncProxyWithActiveLandscape();
        expect(proxyView.proxyScrollbar.scrollLeft).toBe(0);

        proxyView?.destroy?.();
        frame.remove();
        delete (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver})
            .IntersectionObserver;
    });

    test('private helpers guard against missing elements', () => {
        const plugin = new LandscapePlugin();
        const frame = document.createElement('div');
        frame.className = 'czi-editor-frame-body';
        const scroll = document.createElement('div');
        scroll.className = 'czi-editor-frame-body-scroll';
        Object.defineProperty(scroll, 'clientWidth', {value: 200, configurable: true});
        frame.appendChild(scroll);
        document.body.appendChild(frame);

        const editorDom = document.createElement('div');
        scroll.appendChild(editorDom);
        const landscape = document.createElement('section');
        landscape.className = 'section-landscape';
        Object.defineProperty(landscape, 'scrollWidth', {value: 500, configurable: true});
        Object.defineProperty(landscape, 'clientWidth', {value: 100, configurable: true});
        landscape.getBoundingClientRect = () =>
            ({top: 0, bottom: 50, left: 0, right: 100, width: 100, height: 50} as DOMRect);
        scroll.getBoundingClientRect = () =>
            ({top: 0, bottom: 100, left: 0, right: 100, width: 100, height: 100} as DOMRect);
        editorDom.appendChild(landscape);

        class MockIntersectionObserver {
            observe = jest.fn();
            disconnect = jest.fn();
            constructor(_cb: IntersectionObserverCallback) {}
        }
        (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver}).IntersectionObserver =
            MockIntersectionObserver as unknown as typeof IntersectionObserver;

        const state = EditorState.create({schema});
        const view = {state, dom: editorDom} as unknown as EditorView;
        const proxyView = plugin.spec.view?.(view) as unknown as {
            activeLandscape: HTMLElement | null;
            proxyScrollbar: HTMLElement | null;
            frameBodyContainer: HTMLElement | null;
            scrollContainer: HTMLElement | null;
            editorView: EditorView;
            onProxyScroll: () => void;
            onLandscapeScroll: () => void;
            setActiveLandscape: (node: HTMLElement | null) => void;
            pickActiveLandscapeNode: () => HTMLElement | null;
            getLandscapeNodes: () => HTMLElement[];
            ensureProxyScrollbar: () => void;
            destroy?: () => void;
        };

        const current = proxyView.activeLandscape;
        proxyView.setActiveLandscape(current);

        proxyView.activeLandscape = null;
        proxyView.onProxyScroll();

        proxyView.proxyScrollbar = null;
        proxyView.onLandscapeScroll();

        proxyView.scrollContainer = null;
        expect(proxyView.pickActiveLandscapeNode()).toBeNull();

        proxyView.editorView = {} as EditorView;
        expect(proxyView.getLandscapeNodes()).toEqual([]);

        proxyView.frameBodyContainer = null;
        proxyView.ensureProxyScrollbar();

        proxyView?.destroy?.();
        frame.remove();
        delete (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver})
            .IntersectionObserver;
    });

    test('setActiveLandscape swaps listeners between nodes', () => {
        const plugin = new LandscapePlugin();
        const frame = document.createElement('div');
        frame.className = 'czi-editor-frame-body';
        const scroll = document.createElement('div');
        scroll.className = 'czi-editor-frame-body-scroll';
        frame.appendChild(scroll);
        document.body.appendChild(frame);

        const editorDom = document.createElement('div');
        scroll.appendChild(editorDom);
        const landscapeA = document.createElement('section');
        const landscapeB = document.createElement('section');
        landscapeA.className = 'section-landscape';
        landscapeB.className = 'section-landscape';
        landscapeA.getBoundingClientRect = () =>
            ({top: 0, bottom: 50, left: 0, right: 100, width: 100, height: 50} as DOMRect);
        landscapeB.getBoundingClientRect = () =>
            ({top: 0, bottom: 50, left: 0, right: 100, width: 100, height: 50} as DOMRect);
        scroll.getBoundingClientRect = () =>
            ({top: 0, bottom: 100, left: 0, right: 100, width: 100, height: 100} as DOMRect);
        editorDom.appendChild(landscapeA);
        editorDom.appendChild(landscapeB);

        class MockIntersectionObserver {
            observe = jest.fn();
            disconnect = jest.fn();
            constructor(_cb: IntersectionObserverCallback) {}
        }
        (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver}).IntersectionObserver =
            MockIntersectionObserver as unknown as typeof IntersectionObserver;

        const state = EditorState.create({schema});
        const view = {state, dom: editorDom} as unknown as EditorView;
        const proxyView = plugin.spec.view?.(view) as unknown as {
            activeLandscape: HTMLElement | null;
            setActiveLandscape: (node: HTMLElement | null) => void;
            destroy?: () => void;
        };

        landscapeA.addEventListener = jest.fn();
        landscapeA.removeEventListener = jest.fn();
        landscapeB.addEventListener = jest.fn();

        proxyView.activeLandscape = landscapeA;
        proxyView.setActiveLandscape(landscapeB);

        expect(landscapeA.removeEventListener).toHaveBeenCalled();
        expect(landscapeB.addEventListener).toHaveBeenCalled();

        proxyView?.destroy?.();
        frame.remove();
        delete (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver})
            .IntersectionObserver;
    });

    test('syncProxyWithActiveLandscape exits when track is missing', () => {
        const plugin = new LandscapePlugin();
        const frame = document.createElement('div');
        frame.className = 'czi-editor-frame-body';
        const scroll = document.createElement('div');
        scroll.className = 'czi-editor-frame-body-scroll';
        frame.appendChild(scroll);
        document.body.appendChild(frame);

        const editorDom = document.createElement('div');
        scroll.appendChild(editorDom);
        const landscape = document.createElement('section');
        landscape.className = 'section-landscape';
        Object.defineProperty(landscape, 'scrollWidth', {value: 500, configurable: true});
        Object.defineProperty(landscape, 'clientWidth', {value: 100, configurable: true});
        landscape.getBoundingClientRect = () =>
            ({top: 0, bottom: 50, left: 0, right: 100, width: 100, height: 50} as DOMRect);
        scroll.getBoundingClientRect = () =>
            ({top: 0, bottom: 100, left: 0, right: 100, width: 100, height: 100} as DOMRect);
        editorDom.appendChild(landscape);

        class MockIntersectionObserver {
            observe = jest.fn();
            disconnect = jest.fn();
            constructor(_cb: IntersectionObserverCallback) {}
        }
        (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver}).IntersectionObserver =
            MockIntersectionObserver as unknown as typeof IntersectionObserver;

        const state = EditorState.create({schema});
        const view = {state, dom: editorDom} as unknown as EditorView;
        const proxyView = plugin.spec.view?.(view) as unknown as {
            activeLandscape: HTMLElement | null;
            proxyScrollbar: HTMLElement | null;
            proxyScrollbarTrack: HTMLElement | null;
            syncProxyWithActiveLandscape: () => void;
            destroy?: () => void;
        };
        const proxyScrollbar = frame.querySelector<HTMLElement>('.czi-landscape-horizontal-proxy');
        if (!proxyScrollbar) {
            throw new Error('Expected proxy scrollbar to be created');
        }
        Object.defineProperty(proxyScrollbar, 'scrollLeft', {value: 12, writable: true});
        proxyView.activeLandscape = landscape;
        proxyView.proxyScrollbar = proxyScrollbar;
        proxyView.proxyScrollbarTrack = null;
        proxyView.syncProxyWithActiveLandscape();
        expect(proxyScrollbar.scrollLeft).toBe(12);

        proxyView?.destroy?.();
        frame.remove();
        delete (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver})
            .IntersectionObserver;
    });

    test('onProxyScroll exits when proxy scrollbar is missing', () => {
        const plugin = new LandscapePlugin();
        const frame = document.createElement('div');
        frame.className = 'czi-editor-frame-body';
        const scroll = document.createElement('div');
        scroll.className = 'czi-editor-frame-body-scroll';
        frame.appendChild(scroll);
        document.body.appendChild(frame);

        const editorDom = document.createElement('div');
        scroll.appendChild(editorDom);
        const landscape = document.createElement('section');
        landscape.className = 'section-landscape';
        landscape.getBoundingClientRect = () =>
            ({top: 0, bottom: 50, left: 0, right: 100, width: 100, height: 50} as DOMRect);
        scroll.getBoundingClientRect = () =>
            ({top: 0, bottom: 100, left: 0, right: 100, width: 100, height: 100} as DOMRect);
        editorDom.appendChild(landscape);

        class MockIntersectionObserver {
            observe = jest.fn();
            disconnect = jest.fn();
            constructor(_cb: IntersectionObserverCallback) {}
        }
        (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver}).IntersectionObserver =
            MockIntersectionObserver as unknown as typeof IntersectionObserver;

        const state = EditorState.create({schema});
        const view = {state, dom: editorDom} as unknown as EditorView;
        const proxyView = plugin.spec.view?.(view) as unknown as {
            proxyScrollbar: HTMLElement | null;
            activeLandscape: HTMLElement | null;
            onProxyScroll: () => void;
            destroy?: () => void;
        };
        Object.defineProperty(landscape, 'scrollLeft', {value: 15, writable: true});
        proxyView.activeLandscape = landscape;
        proxyView.proxyScrollbar = null;
        proxyView.onProxyScroll();
        expect(landscape.scrollLeft).toBe(15);

        proxyView?.destroy?.();
        frame.remove();
        delete (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver})
            .IntersectionObserver;
    });

    test('update reinitializes after scroll container reset', () => {
        const plugin = new LandscapePlugin();
        const frame = document.createElement('div');
        frame.className = 'czi-editor-frame-body';
        const scroll = document.createElement('div');
        scroll.className = 'czi-editor-frame-body-scroll';
        frame.appendChild(scroll);
        document.body.appendChild(frame);

        const editorDom = document.createElement('div');
        scroll.appendChild(editorDom);
        const landscape = document.createElement('section');
        landscape.className = 'section-landscape';
        Object.defineProperty(landscape, 'scrollWidth', {value: 300, configurable: true});
        Object.defineProperty(landscape, 'clientWidth', {value: 100, configurable: true});
        landscape.getBoundingClientRect = () =>
            ({top: 0, bottom: 50, left: 0, right: 100, width: 100, height: 50} as DOMRect);
        scroll.getBoundingClientRect = () =>
            ({top: 0, bottom: 100, left: 0, right: 100, width: 100, height: 100} as DOMRect);
        editorDom.appendChild(landscape);

        class MockIntersectionObserver {
            observe = jest.fn();
            disconnect = jest.fn();
            constructor(_cb: IntersectionObserverCallback) {}
        }
        (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver}).IntersectionObserver =
            MockIntersectionObserver as unknown as typeof IntersectionObserver;

        const prevState = EditorState.create({
            schema,
            doc: schema.node('doc', null, [schema.node('paragraph')]),
        });
        const nextState = EditorState.create({
            schema,
            doc: schema.node('doc', null, [
                schema.node('paragraph', null, [schema.text('x')]),
            ]),
        });
        const view = {state: nextState, dom: editorDom} as unknown as EditorView;
        const proxyView = plugin.spec.view?.(view) as unknown as {
            scrollContainer: HTMLElement | null;
            frameBodyContainer: HTMLElement | null;
            update: (view: EditorView, prevState: EditorState) => void;
            destroy?: () => void;
        };
        proxyView.scrollContainer = null;
        proxyView.frameBodyContainer = null;
        proxyView.update(view, prevState);
        expect(frame.querySelector('.czi-landscape-horizontal-proxy')).toBeTruthy();

        proxyView?.destroy?.();
        frame.remove();
        delete (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver})
            .IntersectionObserver;
    });

    test('ensureProxyScrollbar no-ops when proxy already exists', () => {
        const plugin = new LandscapePlugin();
        const frame = document.createElement('div');
        frame.className = 'czi-editor-frame-body';
        const scroll = document.createElement('div');
        scroll.className = 'czi-editor-frame-body-scroll';
        frame.appendChild(scroll);
        document.body.appendChild(frame);

        const editorDom = document.createElement('div');
        scroll.appendChild(editorDom);
        const landscape = document.createElement('section');
        landscape.className = 'section-landscape';
        landscape.getBoundingClientRect = () =>
            ({top: 0, bottom: 50, left: 0, right: 100, width: 100, height: 50} as DOMRect);
        scroll.getBoundingClientRect = () =>
            ({top: 0, bottom: 100, left: 0, right: 100, width: 100, height: 100} as DOMRect);
        editorDom.appendChild(landscape);

        class MockIntersectionObserver {
            observe = jest.fn();
            disconnect = jest.fn();
            constructor(_cb: IntersectionObserverCallback) {}
        }
        (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver}).IntersectionObserver =
            MockIntersectionObserver as unknown as typeof IntersectionObserver;

        const state = EditorState.create({schema});
        const view = {state, dom: editorDom} as unknown as EditorView;
        const proxyView = plugin.spec.view?.(view) as unknown as {
            ensureProxyScrollbar: () => void;
            destroy?: () => void;
        };
        const countBefore = frame.querySelectorAll('.czi-landscape-horizontal-proxy').length;
        proxyView.ensureProxyScrollbar();
        const countAfter = frame.querySelectorAll('.czi-landscape-horizontal-proxy').length;
        expect(countAfter).toBe(countBefore);

        proxyView?.destroy?.();
        frame.remove();
        delete (globalThis as unknown as {IntersectionObserver?: typeof IntersectionObserver})
            .IntersectionObserver;
    });
});
