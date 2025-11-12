import {TableColorCommand} from './ui/TableColorCommand';

export class TableBorderColorCommand extends TableColorCommand {
  getAttrName = (): string => {
    return 'borderColor';
  };
}
