import { ChangeCasePlugin } from './changeCasePlugin';

describe('ChangeCasePlugin', () => {

    const plugin = new ChangeCasePlugin();
    it('should be defined', () => {
        expect(plugin).toBeDefined();
    });

    it('should init buttonCommands', () => {
        expect(plugin.initButtonCommands('dark')).toBeDefined();
    });


});