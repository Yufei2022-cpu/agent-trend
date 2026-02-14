import { NextRequest, NextResponse } from 'next/server';
import { getPaperById, loadPapers } from '@/lib/data';
import { findSimilarPapers } from '@/lib/analytics';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Missing id parameter' },
                { status: 400 }
            );
        }

        const paper = getPaperById(id);

        if (!paper) {
            return NextResponse.json(
                { error: 'Paper not found' },
                { status: 404 }
            );
        }

        const allPapers = loadPapers();
        const similar = findSimilarPapers(paper, allPapers);

        return NextResponse.json({
            source: paper,
            similar,
        });
    } catch (error) {
        console.error('Similar API error:', error);
        return NextResponse.json(
            { error: 'Failed to find similar papers' },
            { status: 500 }
        );
    }
}
