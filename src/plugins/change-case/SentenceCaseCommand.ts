/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import { EditorState } from "prosemirror-state";
import { Transform } from "prosemirror-transform";
import { EditorView } from "prosemirror-view";
import { UICommand } from "@modusoperandi/licit-doc-attrs-step";

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
    let tr = state.tr;
    let prevNode = null;
    let paragraphContent = "";
    tr = this.toLower(state, tr);
    state.doc.nodesBetween(from, to, (node, pos) => {
      let currentSentence = "";
      if (node.type.name === "paragraph") {
        paragraphContent = node.textContent;
      }
      if (node.isText && pos <= to && pos + node.nodeSize >= from) {
        const start = Math.max(pos, from);
        const end = Math.min(pos + node.nodeSize, to);
        const text = node.textBetween(start - pos, end - pos);
        if (paragraphContent.startsWith(text)) {
          currentSentence = this.capitalizeFirstParagraphCharacter(text);
          currentSentence = this.parseSelectedText(currentSentence);
          prevNode = currentSentence;
        } else {
          if (prevNode === null && $anchor.nodeBefore) {
            prevNode = $anchor.nodeBefore.text;
          }
          currentSentence = this.checkPreviousNode(prevNode, text);
        }

        tr.replaceWith(
          start,
          end,
          state.schema.text(currentSentence, node.marks)
        );
      }
    });
    dispatch(tr.scrollIntoView());
    return true;
  };

  parseSelectedText(txt: string) {
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

  processPreviousContent(prevCont: string, currentString: string) {
    let isParagrphStart = false;
    if (prevCont && prevCont.trim().length > 0) {
      let delimeitorSepChars;
      const charectersToInclude = [">", "}", ")", "]", '"'];
      const startsWithSpaces = /^\s+/;
      const endWithSpaces = / +$/;
      if (prevCont === "." || prevCont === "?" || prevCont === "!") {
        return true;
      }
      delimeitorSepChars = prevCont.split(".");
      if (delimeitorSepChars && delimeitorSepChars.length == 1) {
        delimeitorSepChars = prevCont.split("?");
      }
      if (delimeitorSepChars && delimeitorSepChars.length == 1) {
        delimeitorSepChars = prevCont.split("!");
      }
      if (delimeitorSepChars.length > 0) {
        delimeitorSepChars = delimeitorSepChars.reverse();
        if (
          delimeitorSepChars.length > 1 &&
          (delimeitorSepChars[0].trim() === "" ||
            delimeitorSepChars[0].trim() === "?" ||
            delimeitorSepChars[0].trim() === "!" ||
            endWithSpaces.test(prevCont) ||
            startsWithSpaces.test(currentString))
        ) {
          return true;
        } else {
          for (const str of delimeitorSepChars) {
            if (isParagrphStart) {
              return true;
            }
            for (const char of str) {
              if (charectersToInclude.indexOf(char) < 0) {
                isParagrphStart = false;
                break;
              } else {
                isParagrphStart = true;
              }
            }
          }
        }
      }
    }
    return isParagrphStart;
  }

  checkPreviousNode(str: string, currentString: string) {
    // Checking previous content so that we can identify if it is the first letter of the sentance
    if (this.processPreviousContent(str, currentString)) {
      return this.capitalizeFirstParagraphCharacter(currentString);
    } else {
      return this.parseSelectedText(currentString);
    }
  }

  capitalizeFirstParagraphCharacter(inputString) {
    // Capitalizing the starting letter of a paragraph
    const regex = /^([^a-zA-Z]*[a-z])(.*)/;
    const matches = inputString.match(regex);
    if (matches) {
      const specialCharacters = matches[1];
      const remainingString = matches[2];
      const capitalizedFirstChar = specialCharacters
        .charAt(specialCharacters.length - 1)
        .toUpperCase();
      const finalString =
        specialCharacters.slice(0, specialCharacters.length - 1) +
        capitalizedFirstChar +
        remainingString;
      return finalString;
    }
    return inputString;
  }

  checkDelimeter(strs) {
    // Checking Delimeters to see if it is a sentance
    const regex = /[?}>)\]]/g;
    for (const element of strs) {
      const matches = element.match(regex);
      if (matches) {
        return;
      }
    }
  }

  toLower(state: EditorState, tr) {
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
