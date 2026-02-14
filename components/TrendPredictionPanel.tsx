'use client';

import { useMemo } from 'react';
import { useTheme } from 'next-themes';
import type { Paper } from '@/types';

interface TrendPredictionPanelProps {
    papers: Paper[];
    loading: boolean;
}

interface PredictionItem {
    direction: string;
    score: number;       // 0-100 composite score
    momentum: string;    // 'rising' | 'stable' | 'declining'
    reason: string;
    topVenues: string[];
    paperCount: number;
    avgCitations: number;
    growthPct: number;
}

// List of top-tier venues for AI research
const TOP_VENUES = new Set([
    'arXiv', 'NeurIPS', 'ICML', 'ICLR', 'ACL', 'EMNLP', 'NAACL',
    'AAAI', 'IJCAI', 'CVPR', 'ICCV', 'ECCV', 'KDD', 'WWW',
    'Nature', 'Science', 'Nature Machine Intelligence',
    'IEEE Transactions on Pattern Analysis and Machine Intelligence',
    'Artificial Intelligence', 'Journal of Machine Learning Research',
    'SIGIR', 'CIKM', 'WSDM', 'CHI', 'UIST',
]);

function isTopVenue(venue: string): boolean {
    const v = venue.toLowerCase();
    for (const tv of TOP_VENUES) {
        if (v.includes(tv.toLowerCase())) return true;
    }
    return false;
}

export default function TrendPredictionPanel({ papers, loading }: TrendPredictionPanelProps) {
    const { theme } = useTheme();

    const predictions = useMemo(() => {
        if (papers.length === 0) return [];

        const years = [...new Set(papers.map(p => p.year))].sort();
        if (years.length < 2) return [];

        const latestYear = years[years.length - 1];
        const prevYear = years[years.length - 2];
        const olderYear = years.length >= 3 ? years[years.length - 3] : null;

        // Analyze each tag
        const tagAnalysis = new Map<string, {
            total: number;
            latest: number;
            prev: number;
            older: number;
            citations: number;
            topVenuePapers: number;
            venues: Map<string, number>;
            recentPapers: Paper[];
        }>();

        papers.forEach(p => {
            p.tags.forEach(tag => {
                if (!tagAnalysis.has(tag)) {
                    tagAnalysis.set(tag, {
                        total: 0, latest: 0, prev: 0, older: 0,
                        citations: 0, topVenuePapers: 0,
                        venues: new Map(), recentPapers: [],
                    });
                }
                const a = tagAnalysis.get(tag)!;
                a.total++;
                a.citations += p.citations;
                if (p.year === latestYear) a.latest++;
                else if (p.year === prevYear) a.prev++;
                else if (olderYear && p.year === olderYear) a.older++;
                if (isTopVenue(p.venue)) a.topVenuePapers++;
                a.venues.set(p.venue, (a.venues.get(p.venue) || 0) + 1);
                if (p.year >= prevYear) a.recentPapers.push(p);
            });
        });

        const results: PredictionItem[] = [];

        tagAnalysis.forEach((a, tag) => {
            if (a.total < 3) return; // Skip rare tags

            // Growth rate (latest vs prev)
            const growthPct = a.prev > 0
                ? Math.round(((a.latest - a.prev) / a.prev) * 100)
                : (a.latest > 0 ? 100 : 0);

            // Acceleration (is growth accelerating?)
            let acceleration = 0;
            if (olderYear && a.older > 0 && a.prev > 0) {
                const prevGrowth = (a.prev - a.older) / a.older;
                const currGrowth = (a.latest - a.prev) / a.prev;
                acceleration = currGrowth - prevGrowth;
            }

            // Momentum
            let momentum: 'rising' | 'stable' | 'declining';
            if (growthPct > 20) momentum = 'rising';
            else if (growthPct >= -10) momentum = 'stable';
            else momentum = 'declining';

            // Citation velocity (avg citations for recent papers)
            const avgCitations = a.total > 0 ? Math.round(a.citations / a.total) : 0;

            // Top venue acceptance ratio
            const topVenueRatio = a.total > 0 ? a.topVenuePapers / a.total : 0;

            // Composite score (0-100)
            // Factors: growth momentum (40%), citation velocity (25%), top venue ratio (20%), acceleration (15%)
            const growthScore = Math.min(Math.max(growthPct + 50, 0), 100); // Normalize to 0-100
            const citationScore = Math.min(avgCitations / 10, 100); // Normalize
            const venueScore = topVenueRatio * 100;
            const accelScore = Math.min(Math.max((acceleration + 1) * 50, 0), 100);

            const compositeScore = Math.round(
                growthScore * 0.40 +
                citationScore * 0.25 +
                venueScore * 0.20 +
                accelScore * 0.15
            );

            // Top venues for this tag
            const topVenues = [...a.venues.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([v]) => v);

            // Generate reason
            let reason = '';
            if (momentum === 'rising' && topVenueRatio > 0.3) {
                reason = `Strong growth (${growthPct > 0 ? '+' : ''}${growthPct}%) with high top-venue acceptance. Hot area for submissions.`;
            } else if (momentum === 'rising') {
                reason = `Rapidly growing topic (${growthPct > 0 ? '+' : ''}${growthPct}% YoY). Early mover advantage for top venue submissions.`;
            } else if (momentum === 'stable' && avgCitations > 50) {
                reason = `Mature research area with strong citation impact. Reliable path to publication.`;
            } else if (momentum === 'stable') {
                reason = `Steady research area. Novel angles or cross-topic work may improve acceptance odds.`;
            } else {
                reason = `Declining momentum. Consider combining with trending topics for better reception.`;
            }

            results.push({
                direction: tag,
                score: compositeScore,
                momentum,
                reason,
                topVenues,
                paperCount: a.total,
                avgCitations,
                growthPct,
            });
        });

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, 8);
    }, [papers]);

    if (loading) {
        return (
            <div className="card animate-pulse">
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-4"></div>
                <div className="h-60 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
        );
    }

    if (predictions.length === 0) return null;

    const maxScore = predictions[0]?.score || 100;

    const momentumIcons: Record<string, { icon: string; color: string; bg: string }> = {
        rising: { icon: '🔥', color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
        stable: { icon: '➡️', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
        declining: { icon: '📉', color: 'text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
    };

    return (
        <div className="card space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold gradient-text">
                        🔮 Trend Prediction: Where to Publish Next
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        Based on growth momentum, citation velocity, and top-venue acceptance rates
                    </p>
                </div>
                <div className="hidden sm:flex items-center gap-3 text-[10px]">
                    {Object.entries(momentumIcons).map(([key, { icon, bg }]) => (
                        <span key={key} className={`px-2 py-1 rounded-full ${bg}`}>
                            {icon} {key}
                        </span>
                    ))}
                </div>
            </div>

            {/* Prediction Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {predictions.map((pred, i) => {
                    const mi = momentumIcons[pred.momentum];
                    const barWidth = Math.max((pred.score / maxScore) * 100, 8);
                    const isTop3 = i < 3;

                    return (
                        <div
                            key={pred.direction}
                            className={`relative rounded-xl p-4 border transition-all hover:shadow-lg ${isTop3
                                    ? 'bg-gradient-to-br from-indigo-50/80 to-purple-50/50 dark:from-indigo-900/20 dark:to-purple-900/10 border-indigo-200 dark:border-indigo-800/50'
                                    : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/50'
                                }`}
                        >
                            {/* Rank badge */}
                            {isTop3 && (
                                <div className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                                    {i + 1}
                                </div>
                            )}

                            <div className="space-y-3">
                                {/* Title + Momentum */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                            {pred.direction}
                                        </span>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${mi.bg} ${mi.color}`}>
                                            {mi.icon} {pred.momentum}
                                        </span>
                                    </div>
                                    <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                                        {pred.score}
                                    </span>
                                </div>

                                {/* Score bar */}
                                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${isTop3
                                                ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
                                                : 'bg-gradient-to-r from-slate-400 to-slate-500 dark:from-slate-500 dark:to-slate-400'
                                            }`}
                                        style={{ width: `${barWidth}%` }}
                                    />
                                </div>

                                {/* Metrics */}
                                <div className="flex items-center gap-4 text-[10px] text-slate-500 dark:text-slate-400">
                                    <span>📄 {pred.paperCount} papers</span>
                                    <span>⭐ {pred.avgCitations} avg cites</span>
                                    <span className={pred.growthPct > 0 ? 'text-emerald-500' : pred.growthPct < 0 ? 'text-red-400' : ''}>
                                        {pred.growthPct > 0 ? '↑' : pred.growthPct < 0 ? '↓' : '→'} {Math.abs(pred.growthPct)}% YoY
                                    </span>
                                </div>

                                {/* Reason */}
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {pred.reason}
                                </p>

                                {/* Top Venues */}
                                <div className="flex flex-wrap gap-1">
                                    {pred.topVenues.map(v => (
                                        <span key={v} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50 truncate max-w-[140px]">
                                            {v}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Disclaimer */}
            <div className="text-[10px] text-slate-400 dark:text-slate-600 text-center italic pt-2 border-t border-slate-200 dark:border-slate-700/50">
                ⚠️ Predictions are based on historical trend analysis and should be used as directional guidance only. Actual acceptance depends on paper quality, novelty, and reviewer preferences.
            </div>
        </div>
    );
}
