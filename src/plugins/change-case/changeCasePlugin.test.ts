/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { ChangeCasePlugin } from './changeCasePlugin';
import { DarkThemeIcon, LightThemeIcon } from './images';

describe('ChangeCasePlugin', () => {

    const plugin = new ChangeCasePlugin();
    it('should be defined', () => {
        expect(plugin).toBeDefined();
    });

    it('should init buttonCommands', () => {
        expect(plugin.initButtonCommands('dark')).toBeDefined();
    });

    it('should use the light theme icon when theme is light', () => {
        expect(plugin.initButtonCommands('light')).toEqual({
            [`[${LightThemeIcon}] Change Case`]: [
                {
                    UpperCase: expect.anything(),
                    LowerCase: expect.anything(),
                    SentenceCase: expect.anything(),
                },
            ],
        });
    });

    it('should use the dark theme icon for non-light themes', () => {
        expect(plugin.initButtonCommands('sepia')).toEqual({
            [`[${DarkThemeIcon}] Change Case`]: [
                {
                    UpperCase: expect.anything(),
                    LowerCase: expect.anything(),
                    SentenceCase: expect.anything(),
                },
            ],
        });
    });

});