import {TableColorCommand} from './ui/TableColorCommand';

export class TableBackgroundColorCommand extends TableColorCommand {
  getAttrName = (): string => {
    return 'backgroundColor';
  };
}

