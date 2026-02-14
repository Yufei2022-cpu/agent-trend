// ===== Paper Types =====
export interface Paper {
    id: string;
    title: string;
    authors: string[];
    year: number;
    month: number;
    venue: string;
    url: string;
    abstract: string;
    tags: string[];
    methods: string[];
    datasets: string[];
    citations: number;
}

// ===== API Request Types =====
export type GroupBy = 'month' | 'year';
export type Metric = 'count' | 'citations';
export type CooccurrenceType = 'tags' | 'methods';

export interface TrendParams {
    groupBy: GroupBy;
    metric: Metric;
    tags?: string[];
    yearFrom?: number;
    yearTo?: number;
}

export interface TagParams {
    groupBy: GroupBy;
    yearFrom?: number;
    yearTo?: number;
}

export interface CooccurrenceParams {
    type: CooccurrenceType;
    min: number;
}

export interface SearchParams {
    q?: string;
    tags?: string[];
    yearFrom?: number;
    yearTo?: number;
    methods?: string[];
}

// ===== API Response Types =====
export interface TrendDataPoint {
    period: string; // "2023-01" or "2023"
    value: number;
}

export interface TrendResponse {
    data: TrendDataPoint[];
    metric: Metric;
    groupBy: GroupBy;
}

export interface TagDistribution {
    tag: string;
    count: number;
}

export interface TagTimeSeriesPoint {
    period: string;
    tag: string;
    count: number;
}

export interface TagsResponse {
    distribution: TagDistribution[];
    timeSeries: TagTimeSeriesPoint[];
    groupBy: GroupBy;
}

export interface CooccurrenceNode {
    id: string;
    name: string;
    value: number; // frequency
}

export interface CooccurrenceLink {
    source: string;
    target: string;
    value: number; // co-occurrence count
}

export interface CooccurrenceResponse {
    nodes: CooccurrenceNode[];
    links: CooccurrenceLink[];
    type: CooccurrenceType;
}

export interface SearchResponse {
    papers: Paper[];
    total: number;
}

export interface SimilarPaper {
    paper: Paper;
    similarity: number;
}

export interface SimilarResponse {
    source: Paper;
    similar: SimilarPaper[];
}

// ===== Insight Types =====
export interface Insight {
    type: 'growth' | 'peak' | 'emerging' | 'declining' | 'milestone';
    icon: string;
    text: string;
    value?: string;
}

// ===== Filter State =====
export interface FilterState {
    q: string;
    tags: string[];
    yearFrom: number;
    yearTo: number;
}
