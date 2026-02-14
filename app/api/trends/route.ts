import { NextRequest, NextResponse } from 'next/server';
import { loadPapers } from '@/lib/data';
import { computeTrends, filterPapers } from '@/lib/analytics';
import { parseGroupBy, parseMetric, parseCSV, parseInt } from '@/lib/query';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const groupBy = parseGroupBy(searchParams.get('groupBy'));
        const metric = parseMetric(searchParams.get('metric'));
        const tags = parseCSV(searchParams.get('tags'));
        const yearFrom = parseInt(searchParams.get('yearFrom'));
        const yearTo = parseInt(searchParams.get('yearTo'));

        let papers = loadPapers();

        // Apply optional filters
        if (tags.length > 0 || yearFrom || yearTo) {
            papers = filterPapers(papers, { tags, yearFrom, yearTo });
        }

        const data = computeTrends(papers, groupBy, metric);

        return NextResponse.json({
            data,
            metric,
            groupBy,
        });
    } catch (error) {
        console.error('Trends API error:', error);
        return NextResponse.json(
            { error: 'Failed to compute trends' },
            { status: 500 }
        );
    }
}
