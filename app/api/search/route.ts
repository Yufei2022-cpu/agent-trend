import { NextRequest, NextResponse } from 'next/server';
import { loadPapers } from '@/lib/data';
import { filterPapers } from '@/lib/analytics';
import { parseSearchParams } from '@/lib/query';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filters = parseSearchParams(searchParams);

        const allPapers = loadPapers();
        const papers = filterPapers(allPapers, filters);

        return NextResponse.json({
            papers,
            total: papers.length,
        });
    } catch (error) {
        console.error('Search API error:', error);
        return NextResponse.json(
            { error: 'Failed to search papers' },
            { status: 500 }
        );
    }
}
