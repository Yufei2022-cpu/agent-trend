import { NextRequest, NextResponse } from 'next/server';
import { loadPapers } from '@/lib/data';
import { computeCooccurrence } from '@/lib/analytics';
import { parseCooccurrenceType, parseInt } from '@/lib/query';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = parseCooccurrenceType(searchParams.get('type'));
        const min = parseInt(searchParams.get('min'), 2) ?? 2;

        const papers = loadPapers();
        const { nodes, links } = computeCooccurrence(papers, type, min);

        return NextResponse.json({
            nodes,
            links,
            type,
        });
    } catch (error) {
        console.error('Cooccurrence API error:', error);
        return NextResponse.json(
            { error: 'Failed to compute co-occurrence data' },
            { status: 500 }
        );
    }
}
