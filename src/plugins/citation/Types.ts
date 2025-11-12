import { DecorationSet, EditorView } from 'prosemirror-view';
import { CapcoService, Marking } from './Constants';
import { PluginKey } from 'prosemirror-state';

export type NodeSpec = {
  attrs?: { [key: string]: unknown };
  content?: string;
  draggable?: boolean;
  group?: string;
  inline?: boolean;
  name?: string;
  parseDOM?: Array<unknown>;
  toDOM?: (node: Node) => Array<unknown>;
  selectable: boolean;
};
export type MarkSpec = {
  attrs?: { [key: string]: unknown };
  name?: string;
  parseDOM: Array<unknown>;
  toDOM: (node: Node) => Array<unknown>;
};

export type Citation = {
  overallDocumentCapco?: string;
  author?: string;
  authorTitle?: string;
  referenceId?: string;
  referenceType?: string;
  publishedDate?: string;
  icod?: string;
  documentTitleCapco?: string;
  documentTitle?: string;
  hyperLink?: string;
  dateAccessed?: string;
  overallCitationCAPCO?: string;
  pageTitle?: string;
  extractedInfoCAPCO?: string;
  declassifyDate?: string;
  declassifyDateType?: string;
  descriptionCAPCO?: string;
  description?: string;
  citationObjectRefId?: string;
  pages?: string;
  publishedDateTitle?: string;
  from?: string;
  isCitationObject?: boolean;
  to?: string;
};

export const citationFields: (keyof Citation)[] = [
  'overallDocumentCapco',
  'author',
  'authorTitle',
  'referenceId',
  'referenceType',
  'publishedDate',
  'icod',
  'documentTitleCapco',
  'documentTitle',
  'hyperLink',
  'dateAccessed',
  'isCitationObject',
  'overallCitationCAPCO',
  'pageTitle',
  'extractedInfoCAPCO',
  'declassifyDate',
  'declassifyDateType',
  'descriptionCAPCO',
  'description',
  'citationObjectRefId',
  'pages',
  'publishedDateTitle',
  'from',
  'to',
];

export type CitationProps = Citation & {
  mode: number;
  editorView: EditorView;
  capcoService: CapcoService<Marking>;
};

export type CitationUseObject = {
  align?: string;
  boldNumbering?: boolean;
  boldPartial?: boolean;
  boldSentence?: boolean;
  fontName?: string;
  fontSize?: string;
  strong?: boolean;
  em?: boolean;
  underline?: boolean;
  color?: string;
  textHighlight?: string;
  hasNumbering?: boolean;
  paragraphSpacingAfter?: string;
  paragraphSpacingBefore?: string;
  styleLevel?: string;
  lineHeight?: string;
  isLevelbased?: boolean;
  indent?: string;
};

export type HtmlCitationUseObject = {
  overallCitationCAPCO: string;
  pageTitle: string;
  extractedInfoCAPCO: string;
  descriptionCAPCO: string;
  description: string;
  citationObjectRefId: string;
  pageStart: string;
  pageEnd: string;
};

export type CitableMaterial = {
  id: string;
  title: string;
  author?: string;
  overallClassification?: string;
  publishedDate?: string;
  titleClassification?: string;
};

export type citationBuilder = (citation: Citation) => string;

export interface AddCitationCommandOptions {
  color?: string;
  capcoService: CapcoService<Marking>;
  citationBuilder?: citationBuilder;
  citableMaterial?: CitableMaterial[];
}

export interface CitationPluginOptions {
  showFootercitation?: boolean;
  citationKey?: {
    description: string;
    windows: string;
    mac: string;
    common?: string;
  };
  addCitationOpt?: AddCitationCommandOptions;
}

export interface CitationPluginState extends CitationPluginOptions {
  decorations: DecorationSet;
  loaded: boolean;
}
export const pluginKey = new PluginKey('CitationPlugin');
