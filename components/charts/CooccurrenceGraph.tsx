'use client';

import React, { useMemo, useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from 'next-themes';
import type { CooccurrenceNode, CooccurrenceLink, CooccurrenceType } from '@/types';

interface CooccurrenceGraphProps {
    nodes: CooccurrenceNode[];
    links: CooccurrenceLink[];
    type: CooccurrenceType;
    loading?: boolean;
    onTypeChange: (type: CooccurrenceType) => void;
}

export default function CooccurrenceGraph({
    nodes,
    links,
    type,
    loading = false,
    onTypeChange,
}: CooccurrenceGraphProps) {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const option = useMemo(() => {
        const isDark = theme === 'dark';
        const textColor = isDark ? '#94a3b8' : '#64748b';
        const linkColor = isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(100, 116, 139, 0.15)';
        const accentColor = isDark ? '#6366f1' : '#4f46e5';

        const maxNodeValue = Math.max(...nodes.map((n) => n.value), 1);

        return {
            backgroundColor: 'transparent',
            tooltip: {
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(226, 232, 240, 0.8)',
                textStyle: { color: isDark ? '#e2e8f0' : '#0f172a' },
                formatter: (params: any) => {
                    if (params.dataType === 'node') {
                        return `<b>${params.data.name}</b><br/>Frequency: ${params.data.value}`;
                    }
                    if (params.dataType === 'edge') {
                        return `${params.data.source} ↔ ${params.data.target}<br/>Co-occurrences: ${params.data.value}`;
                    }
                    return '';
                },
            },
            series: [
                {
                    type: 'graph',
                    layout: 'force',
                    roam: true,
                    draggable: true,
                    data: nodes.map((n) => ({
                        id: n.id,
                        name: n.name,
                        symbolSize: 15 + (n.value / maxNodeValue) * 35,
                        value: n.value,
                        label: {
                            show: n.value > maxNodeValue * 0.2,
                            color: isDark ? '#e2e8f0' : '#334155',
                            fontSize: 10,
                            position: 'right'
                        },
                        itemStyle: {
                            color: accentColor,
                            borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                            borderWidth: 1,
                            shadowBlur: 8,
                            shadowColor: accentColor + '44',
                        },
                    })),
                    links: links.map((l) => ({
                        source: l.source,
                        target: l.target,
                        value: l.value,
                        lineStyle: {
                            width: 1 + Math.sqrt(l.value),
                            color: linkColor,
                            curveness: 0.3,
                        },
                    })),
                    force: {
                        repulsion: 150,
                        edgeLength: 80,
                        gravity: 0.1,
                    },
                    emphasis: {
                        focus: 'adjacency',
                        lineStyle: { width: 4 },
                    },
                    animationDuration: 1000,
                },
            ],
        };
    }, [nodes, links, theme]);

    if (!mounted) return <div className="card h-[450px]" />;

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold gradient-text">
                    🕸️ Co-occurrence Network
                </h3>
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg p-1">
                    <button
                        onClick={() => onTypeChange('tags')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${type === 'tags'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                    >
                        Tags
                    </button>
                    <button
                        onClick={() => onTypeChange('methods')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${type === 'methods'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                    >
                        Methods
                    </button>
                </div>
            </div>
            {loading ? (
                <div className="h-[400px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
            ) : (
                <ReactECharts
                    option={option}
                    style={{ height: '400px' }}
                    notMerge
                    lazyUpdate
                />
            )}
        </div>
    );
}
