'use client';

import React, { useMemo, useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from 'next-themes';
import type { TrendDataPoint, Metric } from '@/types';

interface TrendLineChartProps {
    data: TrendDataPoint[];
    metric: Metric;
    loading?: boolean;
    onMetricChange: (metric: Metric) => void;
}

export default function TrendLineChart({
    data,
    metric,
    loading = false,
    onMetricChange,
}: TrendLineChartProps) {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const option = useMemo(() => {
        const isDark = theme === 'dark';
        const textColor = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)';
        const accentColor = isDark ? '#818cf8' : '#6366f1';

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(226, 232, 240, 0.8)',
                textStyle: { color: isDark ? '#e2e8f0' : '#0f172a' },
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '10%',
                top: '15%',
                containLabel: true,
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: data.map((d) => d.period),
                axisLabel: {
                    color: textColor,
                    fontSize: 11,
                    rotate: data.length > 20 ? 45 : 0
                },
                axisLine: { lineStyle: { color: gridColor } },
            },
            yAxis: {
                type: 'value',
                name: metric === 'citations' ? 'Citations' : 'Paper Count',
                nameTextStyle: { color: textColor, fontSize: 12, padding: [0, 0, 0, 40] },
                axisLabel: { color: textColor, fontSize: 11 },
                axisLine: { lineStyle: { color: gridColor } },
                splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
            },
            series: [
                {
                    name: metric === 'citations' ? 'Total Citations' : 'Papers Published',
                    type: 'line',
                    data: data.map((d) => d.value),
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 6,
                    lineStyle: {
                        width: 3,
                        color: accentColor,
                    },
                    itemStyle: {
                        color: accentColor,
                        borderColor: '#fff',
                        borderWidth: 2,
                    },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.15)' },
                                { offset: 1, color: isDark ? 'rgba(99, 102, 241, 0.02)' : 'rgba(99, 102, 241, 0.01)' },
                            ],
                        },
                    },
                },
            ],
            animationDuration: 800,
        };
    }, [data, metric, theme]);

    if (!mounted) return <div className="card h-[400px]" />;

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold gradient-text">
                    📈 Publication Trends
                </h3>
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg p-1">
                    <button
                        onClick={() => onMetricChange('count')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${metric === 'count'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                    >
                        Count
                    </button>
                    <button
                        onClick={() => onMetricChange('citations')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${metric === 'citations'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                    >
                        Citations
                    </button>
                </div>
            </div>
            {loading ? (
                <div className="h-[350px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
            ) : (
                <ReactECharts
                    option={option}
                    style={{ height: '350px' }}
                    notMerge
                    lazyUpdate
                />
            )}
        </div>
    );
}
