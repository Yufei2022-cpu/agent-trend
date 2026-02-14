'use client';

import React, { useMemo, useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from 'next-themes';
import type { TagDistribution } from '@/types';

interface TopTagsBarChartProps {
    data: TagDistribution[];
    loading?: boolean;
    onTagClick: (tag: string) => void;
}

const TAG_COLORS = [
    '#6366f1', '#8b5cf6', '#a78bfa', '#c084fc',
    '#818cf8', '#7c3aed', '#6d28d9', '#5b21b6',
    '#4f46e5', '#4338ca', '#3730a3', '#312e81',
    '#a5b4fc', '#c4b5fd', '#ddd6fe',
];

export default function TopTagsBarChart({
    data,
    loading = false,
    onTagClick,
}: TopTagsBarChartProps) {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const option = useMemo(() => {
        const isDark = theme === 'dark';
        const textColor = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)';

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(226, 232, 240, 0.8)',
                textStyle: { color: isDark ? '#e2e8f0' : '#0f172a' },
            },
            grid: {
                left: '3%',
                right: '8%',
                bottom: '3%',
                top: '8%',
                containLabel: true,
            },
            xAxis: {
                type: 'value',
                axisLabel: { color: textColor, fontSize: 11 },
                axisLine: { lineStyle: { color: gridColor } },
                splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
            },
            yAxis: {
                type: 'category',
                data: data.slice(0, 10).map((d) => d.tag).reverse(),
                axisLabel: {
                    color: isDark ? '#e2e8f0' : '#334155',
                    fontSize: 11,
                    fontWeight: 500,
                },
                axisLine: { lineStyle: { color: gridColor } },
            },
            series: [
                {
                    type: 'bar',
                    data: data.slice(0, 10)
                        .map((d, i) => ({
                            value: d.count,
                            itemStyle: {
                                color: {
                                    type: 'linear',
                                    x: 0, y: 0, x2: 1, y2: 0,
                                    colorStops: [
                                        { offset: 0, color: TAG_COLORS[i % TAG_COLORS.length] },
                                        { offset: 1, color: TAG_COLORS[i % TAG_COLORS.length] + '99' },
                                    ],
                                },
                                borderRadius: [0, 4, 4, 0],
                            },
                        }))
                        .reverse(),
                    barWidth: '60%',
                    label: {
                        show: true,
                        position: 'right',
                        color: textColor,
                        fontSize: 10,
                        fontWeight: 'bold',
                    },
                },
            ],
            animationDuration: 600,
        };
    }, [data, theme]);

    if (!mounted) return <div className="card h-[400px]" />;

    const onEvents = {
        click: (params: { name: string }) => {
            onTagClick(params.name);
        },
    };

    return (
        <div className="card">
            <h3 className="text-lg font-semibold gradient-text mb-4">
                🏷️ Top Research Tags
            </h3>
            {loading ? (
                <div className="h-[350px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
            ) : (
                <ReactECharts
                    option={option}
                    style={{ height: '350px' }}
                    onEvents={onEvents}
                    notMerge
                    lazyUpdate
                />
            )}
        </div>
    );
}
