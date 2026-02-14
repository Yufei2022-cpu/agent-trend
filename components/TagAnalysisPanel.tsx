'use client';

import { useMemo } from 'react';
import { useTheme } from 'next-themes';
import type { Paper } from '@/types';

interface TagAnalysisPanelProps {
    papers: Paper[];
    selectedTags: string[];
    loading: boolean;
}

export default function TagAnalysisPanel({ papers, selectedTags, loading }: TagAnalysisPanelProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const analysis = useMemo(() => {
        if (selectedTags.length === 0 || papers.length === 0) return null;

        const filtered = papers.filter(p => selectedTags.some(t => p.tags.includes(t)));
        if (filtered.length === 0) return null;

        // 1. Basic stats
        const totalPapers = filtered.length;
        const totalCitations = filtered.reduce((s, p) => s + p.citations, 0);
        const avgCitations = Math.round(totalCitations / totalPapers);
        const maxCitations = Math.max(...filtered.map(p => p.citations));

        // 2. Venue distribution (top 8)
        const venueMap = new Map<string, number>();
        filtered.forEach(p => venueMap.set(p.venue, (venueMap.get(p.venue) || 0) + 1));
        const topVenues = [...venueMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        // 3. Year trend
        const yearMap = new Map<number, number>();
        filtered.forEach(p => yearMap.set(p.year, (yearMap.get(p.year) || 0) + 1));
        const yearTrend = [...yearMap.entries()].sort((a, b) => a[0] - b[0]);

        // 4. Top authors (by paper count)
        const authorMap = new Map<string, number>();
        filtered.forEach(p => p.authors.forEach(a => authorMap.set(a, (authorMap.get(a) || 0) + 1)));
        const topAuthors = [...authorMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        // 5. Related methods
        const methodMap = new Map<string, number>();
        filtered.forEach(p => p.methods.forEach(m => methodMap.set(m, (methodMap.get(m) || 0) + 1)));
        const topMethods = [...methodMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        // 6. Related tags (excluding selected ones)
        const relatedTagMap = new Map<string, number>();
        filtered.forEach(p => p.tags.forEach(t => {
            if (!selectedTags.includes(t)) {
                relatedTagMap.set(t, (relatedTagMap.get(t) || 0) + 1);
            }
        }));
        const relatedTags = [...relatedTagMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        // 7. Most cited papers in this tag
        const topCited = [...filtered]
            .sort((a, b) => b.citations - a.citations)
            .slice(0, 5);

        // 8. Growth rate
        const years = [...yearMap.keys()].sort();
        let growthRate: number | null = null;
        if (years.length >= 2) {
            const lastYear = years[years.length - 1];
            const prevYear = years[years.length - 2];
            const lastCount = yearMap.get(lastYear) || 0;
            const prevCount = yearMap.get(prevYear) || 0;
            if (prevCount > 0) {
                growthRate = Math.round(((lastCount - prevCount) / prevCount) * 100);
            }
        }

        return {
            totalPapers, totalCitations, avgCitations, maxCitations,
            topVenues, yearTrend, topAuthors, topMethods, relatedTags, topCited, growthRate,
        };
    }, [papers, selectedTags]);

    if (selectedTags.length === 0) return null;
    if (loading) {
        return (
            <div className="card animate-pulse">
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-4"></div>
                <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
        );
    }
    if (!analysis) return null;

    const maxYearCount = Math.max(...analysis.yearTrend.map(([, c]) => c));
    const maxVenueCount = analysis.topVenues[0]?.[1] || 1;

    return (
        <div className="card space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold gradient-text">
                    📊 Tag Deep Analysis: {selectedTags.map(t => `"${t}"`).join(' + ')}
                </h3>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                    {analysis.totalPapers} papers matched
                </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Papers', value: analysis.totalPapers, icon: '📄', color: 'from-indigo-500/20 to-indigo-600/10' },
                    { label: 'Total Citations', value: analysis.totalCitations.toLocaleString(), icon: '⭐', color: 'from-amber-500/20 to-amber-600/10' },
                    { label: 'Avg Citations', value: analysis.avgCitations, icon: '📈', color: 'from-emerald-500/20 to-emerald-600/10' },
                    { label: 'YoY Growth', value: analysis.growthRate !== null ? `${analysis.growthRate > 0 ? '+' : ''}${analysis.growthRate}%` : 'N/A', icon: analysis.growthRate !== null && analysis.growthRate > 0 ? '🚀' : '📊', color: 'from-purple-500/20 to-purple-600/10' },
                ].map((stat) => (
                    <div key={stat.label} className={`rounded-xl p-4 bg-gradient-to-br ${stat.color} border border-slate-200 dark:border-slate-700/50`}>
                        <div className="text-2xl mb-1">{stat.icon}</div>
                        <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{stat.value}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Two columns: Venues + Year Trend */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Venue Distribution */}
                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">🏛️ Top Venues</h4>
                    <div className="space-y-2">
                        {analysis.topVenues.map(([venue, count]) => (
                            <div key={venue} className="flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs text-slate-700 dark:text-slate-300 truncate">{venue}</div>
                                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                            style={{ width: `${(count / maxVenueCount) * 100}%` }}
                                        />
                                    </div>
                                </div>
                                <span className="text-xs font-mono text-slate-400 dark:text-slate-500 w-8 text-right">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Year Trend Mini Bar Chart */}
                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">📅 Yearly Trend</h4>
                    <div className="flex items-end gap-1.5 h-32">
                        {analysis.yearTrend.map(([year, count]) => (
                            <div key={year} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{count}</span>
                                <div
                                    className="w-full rounded-t-md bg-gradient-to-t from-indigo-600 to-indigo-400 dark:from-indigo-500 dark:to-indigo-300 transition-all duration-500"
                                    style={{ height: `${Math.max((count / maxYearCount) * 100, 5)}%` }}
                                />
                                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-500">{String(year).slice(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Two columns: Top Authors + Methods & Related Tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Authors */}
                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">👥 Prolific Authors</h4>
                    <div className="flex flex-wrap gap-2">
                        {analysis.topAuthors.map(([author, count]) => (
                            <span key={author} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50">
                                {author}
                                <span className="text-[10px] font-bold text-indigo-500">{count}</span>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Methods & Related Tags */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">🛠️ Methods Used</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {analysis.topMethods.map(([method, count]) => (
                                <span key={method} className="px-2 py-1 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                                    {method} ({count})
                                </span>
                            ))}
                        </div>
                    </div>
                    {analysis.relatedTags.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">🔗 Related Tags</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {analysis.relatedTags.map(([tag, count]) => (
                                    <span key={tag} className="tag-pill">
                                        {tag} ({count})
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Most Cited Papers */}
            <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">🏆 Most Cited Papers</h4>
                <div className="space-y-2">
                    {analysis.topCited.map((paper, i) => (
                        <div key={paper.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 hover:border-indigo-500/30 transition-colors">
                            <span className="text-lg font-bold text-slate-300 dark:text-slate-600 w-6 text-center">{i + 1}</span>
                            <div className="flex-1 min-w-0 space-y-1">
                                <a
                                    href={paper.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors line-clamp-1"
                                >
                                    {paper.title}
                                </a>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                    {paper.authors.slice(0, 3).join(', ')} • {paper.venue} • {paper.year}
                                </div>
                            </div>
                            <span className="flex-shrink-0 text-xs font-bold text-amber-500 dark:text-amber-400">
                                ⭐ {paper.citations.toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
