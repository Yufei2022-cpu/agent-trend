import { NextRequest, NextResponse } from 'next/server';
import { loadPapers } from '@/lib/data';
import { computeTagDistribution, computeTagTimeSeries, filterPapers } from '@/lib/analytics';
import { parseGroupBy, parseInt } from '@/lib/query';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const groupBy = parseGroupBy(searchParams.get('groupBy'));
        const yearFrom = parseInt(searchParams.get('yearFrom'));
        const yearTo = parseInt(searchParams.get('yearTo'));

        let papers = loadPapers();

        if (yearFrom || yearTo) {
            papers = filterPapers(papers, { yearFrom, yearTo });
        }

        const distribution = computeTagDistribution(papers);
        const timeSeries = computeTagTimeSeries(papers, groupBy);

        return NextResponse.json({
            distribution,
            timeSeries,
            groupBy,
        });
    } catch (error) {
        console.error('Tags API error:', error);
        return NextResponse.json(
            { error: 'Failed to compute tag data' },
            { status: 500 }
        );
    }
}
