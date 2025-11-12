type SelectionValue = {
  from: number;
  to: number;
};

type SelectionEntry = {
  target: Element;
  selection: SelectionValue;
};

type Callback = (
  entries: Array<SelectionEntry>,
  observer: SelectionObserver
) => void;

const EMPTY_SELECTION_VALUE = Object.freeze({from: 0, to: 0});

function getSelectionRange(): Range | undefined {
  const selection = getSelection();
  if (!selection) {
    console.warn('selection not found');
    return undefined;
  }

  if (!selection.rangeCount) {
    return undefined;
  }

  return selection.getRangeAt(0);
}

function resolveSelectionValue(el: Element): SelectionValue {
  const range = getSelectionRange();
  if (!range) {
    return EMPTY_SELECTION_VALUE;
  }
  const {startContainer, endContainer, startOffset, endOffset} = range;
  if (
    startContainer === el ||
    endContainer === el ||
    (startContainer && el.contains(startContainer)) ||
    (endContainer && el.contains(endContainer))
  ) {
    return {
      from: startOffset,
      to: endOffset,
    };
  }

  return EMPTY_SELECTION_VALUE;
}

export class SelectionObserver {
  _observables: {
    target: Element;
    selection: SelectionValue;
  }[] = [];
  _callback: Callback;

  constructor(callback: Callback) {
    this._callback = callback;
  }

  disconnect(): void {
    this._observables.forEach((obj) => {
      const el = obj.target;
      el.removeEventListener('click', this._check, false);
      el.removeEventListener('selectionchange', this._check, false);
    });
    this._observables = [];
  }

  observe(el: Element): void {
    if (this._observables.some((obs) => obs.target === el)) {
      // Already observed.
      return;
    }

    const obj = {
      target: el,
      selection: resolveSelectionValue(el),
    };

    el.addEventListener('click', this._check, false);
    el.addEventListener('selectionchange', this._check, false);
    this._observables.push(obj);
  }

  takeRecords(): Array<SelectionEntry> {
    return this._observables.slice(0);
  }

  _onClick = (): void => {
    const callback = this._callback;
    this._observables = this._observables.map((obj) => {
      const {target} = obj;
      return {
        target,
        selection: resolveSelectionValue(target),
      };
    });
    callback?.(this.takeRecords(), this);
  };

  _check = (): void => {
    let changed = false;
    const callback = this._callback;
    this._observables = this._observables.map((obj) => {
      const {target, selection} = obj;
      const $selection = resolveSelectionValue(target);
      if (
        selection.from === $selection.from &&
        selection.to === $selection.to
      ) {
        return obj;
      }
      changed = true;
      return {
        target,
        selection: $selection,
      };
    });
    if (changed && callback) {
      callback(this.takeRecords(), this);
    }
  };
}
