
import { EditorView } from 'prosemirror-view';
import { Plugin, PluginKey } from 'prosemirror-state';
import {UpperCaseCommand} from './UpperCaseCommand';
import {LowerCaseCommand} from './LowerCaseCommand';
import {SentanceCaseCommand} from './SentenceCaseCommand';
import {DarkThemeIcon, LightThemeIcon} from './images';

export class ChangeCasePlugin extends Plugin {
    _view: EditorView = null;
    constructor() {
        super({
            key: new PluginKey('ChangeCasePlugin'),
        });
    }

    initButtonCommands(theme: string): unknown {
        let image = null;
        if ('light' == theme) {
          image = LightThemeIcon;
        } else {
          image = DarkThemeIcon;
        }

        return {
            [`[${image}] Change Case`]: [
              {
                'UpperCase': new UpperCaseCommand(),
                'LowerCase': new LowerCaseCommand(),
                'SentenceCase': new SentanceCaseCommand(),
              },
            ],
          };

    }


}

