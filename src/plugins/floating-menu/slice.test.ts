/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

import { createSliceManager } from './slice';
import { EditorView } from 'prosemirror-view';
import { EditorState, Transaction } from 'prosemirror-state';
import { Node } from 'prosemirror-model';
import { FloatRuntime, SliceModel } from './model';

describe('createSliceManager', () => {
  let runtimeMock: jest.Mocked<FloatRuntime>;
  let manager: ReturnType<typeof createSliceManager>;

  beforeEach(() => {
    runtimeMock = {
      createSlice: jest.fn().mockResolvedValue({
        id: '999',
        source: 'mock',
        from: 'mock-from',
        to: 'mock-to',
        name: 'Mock Slice',
        description: 'A mock slice for testing',
        referenceType: 'mock',
        ids: ['mock-id'],
      } as SliceModel),

      retrieveSlices: jest.fn().mockResolvedValue([
        {
          id: '1',
          source: 'doc-1',
          from: 'node-1',
          to: 'node-1-end',
          name: 'Test Slice',
          description: 'Mock slice for testing',
          referenceType: 'mock',
          ids: ['node-1'],
        } as SliceModel,
      ]),

      insertInfoIconFloat: jest.fn(),
      insertCitationFloat: jest.fn(),
      insertReference: jest.fn(),
    } as unknown as jest.Mocked<FloatRuntime>;

    manager = createSliceManager(runtimeMock);
  });


  it('should initialize with empty slice list', () => {
    expect(manager.getDocSlices()).toEqual([]);
  });

  it('should set slices filtering by doc objectId', () => {
    const mockState = {
      doc: { attrs: { objectId: 'doc-1' } },
    } as unknown as EditorState;

    const slices = [
      { id: 1, source: 'doc-1', from: 'node-1' },
      { id: 2, source: 'doc-2', from: 'node-2' },
    ] as unknown as SliceModel[];

    manager.setSlices(slices, mockState);

    const result = manager.getDocSlices();
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe('doc-1');
  });

  it('should add new slice to cache', () => {
    const slice = { id: 3, source: 'doc-3', from: 'node-3' } as unknown as SliceModel;
    const updated = manager.addSliceToList(slice);

    expect(updated).toContainEqual(slice);
  });

  it('should retrieve document slices from runtime', async () => {
    const mockView = {} as EditorView;

    const expectedSlices: SliceModel[] = [
      {
        id: '1',
        source: 'doc-1',
        from: 'node-1',
        to: 'node-1-end',
        name: 'Test Slice',
        description: 'Mock slice for testing',
        referenceType: 'mock',
        ids: ['node-1'],
      },
    ];

    // Make sure the runtime mock returns the same full slice
    runtimeMock.retrieveSlices.mockResolvedValue(expectedSlices);

    const slices = await manager.getDocumentSlices(mockView);

    manager.addInfoIcon();
    manager.addCitation();
    const slideModel = {
      id: '1',
      source: 'doc-1',
      from: 'node-1',
      to: 'node-1-end',
      name: 'Test Slice',
      description: 'Mock slice for testing',
      referenceType: 'mock',
      ids: ['node-1'],
    };
    const slicesdlg = await manager.createSliceViaDialog(slideModel);
    await manager.insertReference();
    expect(slicesdlg.referenceType).toEqual(slideModel.referenceType);

    expect(runtimeMock.retrieveSlices).toHaveBeenCalled();
    expect(slices).toEqual(expectedSlices);
  });

  it('should set slice attrs on matching nodes', () => {
    const mockDispatch = jest.fn();

    const mockTr = {
      setNodeMarkup: jest.fn().mockReturnThis(),
    } as unknown as Transaction;

    const mockNode = {
      attrs: { objectId: 'node-1' },
    } as unknown as Node;

    const mockView = {
      state: {
        tr: mockTr,
        doc: {
          descendants: (callback: (node: Node, pos: number) => void) => {
            callback(mockNode, 42);
          },
        },
      },
      dispatch: mockDispatch,
    } as unknown as EditorView;

    manager.addSliceToList({
      id: '1',
      source: 'doc-1',
      from: 'node-1',
      to: 'node-1-end',
      name: 'Test Slice',
      description: 'Mock slice',
      referenceType: 'mock',
      ids: ['node-1'],
    });

    // 👇 spy on the mockTr instance
    const setNodeMarkupSpy = jest.spyOn(mockTr, 'setNodeMarkup');

    manager.setSliceAttrs(mockView);

    expect(setNodeMarkupSpy).toHaveBeenCalledWith(
      42,
      undefined,
      expect.objectContaining({
        isDeco: expect.objectContaining({ isSlice: true }),
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(mockTr);

    setNodeMarkupSpy.mockRestore();
  });
});
