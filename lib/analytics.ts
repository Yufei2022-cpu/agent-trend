import type {
    Paper,
    TrendDataPoint,
    TagDistribution,
    TagTimeSeriesPoint,
    CooccurrenceNode,
    CooccurrenceLink,
    SimilarPaper,
    Insight,
    GroupBy,
    Metric,
} from '@/types';

/**
 * Generate a period string based on groupBy
 */
function getPeriod(paper: Paper, groupBy: GroupBy): string {
    if (groupBy === 'year') return `${paper.year}`;
    return `${paper.year}-${String(paper.month).padStart(2, '0')}`;
}

/**
 * Filter papers by optional criteria
 */
export function filterPapers(
    papers: Paper[],
    opts: {
        q?: string;
        tags?: string[];
        methods?: string[];
        yearFrom?: number;
        yearTo?: number;
    }
): Paper[] {
    return papers.filter((p) => {
        if (opts.yearFrom && p.year < opts.yearFrom) return false;
        if (opts.yearTo && p.year > opts.yearTo) return false;
        if (opts.tags && opts.tags.length > 0) {
            if (!opts.tags.some((t) => p.tags.includes(t))) return false;
        }
        if (opts.methods && opts.methods.length > 0) {
            if (!opts.methods.some((m) => p.methods.includes(m))) return false;
        }
        if (opts.q) {
            const q = opts.q.toLowerCase();
            const inTitle = p.title.toLowerCase().includes(q);
            const inAbstract = p.abstract.toLowerCase().includes(q);
            const inAuthors = p.authors.some((a) => a.toLowerCase().includes(q));
            const inTags = p.tags.some((t) => t.toLowerCase().includes(q));
            const inMethods = p.methods.some((m) => m.toLowerCase().includes(q));
            if (!inTitle && !inAbstract && !inAuthors && !inTags && !inMethods) return false;
        }
        return true;
    });
}

/**
 * Compute trend data (count or citations by period)
 */
export function computeTrends(
    papers: Paper[],
    groupBy: GroupBy,
    metric: Metric
): TrendDataPoint[] {
    const map = new Map<string, number>();

    papers.forEach((p) => {
        const period = getPeriod(p, groupBy);
        const current = map.get(period) || 0;
        map.set(period, current + (metric === 'citations' ? p.citations : 1));
    });

    return Array.from(map.entries())
        .map(([period, value]) => ({ period, value }))
        .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Compute tag distribution (top N tags by paper count)
 */
export function computeTagDistribution(
    papers: Paper[],
    topN = 15
): TagDistribution[] {
    const map = new Map<string, number>();
    papers.forEach((p) => {
        p.tags.forEach((tag) => {
            map.set(tag, (map.get(tag) || 0) + 1);
        });
    });

    return Array.from(map.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, topN);
}

/**
 * Compute tag time series for heatmap
 */
export function computeTagTimeSeries(
    papers: Paper[],
    groupBy: GroupBy
): TagTimeSeriesPoint[] {
    const map = new Map<string, number>();

    papers.forEach((p) => {
        const period = getPeriod(p, groupBy);
        p.tags.forEach((tag) => {
            const key = `${tag}::${period}`;
            map.set(key, (map.get(key) || 0) + 1);
        });
    });

    return Array.from(map.entries())
        .map(([key, count]) => {
            const [tag, period] = key.split('::');
            return { tag, period, count };
        })
        .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Compute co-occurrence matrix for tags or methods
 */
export function computeCooccurrence(
    papers: Paper[],
    type: 'tags' | 'methods',
    minCount = 2
): { nodes: CooccurrenceNode[]; links: CooccurrenceLink[] } {
    const field = type === 'tags' ? 'tags' : 'methods';
    const pairMap = new Map<string, number>();
    const nodeMap = new Map<string, number>();

    papers.forEach((p) => {
        const items = p[field];
        items.forEach((item) => {
            nodeMap.set(item, (nodeMap.get(item) || 0) + 1);
        });
        // Count co-occurrences
        for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
                const pair = [items[i], items[j]].sort().join('::');
                pairMap.set(pair, (pairMap.get(pair) || 0) + 1);
            }
        }
    });

    const links: CooccurrenceLink[] = Array.from(pairMap.entries())
        .filter(([, count]) => count >= minCount)
        .map(([pair, value]) => {
            const [source, target] = pair.split('::');
            return { source, target, value };
        });

    // Only include nodes that appear in filtered links
    const linkedNodes = new Set<string>();
    links.forEach((l) => {
        linkedNodes.add(l.source);
        linkedNodes.add(l.target);
    });

    const nodes: CooccurrenceNode[] = Array.from(linkedNodes)
        .map((name) => ({
            id: name,
            name,
            value: nodeMap.get(name) || 0,
        }));

    return { nodes, links };
}

/**
 * Compute Jaccard similarity between two sets
 */
function jaccardSimilarity(a: string[], b: string[]): number {
    const setA = new Set(a);
    const setB = new Set(b);
    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    if (union.size === 0) return 0;
    return intersection.size / union.size;
}

/**
 * Find similar papers based on Jaccard similarity of tags + methods
 */
export function findSimilarPapers(
    targetPaper: Paper,
    allPapers: Paper[],
    topN = 8
): SimilarPaper[] {
    const targetFeatures = [...targetPaper.tags, ...targetPaper.methods];

    return allPapers
        .filter((p) => p.id !== targetPaper.id)
        .map((paper) => ({
            paper,
            similarity: jaccardSimilarity(
                targetFeatures,
                [...paper.tags, ...paper.methods]
            ),
        }))
        .filter((s) => s.similarity > 0)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topN);
}

/**
 * Generate trend insights from paper data
 */
export function generateInsights(papers: Paper[]): Insight[] {
    const insights: Insight[] = [];

    if (papers.length === 0) return insights;

    // 1. Fastest growing tag (compare last 2 years)
    const years = [...new Set(papers.map((p) => p.year))].sort();
    if (years.length >= 2) {
        const lastYear = years[years.length - 1];
        const prevYear = years[years.length - 2];

        const tagGrowth = new Map<string, { prev: number; last: number }>();
        papers.forEach((p) => {
            if (p.year === lastYear || p.year === prevYear) {
                p.tags.forEach((tag) => {
                    const entry = tagGrowth.get(tag) || { prev: 0, last: 0 };
                    if (p.year === lastYear) entry.last++;
                    else entry.prev++;
                    tagGrowth.set(tag, entry);
                });
            }
        });

        let fastestTag = '';
        let maxGrowthRate = 0;
        tagGrowth.forEach(({ prev, last }, tag) => {
            if (prev > 0) {
                const rate = (last - prev) / prev;
                if (rate > maxGrowthRate) {
                    maxGrowthRate = rate;
                    fastestTag = tag;
                }
            }
        });

        if (fastestTag) {
            insights.push({
                type: 'growth',
                icon: '📈',
                text: `"${fastestTag}" is the fastest-growing topic, up ${Math.round(maxGrowthRate * 100)}% from ${prevYear} to ${lastYear}.`,
                value: `+${Math.round(maxGrowthRate * 100)}%`,
            });
        }
    }

    // 2. Peak publication year
    const yearCounts = new Map<number, number>();
    papers.forEach((p) => yearCounts.set(p.year, (yearCounts.get(p.year) || 0) + 1));
    const peakYear = [...yearCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (peakYear) {
        insights.push({
            type: 'peak',
            icon: '🏔️',
            text: `${peakYear[0]} was the peak year with ${peakYear[1]} papers published.`,
            value: `${peakYear[1]} papers`,
        });
    }

    // 3. Most cited paper
    const topCited = [...papers].sort((a, b) => b.citations - a.citations)[0];
    if (topCited) {
        insights.push({
            type: 'milestone',
            icon: '🏆',
            text: `"${topCited.title}" is the most-cited paper with ${topCited.citations.toLocaleString()} citations.`,
            value: `${topCited.citations.toLocaleString()} citations`,
        });
    }

    // 4. Emerging topic (tag that appeared recently)
    const recentTags = new Map<string, number>();
    const latestYear = Math.max(...papers.map((p) => p.year));
    papers
        .filter((p) => p.year >= latestYear - 1)
        .forEach((p) => p.tags.forEach((t) => recentTags.set(t, (recentTags.get(t) || 0) + 1)));

    const olderTags = new Set<string>();
    papers
        .filter((p) => p.year < latestYear - 1)
        .forEach((p) => p.tags.forEach((t) => olderTags.add(t)));

    const emerging = [...recentTags.entries()]
        .filter(([tag]) => !olderTags.has(tag))
        .sort((a, b) => b[1] - a[1]);

    if (emerging.length > 0) {
        insights.push({
            type: 'emerging',
            icon: '🌟',
            text: `"${emerging[0][0]}" is an emerging topic, first appearing in ${latestYear - 1}-${latestYear}.`,
            value: 'New',
        });
    }

    // 5. Multi-agent is the dominant topic
    const tagDist = computeTagDistribution(papers, 1);
    if (tagDist.length > 0) {
        insights.push({
            type: 'milestone',
            icon: '🔬',
            text: `"${tagDist[0].tag}" is the most researched topic, appearing in ${tagDist[0].count} papers (${Math.round((tagDist[0].count / papers.length) * 100)}% of the collection).`,
            value: `${tagDist[0].count} papers`,
        });
    }

    return insights.slice(0, 5);
}
