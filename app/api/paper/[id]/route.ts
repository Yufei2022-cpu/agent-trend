import { NextRequest, NextResponse } from 'next/server';
import { getPaperById } from '@/lib/data';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const paper = getPaperById(id);

        if (!paper) {
            return NextResponse.json(
                { error: 'Paper not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(paper);
    } catch (error) {
        console.error('Paper API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch paper' },
            { status: 500 }
        );
    }
}
