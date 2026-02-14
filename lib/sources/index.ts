import type { Paper } from '@/types';

/**
 * Abstract interface for paper data sources.
 * Implement this interface to add new data sources
 * (e.g., arXiv, Semantic Scholar, OpenAlex).
 *
 * Usage:
 *   const source: PaperSource = new ArxivSource();
 *   const papers = await source.fetchPapers({ query: 'AI agent' });
 */
export interface FetchParams {
    query?: string;
    tags?: string[];
    yearFrom?: number;
    yearTo?: number;
    maxResults?: number;
    offset?: number;
}

export interface PaperSource {
    /** Human-readable name of the data source */
    name: string;

    /** Fetch papers matching the given parameters */
    fetchPapers(params: FetchParams): Promise<Paper[]>;

    /** Search for papers by query string */
    searchPapers(query: string, maxResults?: number): Promise<Paper[]>;

    /** Get a single paper by its source-specific ID */
    getPaper(id: string): Promise<Paper | null>;
}

/**
 * Mock implementation that reads from local JSON.
 * This is the default data source used in the MVP.
 */
export class MockPaperSource implements PaperSource {
    name = 'Mock (Local JSON)';

    async fetchPapers(): Promise<Paper[]> {
        // Dynamic import to avoid circular dependencies
        const { loadPapers } = await import('@/lib/data');
        return loadPapers();
    }

    async searchPapers(query: string): Promise<Paper[]> {
        const { loadPapers } = await import('@/lib/data');
        const { filterPapers } = await import('@/lib/analytics');
        return filterPapers(loadPapers(), { q: query });
    }

    async getPaper(id: string): Promise<Paper | null> {
        const { getPaperById } = await import('@/lib/data');
        return getPaperById(id) || null;
    }
}

// Example stubs for future implementations:

// export class ArxivSource implements PaperSource {
//   name = 'arXiv';
//   async fetchPapers(params: FetchParams): Promise<Paper[]> {
//     // Use ARXIV_API_URL from .env
//     // Fetch from http://export.arxiv.org/api/query
//     // Parse XML response
//     // Map to Paper interface
//     throw new Error('Not implemented');
//   }
//   async searchPapers(query: string): Promise<Paper[]> { ... }
//   async getPaper(id: string): Promise<Paper | null> { ... }
// }

// export class SemanticScholarSource implements PaperSource {
//   name = 'Semantic Scholar';
//   async fetchPapers(params: FetchParams): Promise<Paper[]> {
//     // Use SEMANTIC_SCHOLAR_API_KEY from .env
//     // Fetch from https://api.semanticscholar.org/graph/v1/paper/search
//     throw new Error('Not implemented');
//   }
//   ...
// }

// export class OpenAlexSource implements PaperSource {
//   name = 'OpenAlex';
//   async fetchPapers(params: FetchParams): Promise<Paper[]> {
//     // Use OPENALEX_API_URL from .env
//     // Fetch from https://api.openalex.org/works
//     throw new Error('Not implemented');
//   }
//   ...
// }
