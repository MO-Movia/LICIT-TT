import { EditorState, Transaction } from 'prosemirror-state';
import { createCommand } from './CreateCommand';
import { Transform } from 'prosemirror-transform';

describe('createCommand', () => {
    let mockExecute: jest.Mock;
    let state: EditorState;
    let tr: Transaction;

    beforeEach(() => {
        mockExecute = jest.fn();
        tr = {
            docChanged: false,
        } as any as Transaction;

        state = {
            tr,
        } as any as EditorState;
    });

    it('should return a UICommand instance', () => {
        const cmd = createCommand(mockExecute);
        expect(typeof cmd.execute).toBe('function');
        expect(typeof cmd.isEnabled).toBe('function');
    });

    it('isEnabled should return result of execute', () => {
        mockExecute.mockReturnValue(true);
        const cmd = createCommand(mockExecute);
        expect(cmd.isEnabled(state)).toBe(false);
    });

    it('execute should call execute callback and update transaction if changed', () => {
        const dispatch = jest.fn();
        const nextTr = { docChanged: true } as any as Transform;

        mockExecute.mockImplementation((_state, dispatchFn) => {
            dispatchFn(nextTr);
        });

        const cmd = createCommand(mockExecute);
        const result = cmd.execute(state, dispatch);

        expect(mockExecute).toHaveBeenCalledWith(expect.anything(), expect.any(Function), undefined);
        expect(dispatch).toHaveBeenCalledWith(nextTr);
        expect(result).toBe(true);
    });

    it('execute should return false if no transaction change', () => {
        mockExecute.mockImplementation((_state, dispatchFn) => {
            dispatchFn(state.tr as any as Transform); // same transaction, no change
        });

        const cmd = createCommand(mockExecute);
        const result = cmd.execute(state);

        expect(result).toBe(false);
    });

    it('waitForUserInput should resolve undefined', async () => {
        const cmd = createCommand(mockExecute);
        await expect(cmd.waitForUserInput(state)).resolves.toBe(undefined);
    });

    it('executeWithUserInput should return false', () => {
        const cmd = createCommand(mockExecute);
        expect(cmd.executeWithUserInput(state)).toBe(false);
    });

    it('cancel should return null', () => {
        const cmd = createCommand(mockExecute);
        expect(cmd.cancel()).toBe(null);
    });

    it('executeCustomStyleForTable should return the transaction', () => {
         const cmd = createCommand(mockExecute);
        const mockTr = {} as Transaction;
        expect(cmd.executeCustomStyleForTable(state, mockTr,0,0)).toBe(mockTr);
    });
});
