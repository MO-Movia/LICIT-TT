export type HTMLStyles = {
    align?: string; // Text align
    boldNumbering?: boolean; // true= Bold the Numbering part
    boldPartial?: boolean; // true = Bold first word
    boldSentence?: boolean; // true = Bold first sentence
    fontName?: string; // Font Name
    fontSize?: string; // Font size
    strong?: boolean; // Bold
    em?: boolean; // Italic
    underline?: boolean; // Text Underline
    color?: string; // Text colour
    textHighlight?: string; // Text highlight
    hasNumbering?: boolean; // true= The style has numbering
    hasBullet?: boolean; // true= The style has bullet
    paragraphSpacingAfter?: string; // Spacing after a Paragraph
    paragraphSpacingBefore?: string; // Spacing before a Paragraph
    styleLevel?: number; // Numbering heirachy level
    bulletLevel?: string | boolean; // Numbering heirachy level
    lineHeight?: string; // Line spacing
    isLevelbased?: boolean; // true= Text indent will be based on Level
    indent?: string; // Text indent
    nextLineStyleName?: string;
    toc?: boolean;
    isHidden?: boolean;
    strike?: string;
    isList?: boolean;
    prefixValue?: string;
};

export type Style = {
    /**
     * Name of the style. Case insensitive value must be unique.
     */
    styleName: string; // Style name to display
    mode?: number; // For Style Editor UI behaviour //0 = new , 1- modify, 2- rename, 3- editall
    description?: string; // style description
    styles?: HTMLStyles;
    docType?: string
};

let styles: Style[] = [];
export function setRuntime(runtime) {
    // This function is intentionally empty. It serves as a placeholder for future development.
    // Add code here as needed.
    RuntimeService.Runtime = runtime;
}

export abstract class RuntimeService {
    private static runtime;
    public static get Runtime() {
        return this.runtime;
    }
    public static set Runtime(runtime) {
        this.runtime = runtime;
    }
}

export function getStyleByName(styleName: string) {

    return styles?.find((style: Style) => style.styleName === styleName) || null;
}

export function setCustomStyles(styleList: Style[] = []) {
    styles = styleList;
}