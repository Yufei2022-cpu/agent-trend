'use client';

import Link from 'next/link';
import type { Paper } from '@/types';
import { useState } from 'react';

interface PaperTableProps {
    papers: Paper[];
    loading?: boolean;
    onTagClick?: (tag: string) => void;
}

type SortKey = 'title' | 'year' | 'citations' | 'venue';
type SortDir = 'asc' | 'desc';

export default function PaperTable({
    papers,
    loading = false,
    onTagClick,
}: PaperTableProps) {
    const [sortKey, setSortKey] = useState<SortKey>('year');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [page, setPage] = useState(0);
    const perPage = 10;

    const sorted = [...papers].sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortKey === 'title') return a.title.localeCompare(b.title) * dir;
        if (sortKey === 'venue') return a.venue.localeCompare(b.venue) * dir;
        if (sortKey === 'year') {
            const yearDiff = a.year - b.year;
            if (yearDiff !== 0) return yearDiff * dir;
            return (a.month - b.month) * dir;
        }
        if (sortKey === 'citations') return (a.citations - b.citations) * dir;
        return 0;
    });

    const totalPages = Math.ceil(sorted.length / perPage);
    const paginated = sorted.slice(page * perPage, (page + 1) * perPage);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
        setPage(0);
    };

    const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => (
        <span className={`ml-1 ${active ? 'text-indigo-400' : 'text-slate-600'}`}>
            {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
    );

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold gradient-text">
                    📄 Papers ({papers.length})
                </h3>
                {totalPages > 1 && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <button
                            onClick={() => setPage(Math.max(0, page - 1))}
                            disabled={page === 0}
                            className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-slate-200 dark:border-slate-700"
                        >
                            ←
                        </button>
                        <span>
                            {page + 1} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                            disabled={page >= totalPages - 1}
                            className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-slate-200 dark:border-slate-700"
                        >
                            →
                        </button>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
            ) : papers.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-slate-400 dark:text-slate-500">
                    No papers match your filters
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800">
                                <th
                                    className="text-left py-3 px-2 text-slate-500 dark:text-slate-400 font-medium cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                                    onClick={() => handleSort('title')}
                                >
                                    Title
                                    <SortIcon active={sortKey === 'title'} dir={sortDir} />
                                </th>
                                <th
                                    className="text-left py-3 px-2 text-slate-500 dark:text-slate-400 font-medium cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors whitespace-nowrap"
                                    onClick={() => handleSort('year')}
                                >
                                    Year
                                    <SortIcon active={sortKey === 'year'} dir={sortDir} />
                                </th>
                                <th
                                    className="text-left py-3 px-2 text-slate-500 dark:text-slate-400 font-medium cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                                    onClick={() => handleSort('venue')}
                                >
                                    Venue
                                    <SortIcon active={sortKey === 'venue'} dir={sortDir} />
                                </th>
                                <th className="text-left py-3 px-2 text-slate-500 dark:text-slate-400 font-medium">
                                    Tags
                                </th>
                                <th
                                    className="text-right py-3 px-2 text-slate-500 dark:text-slate-400 font-medium cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors whitespace-nowrap"
                                    onClick={() => handleSort('citations')}
                                >
                                    Citations
                                    <SortIcon active={sortKey === 'citations'} dir={sortDir} />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((paper) => (
                                <tr
                                    key={paper.id}
                                    className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                                >
                                    <td className="py-3 px-2">
                                        <Link
                                            href={`/paper/${paper.id}`}
                                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium transition-colors line-clamp-2"
                                        >
                                            {paper.title}
                                        </Link>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            {paper.authors.slice(0, 2).join(', ')}
                                            {paper.authors.length > 2 && ' et al.'}
                                        </div>
                                    </td>
                                    <td className="py-3 px-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                        {paper.year}-{String(paper.month).padStart(2, '0')}
                                    </td>
                                    <td className="py-3 px-2 text-slate-500 dark:text-slate-400">{paper.venue}</td>
                                    <td className="py-3 px-2">
                                        <div className="flex flex-wrap gap-1">
                                            {paper.tags.slice(0, 3).map((tag) => (
                                                <button
                                                    key={tag}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        onTagClick?.(tag);
                                                    }}
                                                    className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors border border-slate-200 dark:border-slate-700"
                                                >
                                                    {tag}
                                                </button>
                                            ))}
                                            {paper.tags.length > 3 && (
                                                <span className="text-xs text-slate-400 dark:text-slate-600 self-center">
                                                    +{paper.tags.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 px-2 text-right text-slate-700 dark:text-slate-300 font-mono">
                                        {paper.citations.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
