'use client';

import { useMemo } from 'react';
import type { Paper } from '@/types';

interface ResearchAdvisorPanelProps {
    papers: Paper[];
    allPapers: Paper[];   // unfiltered, for context comparison
    selectedTags: string[];
    loading: boolean;
}

interface SubTopic {
    name: string;
    count: number;
    growth: number;      // YoY growth %
    avgCitations: number;
    isHot: boolean;
}

interface MethodGap {
    method: string;
    globalUsage: number;   // % of all papers using this method
    tagUsage: number;      // % of tag papers using this method
    gap: number;           // globalUsage - tagUsage (positive = underexplored)
    opportunity: string;
}

interface CrossOpportunity {
    tag: string;
    overlap: number;       // papers with both tags
    total: number;         // papers with the other tag
    overlapPct: number;
    trend: 'emerging' | 'established' | 'rare';
    suggestion: string;
}

interface TopicSuggestion {
    title: string;
    confidence: 'high' | 'medium';
    reasoning: string;
    relatedMethods: string[];
    targetVenues: string[];
}

const TOP_VENUES = new Set([
    'NeurIPS', 'ICML', 'ICLR', 'ACL', 'EMNLP', 'NAACL',
    'AAAI', 'IJCAI', 'CVPR', 'ICCV', 'ECCV', 'KDD', 'WWW',
    'SIGIR', 'CIKM', 'WSDM', 'CHI', 'UIST',
    'Nature', 'Science', 'IEEE', 'ACM',
    // Add other relevant ones from data if needed
]);

function isTopVenue(venue: string | undefined | null): boolean {
    if (!venue) return false;
    const v = venue.toLowerCase();
    for (const tv of TOP_VENUES) {
        if (v.includes(tv.toLowerCase())) return true;
    }
    return false;
}

export default function ResearchAdvisorPanel({ papers, allPapers, selectedTags, loading }: ResearchAdvisorPanelProps) {
    const analysis = useMemo(() => {
        if (selectedTags.length === 0 || papers.length === 0 || allPapers.length === 0) return null;

        const tagPapers = papers.filter(p => selectedTags.some(t => p.tags.includes(t)));
        if (tagPapers.length < 3) return null;

        const years = [...new Set(allPapers.map(p => p.year))].sort();
        const latestYear = years[years.length - 1];
        const prevYear = years.length >= 2 ? years[years.length - 2] : null;

        // ========== 1. Sub-topic analysis ==========
        // Find co-occurring tags as "sub-topics" within the selected tag
        const subTopicMap = new Map<string, { count: number; latest: number; prev: number; citations: number }>();
        tagPapers.forEach(p => {
            p.tags.forEach(t => {
                if (selectedTags.includes(t)) return;
                if (!subTopicMap.has(t)) subTopicMap.set(t, { count: 0, latest: 0, prev: 0, citations: 0 });
                const st = subTopicMap.get(t)!;
                st.count++;
                st.citations += p.citations;
                if (p.year === latestYear) st.latest++;
                if (prevYear && p.year === prevYear) st.prev++;
            });
            // Also analyze methods as sub-topics
            p.methods.forEach(m => {
                const key = `⚙️${m}`;
                if (!subTopicMap.has(key)) subTopicMap.set(key, { count: 0, latest: 0, prev: 0, citations: 0 });
                const st = subTopicMap.get(key)!;
                st.count++;
                st.citations += p.citations;
                if (p.year === latestYear) st.latest++;
                if (prevYear && p.year === prevYear) st.prev++;
            });
        });

        const subTopics: SubTopic[] = [...subTopicMap.entries()]
            .filter(([, v]) => v.count >= 2)
            .map(([name, v]) => {
                const growth = v.prev > 0 ? Math.round(((v.latest - v.prev) / v.prev) * 100) : (v.latest > 0 ? 100 : 0);
                return {
                    name,
                    count: v.count,
                    growth,
                    avgCitations: Math.round(v.citations / v.count),
                    isHot: growth > 30 && v.latest >= 2,
                };
            })
            .sort((a, b) => b.growth - a.growth)
            .slice(0, 12);

        // ========== 2. Methodological gaps ==========
        // Compare method usage in tag papers vs global
        const globalMethodMap = new Map<string, number>();
        allPapers.forEach(p => p.methods.forEach(m => globalMethodMap.set(m, (globalMethodMap.get(m) || 0) + 1)));

        const tagMethodMap = new Map<string, number>();
        tagPapers.forEach(p => p.methods.forEach(m => tagMethodMap.set(m, (tagMethodMap.get(m) || 0) + 1)));

        const methodGaps: MethodGap[] = [...globalMethodMap.entries()]
            .map(([method, globalCount]) => {
                const globalUsage = Math.round((globalCount / allPapers.length) * 100);
                const tagCount = tagMethodMap.get(method) || 0;
                const tagUsage = Math.round((tagCount / tagPapers.length) * 100);
                const gap = globalUsage - tagUsage;

                let opportunity = '';
                if (gap > 15) {
                    opportunity = `"${method}" is widely used in AI agent research (${globalUsage}%) but underexplored in ${selectedTags.join('+')} (${tagUsage}%). Strong opportunity for novel contributions.`;
                } else if (gap > 5) {
                    opportunity = `Moderate gap — "${method}" could be better integrated with ${selectedTags.join('+')} work.`;
                } else if (gap < -10) {
                    opportunity = `"${method}" is already heavily used here (${tagUsage}%) — consider more novel methodological choices.`;
                } else {
                    opportunity = `Well-balanced usage. Consider combining with other methods for differentiation.`;
                }

                return { method, globalUsage, tagUsage, gap, opportunity };
            })
            .filter(g => g.globalUsage >= 5) // Only meaningful methods
            .sort((a, b) => b.gap - a.gap)
            .slice(0, 6);

        // ========== 3. Cross-topic opportunities ==========
        const crossMap = new Map<string, { overlap: number; total: number }>();
        allPapers.forEach(p => {
            const hasSelectedTag = selectedTags.some(t => p.tags.includes(t));
            p.tags.forEach(t => {
                if (selectedTags.includes(t)) return;
                if (!crossMap.has(t)) crossMap.set(t, { overlap: 0, total: 0 });
                const c = crossMap.get(t)!;
                c.total++;
                if (hasSelectedTag) c.overlap++;
            });
        });

        const crossOpportunities: CrossOpportunity[] = [...crossMap.entries()]
            .filter(([, v]) => v.total >= 5)
            .map(([tag, v]) => {
                const overlapPct = Math.round((v.overlap / v.total) * 100);
                let trend: 'emerging' | 'established' | 'rare';
                let suggestion: string;

                if (overlapPct >= 30) {
                    trend = 'established';
                    suggestion = `Already well-studied combination. Need a very novel angle or strong empirical contribution to stand out.`;
                } else if (overlapPct >= 10) {
                    trend = 'emerging';
                    suggestion = `Growing intersection — good timing to publish! Combine ${selectedTags.join('+')} with ${tag} for a distinctive contribution.`;
                } else {
                    trend = 'rare';
                    suggestion = `Very few papers explore this combination. High novelty potential but needs strong motivation.`;
                }

                return { tag, overlap: v.overlap, total: v.total, overlapPct, trend, suggestion };
            })
            .sort((a, b) => {
                // Prioritize "emerging" intersections
                const trendOrder = { emerging: 0, rare: 1, established: 2 };
                if (trendOrder[a.trend] !== trendOrder[b.trend]) return trendOrder[a.trend] - trendOrder[b.trend];
                return b.overlap - a.overlap;
            })
            .slice(0, 6);

        // ========== 4. Concrete paper topic suggestions ==========
        const suggestions: TopicSuggestion[] = [];

        // Find hot sub-topics + underexplored methods → suggest combinations
        const hotSubTopics = subTopics.filter(st => st.isHot && !st.name.startsWith('⚙️'));
        const gapMethods = methodGaps.filter(g => g.gap > 10);
        const emergingCross = crossOpportunities.filter(c => c.trend === 'emerging');

        // Suggestion 1: Hot sub-topic + gap method
        if (hotSubTopics.length > 0 && gapMethods.length > 0) {
            const hot = hotSubTopics[0];
            const gap = gapMethods[0];
            suggestions.push({
                title: `Apply ${gap.method} to ${hot.name} in ${selectedTags[0]}`,
                confidence: 'high',
                reasoning: `"${hot.name}" is growing rapidly (+${hot.growth}% YoY) and "${gap.method}" is underexplored in this area (${gap.tagUsage}% vs ${gap.globalUsage}% globally). This combination offers both novelty and timeliness.`,
                relatedMethods: [gap.method, ...(hotSubTopics[1] ? [hot.name] : [])],
                targetVenues: findBestVenues(tagPapers, hot.name),
            });
        }

        // Suggestion 2: Emerging cross-topic opportunity
        if (emergingCross.length > 0) {
            const cross = emergingCross[0];
            suggestions.push({
                title: `${selectedTags[0]} × ${cross.tag}: Interdisciplinary Study`,
                confidence: 'high',
                reasoning: `Only ${cross.overlapPct}% overlap between ${selectedTags[0]} and ${cross.tag} — a growing intersection with novelty potential. ${cross.overlap} existing papers show feasibility without saturation.`,
                relatedMethods: getMostCommonMethods(tagPapers, cross.tag, allPapers),
                targetVenues: findBestVenues(allPapers, cross.tag),
            });
        }

        // Suggestion 3: Survey / Benchmark opportunity
        if (tagPapers.length > 20) {
            suggestions.push({
                title: `Systematic Survey of ${selectedTags[0]} Research (2023-2026)`,
                confidence: 'medium',
                reasoning: `With ${tagPapers.length} papers in the corpus, the field is mature enough for a comprehensive survey. Surveys in fast-growing areas are highly cited — the top paper in this space has ${Math.max(...tagPapers.map(p => p.citations)).toLocaleString()} citations.`,
                relatedMethods: ['benchmark', 'evaluation framework'],
                targetVenues: ['NeurIPS Datasets & Benchmarks', 'ICLR', 'CVPR'],
            });
        }

        // Suggestion 4: Underexplored method angle
        if (gapMethods.length >= 2) {
            const g1 = gapMethods[0];
            const g2 = gapMethods[1];
            suggestions.push({
                title: `Novel ${g1.method} + ${g2.method} Framework for ${selectedTags[0]}`,
                confidence: 'medium',
                reasoning: `Both "${g1.method}" (${g1.tagUsage}% local vs ${g1.globalUsage}% global) and "${g2.method}" (${g2.tagUsage}% local vs ${g2.globalUsage}% global) are underrepresented in ${selectedTags[0]} research. A unified framework combining both could fill this gap.`,
                relatedMethods: [g1.method, g2.method],
                targetVenues: findBestVenues(tagPapers),
            });
        }

        // Suggestion 5: Rare cross-topic
        const rareCross = crossOpportunities.filter(c => c.trend === 'rare');
        if (rareCross.length > 0 && hotSubTopics.length > 0) {
            const rare = rareCross[0];
            suggestions.push({
                title: `Exploring ${selectedTags[0]} through the Lens of ${rare.tag}`,
                confidence: 'medium',
                reasoning: `Only ${rare.overlap} papers combine these two areas. High novelty but requires strong motivation. Leverage the hot sub-topic "${hotSubTopics[0].name}" to anchor the contribution.`,
                relatedMethods: getMostCommonMethods(tagPapers, rare.tag, allPapers),
                targetVenues: findBestVenues(allPapers, rare.tag),
            });
        }

        // ========== 5. Venue strategy ==========
        const venueStats = new Map<string, { count: number; avgCitations: number }>();
        tagPapers.forEach(p => {
            if (!venueStats.has(p.venue)) venueStats.set(p.venue, { count: 0, avgCitations: 0 });
            const vs = venueStats.get(p.venue)!;
            vs.count++;
            vs.avgCitations = Math.round((vs.avgCitations * (vs.count - 1) + p.citations) / vs.count);
        });
        const topVenueStrategy = [...venueStats.entries()]
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([venue, stats]) => ({
                venue,
                count: stats.count,
                avgCitations: stats.avgCitations,
                strength: isTopVenue(venue) ? 'top-tier' : stats.count >= 5 ? 'active' : 'moderate',
            }));

        return { subTopics, methodGaps, crossOpportunities, suggestions, topVenueStrategy, tagPaperCount: tagPapers.length };
    }, [papers, allPapers, selectedTags]);

    if (selectedTags.length === 0) return null;
    if (loading) {
        return (
            <div className="card animate-pulse">
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3 mb-4"></div>
                <div className="h-60 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
        );
    }
    if (!analysis) return null;

    const confidenceColors = {
        high: 'from-emerald-500 to-teal-600',
        medium: 'from-amber-500 to-orange-600',
    };
    const confidenceBg = {
        high: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50',
        medium: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50',
    };

    const trendBadge = {
        emerging: { icon: '🌱', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
        established: { icon: '🏛️', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
        rare: { icon: '💎', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    };

    return (
        <div className="card space-y-8">
            {/* Header */}
            <div>
                <h3 className="text-lg font-semibold gradient-text">
                    🧭 Research Advisor: {selectedTags.map(t => `"${t}"`).join(' + ')}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Fine-grained analysis & actionable suggestions based on {analysis.tagPaperCount} papers
                </p>
            </div>

            {/* Section 1: Sub-topic Landscape */}
            <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    <span className="w-1 h-4 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500"></span>
                    Sub-topic Landscape
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Research angles within {selectedTags.join(' + ')}, ranked by growth momentum
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {analysis.subTopics.map(st => (
                        <div
                            key={st.name}
                            className={`relative rounded-lg p-3 border transition-all hover:shadow-md ${st.isHot
                                ? 'bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/15 dark:to-red-900/10 border-orange-200 dark:border-orange-800/40'
                                : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/50'
                                }`}
                        >
                            {st.isHot && <span className="absolute -top-1.5 -right-1.5 text-sm">🔥</span>}
                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{st.name}</div>
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                                <span>{st.count} papers</span>
                                <span className={st.growth > 0 ? 'text-emerald-500 font-bold' : st.growth < 0 ? 'text-red-400' : ''}>
                                    {st.growth > 0 ? '↑' : st.growth < 0 ? '↓' : '→'}{Math.abs(st.growth)}%
                                </span>
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                avg ⭐ {st.avgCitations}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Section 2: Method Gaps */}
            <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    <span className="w-1 h-4 rounded-full bg-gradient-to-b from-emerald-500 to-cyan-500"></span>
                    Methodological Gaps
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Methods that are popular globally but underused in {selectedTags.join(' + ')} — prime opportunities
                </p>
                <div className="space-y-3">
                    {analysis.methodGaps.map(g => (
                        <div key={g.method} className="rounded-lg p-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{g.method}</span>
                                <span className={`text-xs font-bold ${g.gap > 10 ? 'text-emerald-500' : g.gap < -5 ? 'text-red-400' : 'text-slate-400'}`}>
                                    {g.gap > 0 ? '+' : ''}{g.gap}% gap
                                </span>
                            </div>
                            {/* Dual bar comparison */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] w-14 text-slate-400">Global</span>
                                    <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                        <div className="h-full rounded-full bg-blue-400 dark:bg-blue-500" style={{ width: `${g.globalUsage}%` }} />
                                    </div>
                                    <span className="text-[10px] w-8 text-right text-slate-400">{g.globalUsage}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] w-14 text-slate-400">This tag</span>
                                    <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                        <div className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400" style={{ width: `${g.tagUsage}%` }} />
                                    </div>
                                    <span className="text-[10px] w-8 text-right text-slate-400">{g.tagUsage}%</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{g.opportunity}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Section 3: Cross-topic Opportunities */}
            <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    <span className="w-1 h-4 rounded-full bg-gradient-to-b from-amber-500 to-orange-500"></span>
                    Cross-topic Opportunities
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Intersections with other research areas — 🌱 emerging ones offer the best novelty vs. feasibility
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {analysis.crossOpportunities.map(c => {
                        const badge = trendBadge[c.trend];
                        return (
                            <div key={c.tag} className="rounded-lg p-3 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 space-y-2 hover:border-indigo-500/30 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{c.tag}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${badge.bg} ${badge.color}`}>
                                            {badge.icon} {c.trend}
                                        </span>
                                    </div>
                                    <span className="text-xs text-slate-400">{c.overlap}/{c.total} overlap</span>
                                </div>
                                {/* Overlap visualization */}
                                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${c.trend === 'emerging' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                                            c.trend === 'rare' ? 'bg-gradient-to-r from-purple-500 to-pink-400' :
                                                'bg-gradient-to-r from-blue-500 to-cyan-400'
                                            }`}
                                        style={{ width: `${Math.max(c.overlapPct, 3)}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{c.suggestion}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Section 4: Concrete Paper Topic Suggestions */}
            <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    <span className="w-1 h-4 rounded-full bg-gradient-to-b from-pink-500 to-rose-500"></span>
                    💡 Concrete Paper Ideas
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Actionable research topics with high acceptance potential, generated from gap analysis
                </p>
                <div className="space-y-4">
                    {analysis.suggestions.map((s, i) => (
                        <div key={i} className={`rounded-xl p-4 border ${confidenceBg[s.confidence]} space-y-3`}>
                            <div className="flex items-start justify-between gap-3">
                                <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">
                                    {s.title}
                                </h5>
                                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${confidenceColors[s.confidence]}`}>
                                    {s.confidence === 'high' ? '✨ High' : '⚡ Medium'} Confidence
                                </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                {s.reasoning}
                            </p>
                            <div className="flex flex-wrap gap-4 text-[10px]">
                                <div>
                                    <span className="text-slate-400 dark:text-slate-500">Methods: </span>
                                    {s.relatedMethods.map(m => (
                                        <span key={m} className="inline-block ml-1 px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 font-medium">
                                            {m}
                                        </span>
                                    ))}
                                </div>
                                <div>
                                    <span className="text-slate-400 dark:text-slate-500">Target Venues: </span>
                                    {s.targetVenues.map(v => (
                                        <span key={v} className="inline-block ml-1 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-medium">
                                            {v}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Section 5: Venue Strategy */}
            <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    <span className="w-1 h-4 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500"></span>
                    🏛️ Venue Strategy
                </h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="text-left px-3 py-2 text-slate-500 dark:text-slate-400 font-medium">Venue</th>
                                <th className="text-center px-3 py-2 text-slate-500 dark:text-slate-400 font-medium">Papers</th>
                                <th className="text-center px-3 py-2 text-slate-500 dark:text-slate-400 font-medium">Avg Citations</th>
                                <th className="text-center px-3 py-2 text-slate-500 dark:text-slate-400 font-medium">Activity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analysis.topVenueStrategy.map(v => (
                                <tr key={v.venue} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                    <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300 font-medium max-w-[200px] truncate">{v.venue}</td>
                                    <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-400">{v.count}</td>
                                    <td className="px-3 py-2.5 text-center text-amber-500 font-semibold">{v.avgCitations}</td>
                                    <td className="px-3 py-2.5 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${v.strength === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                                            v.strength === 'moderate' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                                                'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                            }`}>
                                            {v.strength === 'top-tier' ? '🏆 Top Tier' : v.strength}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Disclaimer */}
            <div className="text-[10px] text-slate-400 dark:text-slate-600 text-center italic pt-2 border-t border-slate-200 dark:border-slate-700/50">
                💡 Suggestions are algorithmically generated from publication trends. Use as starting points for your own research exploration.
            </div>
        </div>
    );
}

// ---- Helper functions ----

function findBestVenues(papers: Paper[], filterTag?: string): string[] {
    const venueMap = new Map<string, number>();
    const filtered = filterTag
        ? papers.filter(p => p.tags.includes(filterTag) || p.methods.includes(filterTag))
        : papers;

    filtered.forEach(p => venueMap.set(p.venue, (venueMap.get(p.venue) || 0) + 1));

    return [...venueMap.entries()]
        .filter(([v]) => isTopVenue(v)) // Prioritize top venues
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([v]) => v);
}

function getMostCommonMethods(tagPapers: Paper[], otherTag: string, allPapers: Paper[]): string[] {
    const methodMap = new Map<string, number>();
    const relevantPapers = allPapers.filter(p => p.tags.includes(otherTag));
    relevantPapers.forEach(p => p.methods.forEach(m => methodMap.set(m, (methodMap.get(m) || 0) + 1)));
    return [...methodMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([m]) => m);
}
