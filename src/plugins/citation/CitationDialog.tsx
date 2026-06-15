/**
 * @license MIT
 * @copyright Copyright 2026 Modus Operandi Inc. All Rights Reserved.
 */

import React from 'react';
import { EditorView } from 'prosemirror-view';
import { createPopUp, atAnchorBottomCenter, PopUpHandle } from '../../commands';
import { SearchCitation } from './SearchCitation';
import {
  CitableMaterial,
  Citation,
  citationBuilder,
  CitationProps,
} from './Types';
import { defaultCitationText } from './CitationBuilder';
import { MODE } from './Constants';
import { toISOString } from './utils';

export type CitationDialogProps = CitationProps & {
  close?: (val?: CitationDialogProps) => void;
};

export type CitationDialogState = CitationProps & {
  buildSourceText?: citationBuilder;
  citableMaterial?: CitableMaterial[];
};

const AUTHORS = ['Author', 'Publisher', 'Originator', 'Agency/Organization'];
const IDTYPES = ['Reference ID', 'Document Serial No./Unique identifier'];
const DECLASSYFY_25PERIOD = 'Declassify After 25 years';
const DECLASSYFY_50PERIOD = 'Declassify After 50 years';
const DECLASSYFY_DATE = 'Declassify Date';
const DECLASSTYPES = [
  DECLASSYFY_25PERIOD,
  DECLASSYFY_50PERIOD,
  DECLASSYFY_DATE,
];
const DATES = ['Published', 'Issued', 'Posted'];
const PORTIONS = ['Page', 'Paragraph'];

export class CitationDialog extends React.PureComponent<
  CitationDialogProps,
  CitationDialogState
> {
  _popUp?: PopUpHandle = undefined;
  activeCitedMaterial?: string;

  constructor(props: CitationDialogProps) {
    super(props);
    this.state = {
      ...props,
    };
  }

  private renderField(field: {
    input?: {
      field: keyof Citation;
      value: string;
      type?: React.HTMLInputTypeAttribute;
      disabled?: boolean;
    };
    label:
      | string
      | {
          labels: string[];
          field: keyof Citation;
          value: string;
        };
    capco?: {
      field: keyof Citation;
      value: string;
    };
    colSpan?: number;
  }) {
    return (
      <div
        className="molcit-div-display"
        style={{ margin: '0.5em 0.5em', flexGrow: field.colSpan ?? 1 }}
      >
        <div className="label">
          {typeof field.label === 'string' ? (
            <label
              className="molcit-citation-label"
              style={{
                fontSize: '1em',
                verticalAlign: 'middle',
                width: '100%',
              }}
              title={field.capco?.value ?? field.label}
            >
              {field.capco
                ? [
                    '(',
                    <button
                      className="btnsave"
                      id={field.capco.field}
                      key={field.capco.field}
                      onClick={() => this._showContextMenu(field.capco.field)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontWeight: 'bold',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        padding: 0,
                      }}
                      title={field.capco.value}
                      type="button"
                      value={field.capco.value}
                    >
                      {field.capco.value}
                    </button>,
                    ') ',
                  ]
                : ''}
              {field.label}
            </label>
          ) : (
            <select
              className="molcit-citation-label"
              onChange={this.onInputChanged.bind(this, field.label.field)}
              style={{ width: '100%' }}
              value={field.label.value ?? ''}
            >
              {field.label.labels.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          )}
        </div>
        {field.input ? (
          <input
            autoFocus
            disabled={field.input.disabled}
            onChange={this.onInputChanged.bind(this, field.input.field)}
            style={{
              borderColor: 'lightgray',
              height: field.input.type === 'text' ? '1.5em' : '2.5em',
              width: '100%',
            }}
            type={field.input.type ?? 'text'}
            value={field.input.value ?? ''}
          />
        ) : (
          ''
        )}
      </div>
    );
  }

  render(): React.ReactNode {
    const OVERALLCITCAPCO = this.state.overallCitationCAPCO ?? 'TBD';
    const DOCTITLECAPCO = this.state.documentTitleCapco ?? 'TBD';
    const EXTINFOCAPCO = this.state.extractedInfoCAPCO ?? 'TBD';
    const OVERALLDOCCAPCO = this.state.overallDocumentCapco ?? 'TBD';
    const DESCAPCO = this.state.descriptionCAPCO ?? 'TBD';
    const DES = this.state.description ?? '';
    const DECLASSTYPE = this.state.declassifyDateType ?? DECLASSYFY_25PERIOD;
    const isCitation = Boolean(this.state.isCitationObject);

    return (
      <div
        style={{
          backgroundColor: '#fff',
          width: '75vw',
          maxWidth: '1000px',
          display: 'flex',
          flex: 1,
          height: '625px',
          flexDirection: 'row',
          overflow: 'hidden',
          borderRadius: '10px',
          boxShadow: '0px 4px 12px 2px rgba(0, 0, 0, 0.06)',
        }}
      >
        {this.getCitableMaterialList()}
        <form
          className="czi-form"
          id="citationform"
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            className="header"
            style={{ display: 'inline-flex', fontSize: '2em' }}
          >
            {this.renderField({
              label: 'Source Citation',
              capco: {
                field: 'overallCitationCAPCO',
                value: OVERALLCITCAPCO,
              },
            })}

            <div style={{ float: 'right', marginTop: '-5px', flexGrow: 0 }}>
              <button
                className="btnsave"
                disabled={false}
                onClick={this._onSearch.bind(this)}
                style={{ display: 'none' }}
                title="Citation Server Not Available"
                type="button"
              >
                Search
              </button>
              <button
                className="btnsave"
                disabled={'' === this.state.referenceId}
                onClick={this._save.bind(this)}
              >
                Save
              </button>
              <button className="btnsave" onClick={this._cancel}>
                Cancel
              </button>
            </div>
          </div>
          <hr
            className="molcit-hr-width"
            style={{ marginBottom: '5px', marginTop: '5px' }}
          ></hr>
          <div style={{ display: 'inline-flex' }}>
            {this.renderField({
              input: {
                field: 'author',
                value: this.state.author,
              },
              label: {
                labels: AUTHORS,
                field: 'authorTitle',
                value: this.state.authorTitle,
              },
            })}
            {this.renderField({
              input: {
                field: 'referenceId',
                value: this.state.referenceId,
              },
              label: {
                labels: IDTYPES,
                field: 'referenceType',
                value: this.state.referenceType,
              },
            })}
          </div>
          <div style={{ display: 'inline-flex' }}>
            {this.renderField({
              input: {
                field: 'publishedDate',
                value: this.state.publishedDate,
                type: 'date',
              },
              label: {
                labels: DATES,
                field: 'publishedDateTitle',
                value: this.state.publishedDateTitle,
              },
            })}
            {this.renderField({
              input: {
                field: 'icod',
                type: 'date',
                value: this.state.icod,
              },
              label: 'ICOD',
            })}
            {this.renderField({
              input: {
                field: 'declassifyDate',
                value: this.state.declassifyDate,
                type: 'date',
                disabled: DECLASSTYPE !== DECLASSYFY_DATE,
              },
              label: {
                labels: DECLASSTYPES,
                field: 'declassifyDateType',
                value: DECLASSTYPE,
              },
            })}
            {this.renderField({
              input: {
                field: 'dateAccessed',
                value: this.state.dateAccessed,
                type: 'date',
              },
              label: 'Date Accessed',
              colSpan: 0,
            })}
          </div>
          <div style={{ display: 'inline-flex' }}>
            {this.renderField({
              input: {
                field: 'documentTitle',
                value: this.state.documentTitle,
              },
              label: 'Document Title',
              capco: {
                field: 'documentTitleCapco',
                value: DOCTITLECAPCO,
              },
              colSpan: 3,
            })}
            {this.renderField({
              input: {
                field: 'pages',
                value: this.state.pages,
              },
              label: {
                labels: PORTIONS,
                field: 'pageTitle',
                value: this.state.pageTitle,
              },
            })}
          </div>
          <div style={{ display: 'inline-flex' }}>
            {this.renderField({
              label: 'cited portion classification',
              capco: {
                field: 'extractedInfoCAPCO',
                value: EXTINFOCAPCO,
              },
            })}
            {this.renderField({
              label: 'Overall document classification',
              capco: {
                field: 'overallDocumentCapco',
                value: OVERALLDOCCAPCO,
              },
            })}
          </div>
          <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
            <div>
              {this.renderField({
                label: 'Description',
                capco: {
                  field: 'descriptionCAPCO',
                  value: DESCAPCO,
                },
              })}
            </div>
            <textarea
              cols={50}
              data-disabled={isCitation}
              name="description"
              onChange={this.onInputChanged.bind(this, 'description')}
              rows={4}
              style={{
                border: '1px solid lightgrey',
                fontFamily: 'helvetica',
                fontSize: '13px',
                resize: 'none',
              }}
              value={DES}
            >
              {DES}
            </textarea>
          </div>
          <div style={{ display: 'inline-flex' }}>
            {this.renderField({
              input: {
                field: 'hyperLink',
                value: this.state.hyperLink,
              },
              label: 'Web-accessible hyperlink',
              colSpan: 2,
            })}
          </div>
          <hr
            style={{ width: '100%', marginBottom: '5px', marginTop: '5px' }}
          ></hr>
          <textarea
            cols={50}
            name="sourceText"
            readOnly
            rows={4}
            style={{
              border: 'none',
              fontFamily: 'arial sans-serif',
              fontSize: '14px',
              margin: '0em 0.5em',
              resize: 'none',
            }}
            value={this.getSourceText()}
          >
            {this.getSourceText()}
          </textarea>
        </form>
      </div>
    );
  }

  getCitableMaterialList(): React.ReactNode | undefined {
    if (!this.state.citableMaterial) return undefined;

    if (!this.state.citableMaterial.length) {
      return (
        <div className="citable-material-container">
          <h2>Citable Material</h2>
          <div className="citable-material-not-found">
            <div className="not-found">No Material Found</div>
          </div>
        </div>
      );
    }

    return (
      <div className="citable-material-container">
        <h2>Citable Material</h2>
        <div className="citable-material-list">
          {this.state.citableMaterial.map((item) => (
            <button
              className={
                'citable-material-list-item ' +
                (item.id === this.activeCitedMaterial
                  ? 'active-citable-material'
                  : '')
              }
              key={item.id}
              onClick={() => this.setActiveCitedMaterial(item.id)}
              onKeyUp={() => this.setActiveCitedMaterial(item.id)}
            >
              <p className="citable-material-title" title={item.title}>
                {item.title}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  setActiveCitedMaterial(id: string): void {
    const selectedMaterial = this.state.citableMaterial.find(
      (material) => material.id === id
    );

    if (selectedMaterial) {
      this.activeCitedMaterial = id;
      this.setState((previousState) => ({
        ...previousState,
        documentTitle: selectedMaterial.title,
        author: selectedMaterial.author,
        publishedDate: selectedMaterial.publishedDate,
        overallDocumentCapco: selectedMaterial.overallClassification,
        documentTitleCapco: selectedMaterial.titleClassification,
      }));
    }
  }

  getSourceText() {
    return (this.state.buildSourceText ?? defaultCitationText)(this.state);
  }

  _showContextMenu(field: keyof Citation) {
    this.execute(field);
  }

  execute(field: keyof Citation) {
    this.props.capcoService
      ?.openManagementDialog()
      .then((val) => {
        if (val) {
          const update = {};
          update[field] = val.portionMarking;
          this.setState(update);
        }
      })
      .catch(console.error);
  }

  componentWillUnmount() {
    this._popUp?.close(null);
  }

  onInputChanged<K extends keyof Omit<Citation, 'isCitationObject'>>(
    fieldName: K,
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const stateUpdate: Citation = {};
    stateUpdate[fieldName] = e.target.value;
    switch (fieldName) {
      case 'referenceId':
        // to keep the referenceId as citation object's reference id in citation use object
        stateUpdate.citationObjectRefId = e.target.value;
        break;
      case 'publishedDate':
        stateUpdate.icod = this.state.icod ?? e.target.value;
        if (
          stateUpdate.publishedDate &&
          this.state.declassifyDateType !== DECLASSYFY_DATE
        ) {
          const declassDate = new Date(stateUpdate.publishedDate);
          declassDate.setUTCFullYear(
            declassDate.getUTCFullYear() +
              (this.state.declassifyDateType === DECLASSYFY_25PERIOD ? 25 : 50)
          );
          stateUpdate.declassifyDate = toISOString(declassDate);
        }
        break;
      case 'declassifyDateType':
        if (
          this.state.publishedDate &&
          stateUpdate.declassifyDateType !== DECLASSYFY_DATE
        ) {
          const declassDate = new Date(this.state.publishedDate);
          declassDate.setUTCFullYear(
            declassDate.getUTCFullYear() +
              (stateUpdate.declassifyDateType === DECLASSYFY_25PERIOD ? 25 : 50)
          );
          stateUpdate.declassifyDate = toISOString(declassDate);
        }
        break;
    }
    this.setState(stateUpdate);
  }

  _cancel = (): void => {
    this.props?.close?.();
  };

  _save = (): void => {
    if ('' !== this.state.referenceId) {
      this.props?.close?.(this.state);
    }
  };

  createCitationObject(
    editorView: EditorView,
    mode: string
  ): {
    mode: string;
    editorView: EditorView;
  } {
    return {
      mode,
      editorView,
    };
  }

  _onSearch(event: React.SyntheticEvent): void {
    const anchor = event?.currentTarget;
    this.disableCitationWIndow(false);
    this._popUp = createPopUp(
      SearchCitation,
      this.createCitationObject(this.props.editorView, MODE.new.toString()),
      {
        anchor,
        autoDismiss: false,
        IsChildDialog: true,
        position: atAnchorBottomCenter,
        onClose: (val) => {
          if (this._popUp) {
            this._popUp.close(null);
            this.disableCitationWIndow(true);
            this._popUp = undefined;
            if (undefined !== val) {
              this.setState({
                ...val.citationObject,
              });
            }
          }
        },
      }
    );
  }

  disableCitationWIndow(isEditable: boolean): void {
    const citationForm = document.getElementById('citationform');
    if (citationForm?.style) {
      citationForm.style.pointerEvents = isEditable ? 'unset' : 'none';
    }
  }
}
