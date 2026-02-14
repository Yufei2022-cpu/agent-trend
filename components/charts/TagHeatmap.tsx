'use client';

import React, { useMemo, useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from 'next-themes';
import type { TagTimeSeriesPoint } from '@/types';

interface TagHeatmapProps {
    data: TagTimeSeriesPoint[];
    loading?: boolean;
    onCellClick?: (tag: string, period: string) => void;
}

export default function TagHeatmap({
    data,
    loading = false,
    onCellClick,
}: TagHeatmapProps) {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const option = useMemo(() => {
        if (data.length === 0) return {};

        const isDark = theme === 'dark';
        const textColor = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.8)';

        const periods = [...new Set(data.map((d) => d.period))].sort();
        const tags = [...new Set(data.map((d) => d.tag))];

        const tagCounts = new Map<string, number>();
        data.forEach((d) => {
            tagCounts.set(d.tag, (tagCounts.get(d.tag) || 0) + d.count);
        });
        const topTags = tags
            .sort((a, b) => (tagCounts.get(b) || 0) - (tagCounts.get(a) || 0))
            .slice(0, 12);

        const heatmapData = data
            .filter((d) => topTags.includes(d.tag))
            .map((d) => [
                periods.indexOf(d.period),
                topTags.indexOf(d.tag),
                d.count,
            ]);

        const maxValue = Math.max(...heatmapData.map((d) => d[2] as number), 1);

        return {
            backgroundColor: 'transparent',
            tooltip: {
                position: 'top',
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(226, 232, 240, 0.8)',
                textStyle: { color: isDark ? '#e2e8f0' : '#0f172a' },
                formatter: (params: any) => {
                    const [pi, ti, val] = params.value;
                    return `<b>${topTags[ti]}</b><br/>${periods[pi]}: ${val} papers`;
                },
            },
            grid: {
                left: '12%',
                right: '10%',
                bottom: '18%',
                top: '5%',
                containLabel: true,
            },
            xAxis: {
                type: 'category',
                data: periods,
                axisLabel: {
                    color: textColor,
                    fontSize: 10,
                    rotate: 45,
                    interval: Math.max(0, Math.floor(periods.length / 15)),
                },
                axisLine: { lineStyle: { color: gridColor } },
            },
            yAxis: {
                type: 'category',
                data: topTags,
                axisLabel: {
                    color: isDark ? '#e2e8f0' : '#334155',
                    fontSize: 10,
                    fontWeight: 500,
                },
                axisLine: { lineStyle: { color: gridColor } },
            },
            visualMap: {
                min: 0,
                max: maxValue,
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: '0%',
                textStyle: { color: textColor, fontSize: 10 },
                inRange: {
                    color: isDark
                        ? ['#1e1b4b', '#312e81', '#4338ca', '#6366f1', '#818cf8', '#a5b4fc']
                        : ['#e0e7ff', '#c7d2fe', '#818cf8', '#6366f1', '#4f46e5', '#3730a3'],
                },
            },
            series: [
                {
                    type: 'heatmap',
                    data: heatmapData,
                    label: { show: false },
                    itemStyle: {
                        borderColor: isDark ? '#0f172a' : '#ffffff',
                        borderWidth: 2,
                        borderRadius: 3,
                    },
                },
            ],
            animationDuration: 500,
        };
    }, [data, theme]);

    if (!mounted) return <div className="card h-[450px]" />;

    const onEvents = onCellClick
        ? {
            click: (params: any) => {
                const [pi, ti] = params.value;
                const periods = [...new Set(data.map((d) => d.period))].sort();
                const tags = [...new Set(data.map((d) => d.tag))];
                const tagCounts = new Map<string, number>();
                data.forEach((d) => {
                    tagCounts.set(d.tag, (tagCounts.get(d.tag) || 0) + d.count);
                });
                const topTags = tags
                    .sort((a, b) => (tagCounts.get(b) || 0) - (tagCounts.get(a) || 0))
                    .slice(0, 12);
                onCellClick(topTags[ti], periods[pi]);
            },
        }
        : undefined;

    return (
        <div className="card">
            <h3 className="text-lg font-semibold gradient-text mb-4">
                🔥 Tag Heatmap (Topic × Time)
            </h3>
            {loading ? (
                <div className="h-[400px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
            ) : (
                <ReactECharts
                    option={option}
                    style={{ height: '400px' }}
                    onEvents={onEvents}
                    notMerge
                    lazyUpdate
                />
            )}
        </div>
    );
}
