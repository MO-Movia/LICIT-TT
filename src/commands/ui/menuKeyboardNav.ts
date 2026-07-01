/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

export interface MenuKeyEvent {
  key: string;
  preventDefault: () => void;
  stopPropagation: () => void;
}

export type MenuKeyboardNavOptions = {

  getRoot: () => HTMLElement | null;
  getNavCount: () => number;
  getSelectedIndex: () => number;
  setSelectedIndex: (index: number, done?: () => void) => void;

  activate: (index: number, event: MenuKeyEvent) => void;

  scrollSelectedIntoView: () => void;

  captureKeysOnDocument?: boolean;
};

export class MenuKeyboardNav {
  private readonly opts: MenuKeyboardNavOptions;

  private lastPointerX: number | null = null;
  private lastPointerY: number | null = null;

  private previouslyFocused: HTMLElement | null = null;

  constructor(opts: MenuKeyboardNavOptions) {
    this.opts = opts;
  }

  mount(): void {

    this.previouslyFocused = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => this.opts.getRoot()?.focus());
    this.opts.getRoot()?.addEventListener('mouseover', this.onMouseOver);
    if (this.opts.captureKeysOnDocument) {
      document.addEventListener('keydown', this.onDocumentKeyDown, true);
    }
  }

  unmount(): void {
    this.opts.getRoot()?.removeEventListener('mouseover', this.onMouseOver);
    document.removeEventListener('keydown', this.onDocumentKeyDown, true);

    this.previouslyFocused?.focus?.({ preventScroll: true });
    this.previouslyFocused = null;
  }

  onDocumentKeyDown = (e: KeyboardEvent): void => {
    this.onKeyDown(e);
  };

  onMouseOver = (e: MouseEvent): void => {
    const target = e.target as HTMLElement | null;
    const row = target?.closest?.('[data-index]');
    if (!row) {
      return;
    }
    if (e.clientX === this.lastPointerX && e.clientY === this.lastPointerY) {
      return;
    }
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    const index = Number((row as HTMLElement).dataset.index);
    if (!Number.isNaN(index)) {
      this.opts.setSelectedIndex(index);
    }
  };

  onKeyDown = (e: MenuKeyEvent): void => {
    const count = this.opts.getNavCount();
    if (!count) {
      return;
    }
    if (this.isArrowKey(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      const next = this.getNextIndex(e.key, count);
      this.opts.setSelectedIndex(next, () => this.opts.scrollSelectedIntoView());
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      this.opts.activate(this.opts.getSelectedIndex(), e);
    }
  };

  private isArrowKey(key: string): boolean {
    return key === 'ArrowDown' || key === 'ArrowUp';
  }

  private getNextIndex(key: string, count: number): number {
    const last = count - 1;
    const cur = this.opts.getSelectedIndex();
    const onRow = cur >= 0 && cur <= last;

    if (!onRow) {
      return key === 'ArrowDown' ? 0 : last;
    }

    if (key === 'ArrowDown') {
      return cur < last ? cur + 1 : 0;
    }

    return cur > 0 ? cur - 1 : last;
  }
}
