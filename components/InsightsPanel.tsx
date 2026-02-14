'use client';

import type { Insight } from '@/types';

interface InsightsPanelProps {
    insights: Insight[];
    loading?: boolean;
}

export default function InsightsPanel({ insights, loading = false }: InsightsPanelProps) {
    if (loading) {
        return (
            <div className="card">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">💡 Trend Insights</h3>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 bg-slate-800/50 rounded-lg animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (insights.length === 0) return null;

    return (
        <div className="card">
            <h3 className="text-lg font-semibold gradient-text mb-4">💡 Trend Insights</h3>
            <div className="space-y-3">
                {insights.map((insight, i) => (
                    <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 hover:border-indigo-500/30 transition-colors"
                    >
                        <span className="text-xl flex-shrink-0 mt-0.5">{insight.icon}</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{insight.text}</p>
                        </div>
                        {insight.value && (
                            <span className="flex-shrink-0 px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-md text-xs font-semibold">
                                {insight.value}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
