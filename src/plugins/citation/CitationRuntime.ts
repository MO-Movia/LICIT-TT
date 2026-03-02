/**
 * @license MIT
 * @copyright Copyright 2025 Modus Operandi Inc. All Rights Reserved.
 */

// This implements the interface of `EditorRuntime`.
// To  run  editor directly:
import type { Citation } from './Types';
import { POST, GET, DELETE } from './http';

const TYPE_JSON = 'application/json; charset=utf-8';

export class CitationRuntime {
  /**
   * Cached styles fetched from the service to avoid saturating
   * service with HTTP requests.
   * @private
   */
  citations: Citation[] = [];
  citationByRefId?: Citation;

  constructor(private readonly citationServerURI?: string) {}

  buildRouteForCitation(...path: string[]): string {
    return [this.citationServerURI, ...path].join('/');
  }

  /**
   * Save or update a citation on the service.
   *
   * @param citation Citation to update.
   * @return Updated array of citations.
   */
  async saveCitation(citation: Citation): Promise<Citation[]> {
    if (!this.citationServerURI) {
      return null;
    }
    const url = this.buildRouteForCitation('citations');
    return await POST(url, JSON.stringify(citation), TYPE_JSON).then(
      (_data) => {
        // Refresh from server after save
        return this.fetchCitations().catch(() => this.citations);
      }
    );
  }

  /**
   * Fetch list of citations.
   *
   * @returns Array of citations or empty array
   */
  fetchCitations(): Promise<Citation[]> {
    if (!this.citationServerURI) {
      return null;
    }
    const url = this.buildRouteForCitation('citations');
    return GET(url).then(
      (data: string) => {
        const citations = JSON.parse(data) as Citation[];
        this.citations = citations;
        return citations;
      },
      (_err) => {
        return null;
      }
    );
  }

  fetchCitationsByRefId(referenceId: string): Promise<Citation> {
    if (!this.citationServerURI) {
      return null;
    }
    const url = this.buildRouteForCitation(
      'citations',
      encodeURIComponent(referenceId)
    );

    return GET(url).then(
      (data: string) => {
        const citation = JSON.parse(data) as Citation;
        this.citationByRefId = citation;
        return citation;
      },
      (_err) => {
        return null;
      }
    );
  }

  /**
   * Fetch list of citations.
   *
   * @returns Array of citations or empty array
   */
  async getCitationsAsync(): Promise<Citation[]> {
    if (this.isArrEmpty()) {
      await this.fetchCitations();
    }
    return this.citations;
  }

  isArrEmpty() {
    return !this.citations;
  }

  /**
   * Remove an existing citation from the service.
   * @param referenceId unique id of citation to delete
   */
  async removeCitation(referenceId: string): Promise<Citation[]> {
    if (!this.citationServerURI) {
      return null;
    }
    const url = this.buildRouteForCitation(
      'citations',
      encodeURIComponent(referenceId)
    );
    await DELETE(url, 'text/plain').then((_data) => {
      // Refresh from server after remove
      return this.fetchCitations().catch(() => null);
    });

    return this.citations;
  }
}
