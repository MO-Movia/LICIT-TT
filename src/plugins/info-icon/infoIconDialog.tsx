import * as React from 'react';
import './ui/infoIconDialog.css';
import {EditorState} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';
import {DOMSerializer, Schema, DOMParser} from 'prosemirror-model';
import {schema} from 'prosemirror-schema-basic';
import {addListNodes} from 'prosemirror-schema-list';
import 'font-awesome/css/font-awesome.min.css';
import 'prosemirror-menu/style/menu.css';
import {SearchInfoIcon} from './searchInfoIcon';
import {createPopUp} from '@modusoperandi/licit-ui-commands';
import {plugins} from './plugins';
import {FaIcons, FONTAWESOMEICONS} from './ui/FaIcon';
import {SELECTEDINFOICON} from './constants';

type InfoDialogProps = {
  infoIcon: {name; unicode};
  description: string;
  editorView: EditorView;
  mode: number;
  from: number;
  to: number;
  faIcons;
  selectedIconName: string;
  isOpen: boolean;
  isEditorEmpty: boolean;
  isButtonEnabled: boolean;
  close: (val?) => void;
};

export class InfoIconDialog extends React.PureComponent<
  InfoDialogProps,
  InfoDialogProps
> {
  _popUp = null;
  view: EditorView;
  constructor(props: InfoDialogProps) {
    super(props);
    this.state = {
      editorView: props.editorView,
      from: props.from,
      to: props.to,
      infoIcon: props.infoIcon || null,
      faIcons: (this.getCacheIcons().length > 0 ? this.getCacheIcons() : props.faIcons),
      isOpen: props.isOpen || false,
      isButtonEnabled: props.isButtonEnabled || false,
      isEditorEmpty: props.isEditorEmpty || false,
      selectedIconName: props.selectedIconName,
      ...props,
    };
  }

  componentDidMount() {
    // Mix the nodes from prosemirror-schema-list into the basic schema to
    // create a schema with list support.
    const mySchema = new Schema({
      nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
      marks: schema.spec.marks,
    });

    const content = document.getElementById('content');
    content.innerHTML = this.props.description;
    this.view = new EditorView(document.querySelector('#editor'), {
      state: EditorState.create({
        doc: DOMParser.fromSchema(mySchema).parse(
          document.querySelector('#content')
        ),
        plugins: plugins,
        schema: mySchema,
      }),
      dispatchTransaction: (tr) => {
        this.view.updateState(this.view.state.apply(tr));
        const docJson = this.view.state.tr.doc.toJSON();
        this.insertButtonEnble(docJson);
      },
    });
    this.setState({
      editorView: this.view,
      isEditorEmpty: this.view.state.doc.textContent !== '',
    });
  }

  render(): React.ReactNode {
    return (
      <div className="molinfo-infoContainer" id="infoPopup">
        <div className="molinfo-info-head">
          <span>Info Icon</span>
          <button
            className="molinfo-info-close"
            onClick={this._cancel}
            type="button"
          >
            <span>X</span>
          </button>
        </div>
        <div className="molinfo-divider"></div>
        <div className="molinfo-info-body">
          <div>
            <span>
              {this.state.infoIcon ? (
                <span>
                  Current Selection (<span className={this.state.infoIcon?.name}></span>)
                </span>
              ) : (
                <span>Select Icon</span>
              )}
            </span>
          </div>
          <div className="molinfo-icon-container">
            <div className="molinfo-icon-list">
              {this.state.faIcons.map((icon, index) => {
                if (index < 10)
                  return (
                    <div className="molinfo-icon-list-div"  key={icon.id}>
                      <i
                        className={icon.name}
                        id={`infoIcon ${index}`}
                        onClick={() => this.selectInfoIcon(icon)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            this.selectInfoIcon(icon);
                          }
                        }}
                        role='menu'
                        tabIndex={0}
                      ></i>
                    </div>
                  );
                else return null;
              })}
            </div>
            <div className="molinfo-dot-container">
              <i
                className="fa fa-ellipsis-v"
                onClick={() => this.setVisible(!this.state.isOpen)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    this.setVisible(!this.state.isOpen);
                  }
                }}
                role='menu'
                tabIndex={0}
              ></i>
              {this.state.isOpen && (
                <div className="icon-control-cont">
                  <button onClick={this._onAdd.bind(this)}>Add</button>
                  <button
                    disabled={!this.state.infoIcon}
                    onClick={this._onRemove.bind(this)}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="molinfo-display-t">
            <span>Display Text</span>
          </div>
          <div className="molinfo-editor-container" id="editor"></div>
          <div hidden id="content"></div>
          <div className="molinfo-insert-container">
            <button
              className="molinfo-insert-btn"
              disabled={!this.state.isButtonEnabled}
              onClick={this._insert.bind(this)}
            >
              {this.props.mode === 1 ? 'Insert' : 'Update'}
            </button>
          </div>
        </div>
      </div>
    );
  }
  _cancel = (): void => {
    this.props.close();
  };

  selectInfoIcon = (clickedIcon): void => {
    if (clickedIcon.unicode === this.state.infoIcon?.unicode) {
      this.setState({infoIcon: null}, () => {
        this.validateInsert();
      });
    } else {
      this.setState({infoIcon: clickedIcon}, () => {
        this.validateInsert();
      });
    }
  };

  _insert = (): void => {
    this.props.close(this.state);
  };

  validateInsert() {
    //edit mode
    if (2 === this.props.mode) {
      const div = document.createElement('div');
      const fragm = DOMSerializer.fromSchema(
        this.state.editorView?.state?.schema
      ).serializeFragment(this.state.editorView?.state?.doc?.content);
      div.appendChild(fragm);
      const desc = div.innerHTML;
      if (
        this.state.infoIcon &&
        (this.state.selectedIconName !== this.state.infoIcon.name ||
          desc !== this.state.description)
      ) {
        this.setState({isButtonEnabled: true});
      } else {
        this.setState({isButtonEnabled: false});
      }
    } else {
      this.setState((prevState) => ({
        isButtonEnabled: prevState.infoIcon && !prevState.isEditorEmpty,
      }));
    }
  }

  _onAdd(_event: React.SyntheticEvent): void {
    this.disableInfoWIndow(false);
    this._popUp = createPopUp(SearchInfoIcon, null, {
      autoDismiss: false,
      onClose: (val) => {
        if (this._popUp) {
          this._popUp.close();
          this._popUp = null;
          if (undefined !== val) {
            this.setState({faIcons: this.getCacheIcons()});
          }
        }
      },
    });
  }

  setVisible(isOpen) {
    this.setState({isOpen: isOpen});
  }

  _onRemove() {
    const iconName = this.state.infoIcon?.unicode;
    const lcList = localStorage.getItem(SELECTEDINFOICON);
    const lcListItem = JSON.parse(lcList);
    lcListItem.forEach((element, i) => {
      if (element.unicode === iconName) {
        lcListItem.splice(i, 1);
        localStorage.setItem(SELECTEDINFOICON, JSON.stringify(lcListItem));
        this.setState({faIcons: this.getCacheIcons(), infoIcon: null});
      }
    });
  }

  disableInfoWIndow(isEditable: boolean): void {
    const infoIconForm: HTMLElement = document.getElementById('infoPopup');
    if (infoIconForm?.style) {
      if (isEditable) {
        infoIconForm.style.pointerEvents = 'unset';
      } else {
        infoIconForm.style.pointerEvents = 'none';
      }
    }
  }

  getCacheIcons(): FaIcons[] {
    const ccList = localStorage.getItem(SELECTEDINFOICON);
    if (ccList) {
      return JSON.parse(ccList);
    } else {
      const fq = FONTAWESOMEICONS.slice(0, 10);
      localStorage.setItem(SELECTEDINFOICON, JSON.stringify(fq));
      return fq;
    }
  }

  insertButtonEnble(docJson) {
    if (docJson.content.length > 1) {
      this.setState({ isEditorEmpty: false }, () => {
        this.validateInsert();
      });
    } else if (docJson.content.length == 1) {
      if (docJson.content[0].content === undefined) {
        this.setState({ isEditorEmpty: true }, () => {
          this.validateInsert();
        });
      } else {
        this.setState({ isEditorEmpty: false }, () => {
          this.validateInsert();
        });
      }
    }
  }



}
