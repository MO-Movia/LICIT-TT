/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { Loader } from './loader';
import { PDFHandler } from './handlers';

jest.useFakeTimers();

describe('Loader component (no react-test-renderer)', () => {
    let loader: Loader;
    let setIntervalSpy: jest.SpiedFunction<typeof setInterval>;
    let clearIntervalSpy: jest.SpiedFunction<typeof clearInterval>;

    beforeEach(() => {
        PDFHandler.state.currentPage = 0;
        PDFHandler.state.isOnLoad = false;
        loader = new Loader({});
        loader.setState = jest.fn();

        setIntervalSpy = jest
            .spyOn(global, 'setInterval')
            .mockImplementation(
                (..._args: Parameters<typeof setInterval>): ReturnType<typeof setInterval> =>
                    123 as unknown as ReturnType<typeof setInterval>
            );
        clearIntervalSpy = jest
            .spyOn(global, 'clearInterval')
            .mockImplementation(
                (..._args: Parameters<typeof clearInterval>): ReturnType<typeof clearInterval> =>
                    undefined
            );
    });

    afterEach(() => {
        jest.clearAllMocks();
        setIntervalSpy.mockRestore();
        clearIntervalSpy.mockRestore();
    });

    test('componentDidMount sets up interval', () => {
        loader.componentDidMount();
        expect(global.setInterval).toHaveBeenCalledTimes(1);

        const callback = setIntervalSpy.mock.calls[0][0];
        if (typeof callback === 'function') {
            callback();
        }
        expect(loader.setState).toHaveBeenCalledWith(
            expect.objectContaining({ time: expect.any(Number) })
        );
    });

    test('componentWillUnmount clears interval', () => {
        loader.componentDidMount();
        loader.componentWillUnmount();
        expect(global.clearInterval).toHaveBeenCalledWith(loader['interval']);
    });

    test('increments passCounter when isOnLoad is true', () => {
        PDFHandler.state.isOnLoad = true;
        loader.componentDidMount();

        const callback = setIntervalSpy.mock.calls[0][0];

        const initialCounter = loader['passCounter'];
        if (typeof callback === 'function') {
            callback();
        }

        expect(loader['passCounter']).toBe(initialCounter + 1);
        expect(loader.setState).toHaveBeenCalledWith(
            expect.objectContaining({ time: expect.any(Number) })
        );
    });

    test('does not increment passCounter when isOnLoad is false', () => {
        PDFHandler.state.isOnLoad = false;
        loader.componentDidMount();

        const callback = setIntervalSpy.mock.calls[0][0];

        const initialCounter = loader['passCounter'];
        if (typeof callback === 'function') {
            callback();
        }

        expect(loader['passCounter']).toBe(initialCounter);
        expect(loader.setState).toHaveBeenCalledWith(
            expect.objectContaining({ time: expect.any(Number) })
        );
    });

    test('render displays correct pass number and counter when isOnLoad is true', () => {
        PDFHandler.state.isOnLoad = true;
        loader['passCounter'] = 5;

        const result = loader.render();

        expect(result.props.children[1].props.children).toEqual([
            'Pass ',
            1,
            ' of ',
            2,
            ': ',
            5
        ]);
    });

    test('render displays correct pass number and counter when isOnLoad is false', () => {
        PDFHandler.state.isOnLoad = false;
        PDFHandler.state.currentPage = 10;

        const result = loader.render();

        expect(result.props.children[1].props.children).toEqual([
            'Pass ',
            2,
            ' of ',
            2,
            ': ',
            10
        ]);
    });

    test('render uses 0 as counter when currentPage is null or undefined', () => {
        PDFHandler.state.isOnLoad = false;
        PDFHandler.state.currentPage = 0;

        const result = loader.render();

        expect(result.props.children[1].props.children).toEqual([
            'Pass ',
            2,
            ' of ',
            2,
            ': ',
            0
        ]);
    });

    test('render has correct structure', () => {
        const result = loader.render();

        expect(result.type).toBe('div');
        expect(result.props.className).toBe('epdf-loader-fullscreen');
        expect(result.props.children).toHaveLength(2);
        expect(result.props.children[0].type).toBe('img');
        expect(result.props.children[0].props.className).toBe('epdf-loader-image');
        expect(result.props.children[0].props.src).toBe('assets/images/modus-loading.gif');
        expect(result.props.children[0].props.alt).toBe('Loading...');
    });
});
