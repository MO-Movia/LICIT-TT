/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import * as React from 'react';
import {flushSync} from 'react-dom';
import {createRoot, type Root} from 'react-dom/client';
import TableDetails from './TableDetails';

describe('TableDetails', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    flushSync(() => {
      root.unmount();
    });
    document.body.removeChild(container);
    container = null;
  });

  it('should render table details with width and height', () => {
    const props = {
      table: {
        width: 500,
        height: 300,
      },
    };

    flushSync(() => {
      root.render(<TableDetails {...props} />);
    });

    expect(container.querySelector('.czi-table-details-popup')).toBeTruthy();
    expect(container.querySelector('.czi-table-details-header span')?.textContent).toBe('Table Details');

    const rows = container.querySelectorAll('.czi-table-details-section .czi-row');
    expect(rows.length).toBe(0);
  });

  it('should render editable fields from table row and cell attributes', () => {
    const props = {
      table: {
        width: 500,
        height: 300,
        noOfColumns: 4,
        tableHeight: '250px',
      },
      row: {
        rowHeight: '44px',
        rowWidth: '420px',
      },
      cell: {
        width: 100,
        height: 50,
        cellWidth: '120px',
        cellStyle: 'padding: 8px;',
        fontSize: '14px',
        letterSpacing: '1px',
        marginTop: '6px',
        MarginBottom: '5px',
      },
    };

    flushSync(() => {
      root.render(<TableDetails {...props} />);
    });

    expect(container.querySelector<HTMLInputElement>('input[name="noOfColumns"]')?.value).toBe('4');
    expect(container.querySelector<HTMLInputElement>('input[name="tableHeight"]')?.value).toBe('250px');
    expect(container.querySelector<HTMLInputElement>('input[name="rowHeight"]')?.value).toBe('44px');
    expect(container.querySelector<HTMLInputElement>('input[name="rowWidth"]')).toBeNull();
    expect(container.querySelector<HTMLInputElement>('input[name="cellWidth"]')?.value).toBe('120px');
    expect(container.querySelector<HTMLInputElement>('input[name="cellStyle"]')?.value).toBe('padding: 8px;');
    expect(container.querySelector<HTMLInputElement>('input[name="fontSize"]')?.value).toBe('14px');
    expect(container.querySelector<HTMLInputElement>('input[name="letterSpacing"]')?.value).toBe('1px');
    expect(container.querySelector<HTMLInputElement>('input[name="marginTop"]')?.value).toBe('6px');
    expect(container.querySelector<HTMLInputElement>('input[name="MarginBottom"]')?.value).toBe('5px');
  });

  it('should not render cell details when cell prop is not provided', () => {
    const props = {
      table: {
        width: 500,
        height: 300,
      },
      row: {
        rowHeight: '44px',
        rowWidth: '420px',
      },
    };

    flushSync(() => {
      root.render(<TableDetails {...props} />);
    });

    expect(container.textContent).not.toContain('Cell Width');
    expect(container.textContent).not.toContain('Cell Attributes');
    expect(container.querySelector('input[name="cellWidth"]')).toBeFalsy();
  });

  it('should call close callback when close button is clicked', () => {
    const closeMock = jest.fn();
    const props = {
      table: {
        width: 500,
        height: 300,
      },
      close: closeMock,
    };

    flushSync(() => {
      root.render(<TableDetails {...props} />);
    });

    const closeButton = container.querySelector<HTMLButtonElement>('.czi-table-details-close');
    expect(closeButton).toBeTruthy();
    expect(closeButton?.title).toBe('Close');

    flushSync(() => {
      closeButton?.click();
    });
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('should call onApply with current form values', () => {
    const closeMock = jest.fn();
    const onApplyMock = jest.fn();
    const props = {
      table: {
        width: 500,
        height: 300,
        noOfColumns: '6',
      },
      row: {
        rowHeight: null,
        rowWidth: null,
      },
      cell: {
        width: 100,
        height: 50,
        MarginBottom: '10px',
      },
      close: closeMock,
      onApply: onApplyMock,
    };

    flushSync(() => {
      root.render(<TableDetails {...props} />);
    });

    const applyButton = container.querySelector<HTMLButtonElement>('button[title="Apply"]');
    flushSync(() => {
      applyButton?.click();
    });

    expect(onApplyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        noOfColumns: '6',
        MarginBottom: '10px',
      })
    );
    expect(closeMock).toHaveBeenCalled();
  });
});
