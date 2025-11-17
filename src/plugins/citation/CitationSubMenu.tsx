import React from 'react';
import { EditorView } from '@tiptap/pm/view';
import scrollIntoView from 'smooth-scroll-into-view-if-needed';
import { sanitizeURL } from './sanitizeURL';
import { CitationToolButton } from './ui/CitationToolButton';
import { CitationIcon } from './ui/CitationIcon';

function isBookMarkHref(href: string): boolean {
  return !!href && href.startsWith('#') && href.length >= 2;
}

export class CitationSubMenu extends React.PureComponent {
  declare props: {
    editorView: EditorView;
    href: string;
    onCancel: (view: EditorView) => void;
    onEdit: (view: EditorView) => void;
    onRemove: (view: EditorView) => void;
    onMouseOut: () => void;
  };

  state = {
    hidden: false,
  };

  render() {
    if (!this.props) {
      throw new Error('CitationSubMenu rendered before initilizing');
    }
    const { href, onEdit, onRemove, editorView, onMouseOut } = this.props;
    const disabled = !editorView.editable;

    return (
      <button
        className="molcit-citation-submenu"
        onMouseLeave={onMouseOut}
        style={{ width: '95px', border: 'none', left: '-50px' }}
      >
        <div
          className="molcit-citation-submenu-body"
          data-testid="molcit-citation-submenu-body"
        >
          <div className="molcit-citation-submenu-row">
            <CitationToolButton
              className="molcit-citation-submenu-href link"
              icon={CitationIcon.get('link')}
              onClick={this._openLink}
              value={href}
            />
            <CitationToolButton
              disabled={disabled}
              icon={CitationIcon.get('edit')}
              onClick={onEdit}
              value={editorView}
            />
            <CitationToolButton
              disabled={disabled}
              icon={CitationIcon.get('delete')}
              onClick={onRemove}
              value={editorView}
            />
          </div>
        </div>
      </button>
    );
  }

  _openLink = (href: string): void => {
    if (isBookMarkHref(href)) {
      const id = href.substring(1);
      const el = document.getElementById(id);
      if (el) {
        const { onCancel, editorView } = this.props;
        onCancel(editorView);
        (() => {
          // https://www.npmjs.com/package/smooth-scroll-into-view-if-needed
          return scrollIntoView(el, {
            scrollMode: 'if-needed',
            // block: 'nearest',
            // inline: 'nearest',
            behavior: 'smooth',
          });
        })().catch(console.error);
      }
      return;
    }
    if (href) {
      const url = sanitizeURL(href);
      const popupString = this.props.editorView.editable
        ? 'Any unsaved changes will be lost'
        : '';

      if (this.props.editorView['runtime']?.openLinkDialog) {
        this.props.editorView['runtime']?.openLinkDialog(url, popupString);
      } else {
        window.open(url, '_blank');
      }
    }
  };
}
