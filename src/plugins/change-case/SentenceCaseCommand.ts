/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorState, Transaction } from "prosemirror-state";
import { Transform } from "prosemirror-transform";
import { EditorView } from "prosemirror-view";
import { UICommand } from '../../core';

// Code to convert the selected text into SentanceCase
// NOSONAR
export class SentanceCaseCommand extends UICommand {
  executeCustomStyleForTable(
    _state: EditorState,
    tr: Transform,
    _from: number,
    _to: number
  ): Transform {
    return tr;
  }
  // To check if any text is selected

  isEnabled = (state: EditorState): boolean => {
    return this._isEnabled(state);
  };

  _isEnabled = (state: EditorState): boolean => {
    const tr = state.tr;
    if (!tr.selection.empty) {
      return true;
    }
    return false;
  };

  execute = (
    state: EditorState,
    dispatch: (tr: Transform) => void | undefined,
    _view: EditorView | undefined
  ): boolean => {
    const { from, to, $anchor } = state.selection;
    let tr: Transaction = state.tr;
    let previousContent = null;
    let paragraphContent = "";
    tr = this.toLower(state, tr);
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.type.name === "paragraph") {
        paragraphContent = node.textContent;
      }
      if (!this.isSelectedTextNode(node, pos, from, to)) {
        return;
      }

      const { start, end, text } = this.getSelectedTextRange(node, pos, from, to);
      const transformedText = this.getSentenceCaseText(
        text,
        paragraphContent,
        previousContent,
        $anchor?.nodeBefore?.text ?? null
      );
      previousContent = transformedText;

      tr.replaceWith(
        start,
        end,
        state.schema.text(transformedText, node.marks)
      );
    });
    dispatch(tr.scrollIntoView());
    return true;
  };

  isSelectedTextNode(node, pos: number, from: number, to: number): boolean {
    return node.isText && pos <= to && pos + node.nodeSize >= from;
  }

  getSelectedTextRange(node, pos: number, from: number, to: number) {
    const start = Math.max(pos, from);
    const end = Math.min(pos + node.nodeSize, to);
    const text = node.textBetween(start - pos, end - pos);
    return { start, end, text };
  }

  getSentenceCaseText(
    text: string,
    paragraphContent: string,
    previousContent: string | null,
    anchorBeforeText: string | null
  ): string {
    if (paragraphContent.startsWith(text)) {
      return this.parseSelectedText(
        this.capitalizeFirstParagraphCharacter(text)
      );
    }

    const currentPreviousContent = previousContent ?? anchorBeforeText;
    return this.checkPreviousNode(currentPreviousContent, text);
  }

  parseSelectedText(txt: string): string {
    let retString = "";
    const regex = /\s/; // Regex to split the string on one or more whitespace characters
    const txtArray = txt.split(regex);
    let previousBlock = "";
    if (txtArray && txtArray.length > 1) {
      retString = txtArray
        .map((str, index) => {
          if (index > 0) {
            previousBlock = txtArray[index - 1];
            if (this.processPreviousContent(previousBlock, str)) {
              const caps = str.charAt(0).toUpperCase();
              return caps + str.substring(1);
            }
            return str;
          } else {
            return str;
          }
        })
        .join(" ");
      return retString;
    } else {
      return txt;
    }
  }

  processPreviousContent(prevCont: string, currentString: string): boolean {
    if (!prevCont || prevCont.trim().length === 0) {
      return false;
    }
    if (this.isSingleSentenceDelimiter(prevCont)) {
      return true;
    }

    const delimiterSeparatedChars = this.getDelimiterSeparatedChars(prevCont);
    if (!delimiterSeparatedChars.length) {
      return false;
    }

    if (this.startsNewSentence(delimiterSeparatedChars, prevCont, currentString)) {
      return true;
    }

    return this.endsWithSentenceWrapper(delimiterSeparatedChars);
  }

  isSingleSentenceDelimiter(value: string): boolean {
    return value === "." || value === "?" || value === "!";
  }

  getDelimiterSeparatedChars(prevCont: string): string[] {
    const delimiters = [".", "?", "!"];
    for (const delimiter of delimiters) {
      const parts = prevCont.split(delimiter);
      if (parts.length > 1) {
        return parts.reverse();
      }
    }
    return prevCont.split(".").reverse();
  }

  startsNewSentence(
    delimiterSeparatedChars: string[],
    prevCont: string,
    currentString: string
  ): boolean {
    const startsWithSpaces = /^\s{1,10000}/;
    const endWithSpaces = / {1,10000}$/;
    const currentChunk = delimiterSeparatedChars[0]?.trim();

    return (
      delimiterSeparatedChars.length > 1 &&
      (
        currentChunk === "" ||
        currentChunk === "?" ||
        currentChunk === "!" ||
        endWithSpaces.test(prevCont) ||
        startsWithSpaces.test(currentString)
      )
    );
  }

  endsWithSentenceWrapper(delimiterSeparatedChars: string[]): boolean {
    const charectersToInclude = [">", "}", ")", "]", '"'];

    for (const chunk of delimiterSeparatedChars) {
      let isParagraphStart = true;
      for (const char of chunk) {
        if (!charectersToInclude.has(char)) {
          isParagraphStart = false;
          break;
        }
      }
      if (isParagraphStart) {
        return true;
      }
    }

    return false;
  }

  checkPreviousNode(str: string, currentString: string): string {
    // Checking previous content so that we can identify if it is the first letter of the sentence
    if (this.processPreviousContent(str, currentString)) {
      return this.capitalizeFirstParagraphCharacter(currentString);
    } else {
      return this.parseSelectedText(currentString);
    }
  }

  capitalizeFirstParagraphCharacter(inputString: string): string {
    // Capitalizing the starting letter of a paragraph
    const regex = /^([^a-zA-Z]*[a-z])(.*)/;
    const matches = regex.exec(inputString);
    if (matches) {
      const specialCharacters = matches[1];
      const remainingString = matches[2];
      const capitalizedFirstChar = specialCharacters
        .at(-1)
        .toUpperCase();
      const finalString =
        specialCharacters.slice(0, -1) +
        capitalizedFirstChar +
        remainingString;
      return finalString;
    }
    return inputString;
  }

  checkDelimeter(strs: string[] | string): void {
    // Checking Delimeters to see if it is a sentence
    const regex = /[?}>)\]]/g;
    const values = Array.isArray(strs) ? strs : [strs];
    for (const element of values) {
      const matches = element.match(regex);
      if (matches) {
        return;
      }
    }
  }

  toLower(state: EditorState, tr: Transaction): Transaction {
    //  Conversion of selected text to lower case
    const { from, to } = state.selection;
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.isText && pos <= to && pos + node.nodeSize >= from) {
        const start = Math.max(pos, from);
        const end = Math.min(pos + node.nodeSize, to);
        const text = node.textBetween(start - pos, end - pos);

        if (text !== text.toLowerCase()) {
          const transformedText = text.toLowerCase();
          tr.replaceWith(
            start,
            end,
            state.schema.text(transformedText, node.marks)
          );
        }
      }
    });
    return tr;
  }

  renderLabel() {
    return null;
  }
  isActive(): boolean {
    return true;
  }
  waitForUserInput(): Promise<null> {
    return Promise.resolve(null);
  }
  executeWithUserInput(): boolean {
    return true;
  }
  cancel(): void {
    return null;
  }
  executeCustom(_state: EditorState, tr: Transform): Transform {
    return tr;
  }
}
