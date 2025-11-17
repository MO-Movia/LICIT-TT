import { history } from '@tiptap/pm/history';
import keys from './keys';
import menu from './menu';

export const plugins = [history(), keys(), menu()];
