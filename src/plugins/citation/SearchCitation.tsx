/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

// [FS] IRAD-1251 2021-03-10
// UI for Citation dialog
import React from 'react';
import { CitationRuntime } from './CitationRuntime';
import { Citation } from './Types';

export type SearchCitationProps = {
  close: (val?: SearchCitationState) => void;
};
export type SearchCitationState = {
  citations: Citation[];
  citationObject: Citation;
  selectedRowRefID?: string;
};
let citationObject = {};
let selectedRowRefID = '';
let citations: Citation[] = [];

export class SearchCitation extends React.PureComponent<
  SearchCitationProps,
  SearchCitationState
> {
  constructor(props: SearchCitationProps) {
    super(props);
    this.state = {
      ...props,
      citationObject,
      citations,
    };
  }

  fetchedCit(runtime) {
    return runtime.fetchCitations() as Promise<Citation[]>;
  }
  // To fetch the citation from server and set to the state.
  getCitations(): void {
    const runtime = new CitationRuntime();
    if (typeof runtime.getCitationsAsync === 'function') {
      const storedCitations = this.fetchedCit(runtime);
      storedCitations
        ?.then((result) => {
          if (result) {
            citations = [];
            result.forEach((obj) => {
              citations.push({
                ...obj,
                publishedDateTitle: obj.publishedDateTitle ?? 'Published',
              });
            });
            this.setState({
              citations: citations,
            });
          }
        })
        .catch(console.error);
    }
  }

  componentDidMount(): void {
    this.getCitations();
  }

  render(): React.ReactNode {
    return (
      <div
        style={{
          width: '780px',
          border: '1px solid lightgray',
          boxShadow: '1px 1px',
        }}
      >
        <form className="czi-form" style={{ height: '272px' }}>
          <div>
            <div className="molcit-div-display">
              <label
                className="molcit-citation-label"
                htmlFor="docTitletxt"
                key="lbldocTitle"
                style={{ display: 'block', marginLeft: '2px' }}
              >
                Document Title
              </label>
              <input
                autoComplete="off"
                className="molcit-textborder search-key"
                id="docTitletxt"
                key="txtdocTitle"
                onChange={this.onSearchCitations.bind(this)}
                style={{ height: '20px', width: '170px' }}
                type="text"
              />
            </div>

            <div className="molcit-div-display">
              <label
                className="molcit-citation-label"
                htmlFor="refIdtxt"
                key="lblRefId"
                style={{ display: 'block', marginLeft: '10px' }}
              >
                Reference ID
              </label>
              <input
                autoComplete="off"
                className="molcit-textborder search-key"
                id="refIdtxt"
                key="txtRefId"
                onChange={this.onSearchCitations.bind(this)}
                style={{
                  height: '20px',
                  width: '170px',
                  marginLeft: '10px',
                }}
                type="text"
              />
            </div>

            <div className="molcit-div-display">
              <label
                className="molcit-citation-label"
                htmlFor="authortxt"
                key="lblAuthor"
                style={{
                  display: 'block',
                  marginLeft: '10px',
                }}
              >
                Author
              </label>
              <input
                autoComplete="off"
                className="molcit-textborder search-key"
                id="authortxt"
                key="txtAuthor"
                onChange={this.onSearchCitations.bind(this)}
                style={{
                  height: '20px',
                  width: '170px',
                  marginLeft: '10px',
                }}
                type="text"
              />
            </div>

            <div className="molcit-div-display" style={{ display: 'none' }}>
              <div className="molcit-div-display">
                <div>
                  <label
                    className="molcit-citation-label search-key"
                    htmlFor="publishedDateInput"
                    key="lblPublishedDate"
                    style={{ border: 'none', marginLeft: '10px' }}
                  >
                    Published Date
                  </label>
                </div>
                <input
                  id="publishedDateInput"
                  key="txtPulishedDate"
                  onChange={this.onSearchCitations.bind(this)}
                  style={{
                    height: '21px',
                    marginLeft: '10px',
                    width: '175px',
                  }}
                  type="date"
                />
              </div>
            </div>
            <div></div>
            <div className="molcit-searchdiv">
              <table className="molcit-tablecitations" id="myTable">
                <thead style={{ backgroundColor: 'lightgray' }}>
                  <tr className="molcit-citationrow">
                    <th className="molcit-citationsheader">Document Title</th>
                    <th className="molcit-citationsheader">Reference ID</th>
                    <th className="molcit-citationsheader">Author</th>
                    <th className="molcit-citationsheader">Published Date</th>
                  </tr>
                </thead>
                <tbody className="molcit-citationbody">
                  {this.state.citations.map((item) => (
                    <tr
                      className={
                        this.state.selectedRowRefID === item.referenceId
                          ? 'molcit-rowselected'
                          : ''
                      }
                      key={item.referenceId}
                      onClick={this.onRowClick.bind(this, item.referenceId)}
                    >
                      <td>{item.documentTitle}</td>
                      <td>{item.referenceId}</td>
                      <td>{item.author}</td>
                      <td>{item.publishedDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                float: 'right',
                marginRight: '-8px',
                marginTop: '5px',
              }}
            >
              <button
                key="btnOk"
                onClick={this._save.bind(this)}
                style={{ display: 'none', height: '27px', width: '60px' }}
              >
                OK
              </button>
            </div>
          </div>
          <div style={{ marginTop: '6px' }}>
            <button
              key="btnCancel"
              onClick={this._cancel}
              style={{
                height: '27px',
                float: 'right',
                marginTop: '1px',
                width: '60px',
              }}
            >
              Cancel
            </button>
            <button
              className="btnsave"
              key="btnOk1"
              onClick={this._save.bind(this)}
              style={{ height: '27px', float: 'right', width: '60px' }}
            >
              OK
            </button>
          </div>
        </form>
      </div>
    );
  }

  onRowClick(refId?: string): void {
    selectedRowRefID = refId;
    if (selectedRowRefID !== undefined) {
      citationObject = citations.find(
        (u) => u.referenceId === selectedRowRefID
      );

      this.setState({ selectedRowRefID, citationObject });
    }
  }

  onSearchCitations(): void {
    let filteredCitations = citations;
    const authorEle = document.getElementById('authortxt');
    const docTitleEle = document.getElementById('docTitletxt');
    const refIdEle = document.getElementById('refIdtxt');

    const filter: Pick<Citation, 'author' | 'documentTitle' | 'referenceId'> = {
      author: authorEle instanceof HTMLInputElement ? authorEle.value : '',
      documentTitle:
        docTitleEle instanceof HTMLInputElement ? docTitleEle.value : '',
      referenceId: refIdEle instanceof HTMLInputElement ? refIdEle.value : '',
    };

    filteredCitations = filteredCitations.filter((item) => {
      for (const key in filter) {
        if (
          '' !== filter[key] &&
          (item[key] === undefined ||
            item[key].toUpperCase().indexOf(filter[key].toUpperCase()) === -1)
        ) {
          return false;
        }
      }
      return true;
    });
    this.setState({
      citations: filteredCitations,
    });
  }

  _cancel = (): void => {
    this.props.close();
  };

  _save = (): void => {
    this.props.close(this.state);
  };
}
