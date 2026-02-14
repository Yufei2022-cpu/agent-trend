import type { GroupBy, Metric, CooccurrenceType } from '@/types';

/**
 * Parse groupBy parameter with default
 */
export function parseGroupBy(value: string | null): GroupBy {
    if (value === 'year' || value === 'month') return value;
    return 'month';
}

/**
 * Parse metric parameter with default
 */
export function parseMetric(value: string | null): Metric {
    if (value === 'count' || value === 'citations') return value;
    return 'count';
}

/**
 * Parse cooccurrence type parameter with default
 */
export function parseCooccurrenceType(value: string | null): CooccurrenceType {
    if (value === 'tags' || value === 'methods') return value;
    return 'tags';
}

/**
 * Parse comma-separated string to array
 */
export function parseCSV(value: string | null): string[] {
    if (!value) return [];
    return value.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Parse integer with optional default
 */
export function parseInt(value: string | null, defaultValue?: number): number | undefined {
    if (!value) return defaultValue;
    const n = Number(value);
    if (isNaN(n)) return defaultValue;
    return Math.floor(n);
}

/**
 * Parse search parameters from URL search params
 */
export function parseSearchParams(searchParams: URLSearchParams): {
    q?: string;
    tags?: string[];
    methods?: string[];
    yearFrom?: number;
    yearTo?: number;
} {
    return {
        q: searchParams.get('q') || undefined,
        tags: parseCSV(searchParams.get('tags')),
        methods: parseCSV(searchParams.get('methods')),
        yearFrom: parseInt(searchParams.get('yearFrom')),
        yearTo: parseInt(searchParams.get('yearTo')),
    };
}
