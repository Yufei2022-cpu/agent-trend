import { z } from 'zod/v4';
import type { Paper } from '@/types';
import papersRaw from '@/data/papers.json';

// Zod schema for paper validation
const PaperSchema = z.object({
    id: z.string().default('unknown'),
    title: z.string().default('Untitled'),
    authors: z.array(z.string()).default([]),
    year: z.number().int().min(2000).max(2030).default(2023),
    month: z.number().int().min(1).max(12).default(1),
    venue: z.string().default('Unknown'),
    url: z.string().default(''),
    abstract: z.string().default(''),
    tags: z.array(z.string()).default([]),
    methods: z.array(z.string()).default([]),
    datasets: z.array(z.string()).default([]),
    citations: z.number().int().min(0).default(0),
});

const PapersArraySchema = z.array(PaperSchema);

let cachedPapers: Paper[] | null = null;
let validationErrors: string[] = [];

/**
 * Load and validate papers from the JSON file
 * Uses caching to avoid re-parsing on every request
 */
export function loadPapers(): Paper[] {
    if (cachedPapers) return cachedPapers;

    try {
        const result = PapersArraySchema.safeParse(papersRaw);

        if (result.success) {
            cachedPapers = result.data as Paper[];
        } else {
            // Log errors but try to recover by parsing each paper individually
            validationErrors = result.error.issues.map(
                (issue) => `${issue.path.join('.')}: ${issue.message}`
            );
            console.warn('Paper validation warnings:', validationErrors);

            // Parse individually with defaults for robustness
            cachedPapers = (papersRaw as unknown[]).map((raw) => {
                const parsed = PaperSchema.safeParse(raw);
                if (parsed.success) return parsed.data as Paper;
                // Return a safe default paper
                return {
                    id: 'unknown',
                    title: 'Untitled',
                    authors: [],
                    year: 2023,
                    month: 1,
                    venue: 'Unknown',
                    url: '',
                    abstract: '',
                    tags: [],
                    methods: [],
                    datasets: [],
                    citations: 0,
                };
            });
        }
    } catch (error) {
        console.error('Failed to load papers:', error);
        cachedPapers = [];
    }

    return cachedPapers;
}

/**
 * Get a single paper by ID
 */
export function getPaperById(id: string): Paper | undefined {
    return loadPapers().find((p) => p.id === id);
}

/**
 * Get all unique tags from the paper collection
 */
export function getAllTags(): string[] {
    const tags = new Set<string>();
    loadPapers().forEach((p) => p.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
}

/**
 * Get all unique methods from the paper collection
 */
export function getAllMethods(): string[] {
    const methods = new Set<string>();
    loadPapers().forEach((p) => p.methods.forEach((m) => methods.add(m)));
    return Array.from(methods).sort();
}

/**
 * Get year range from the paper collection
 */
export function getYearRange(): { min: number; max: number } {
    const papers = loadPapers();
    if (papers.length === 0) return { min: 2020, max: 2026 };
    const years = papers.map((p) => p.year);
    return { min: Math.min(...years), max: Math.max(...years) };
}

/**
 * Get any validation errors from last load
 */
export function getValidationErrors(): string[] {
    return validationErrors;
}
